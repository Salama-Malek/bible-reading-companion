<?php

declare(strict_types=1);

namespace Api\Controllers;

use Api\Config;
use Api\Db\Query;
use Api\Http\Request;
use Api\Http\Response;
use Api\Notifications\LogNotificationProvider;
use Api\Notifications\NotificationProvider;
use Api\Utils\Date;

final class AdminNotificationsController
{
    public function __construct(
        private readonly ?NotificationProvider $provider = null,
    ) {
    }

    public function sendToday(Request $request): void
    {
        $expectedSecret = trim((string) Config::get('CRON_SECRET', ''));
        $providedSecret = trim((string) ($request->header('X-CRON-SECRET') ?? ''));

        if ($expectedSecret === '' || $providedSecret === '' || !hash_equals($expectedSecret, $providedSecret)) {
            Response::error('UNAUTHORIZED', 'Invalid cron secret.', null, 401);
            return;
        }

        $today = Date::todayInTimezone('Europe/Riga');

        $plan = Query::fetchOne(
            'SELECT id, date, testament, book, chapter FROM reading_plan WHERE date = :date LIMIT 1',
            ['date' => $today],
        );

        if ($plan === null) {
            $details = [
                'reason' => 'NO_PLAN_FOR_TODAY',
            ];

            $this->insertRunLog($today, 0, $details);

            Response::success([
                'sentCount' => 0,
                'userCount' => 0,
                'tokenCount' => 0,
                'reason' => 'No reading plan for today.',
                'date' => $today,
            ]);
            return;
        }

        $usersToNotify = Query::fetchAll(
            'SELECT ud.user_id, GROUP_CONCAT(ud.push_token) AS tokens, COUNT(*) AS token_count
             FROM user_devices ud
             LEFT JOIN reading_records rr
               ON rr.user_id = ud.user_id
              AND rr.plan_id = :plan_id
             WHERE rr.id IS NULL
             GROUP BY ud.user_id',
            ['plan_id' => (int) $plan['id']],
        );

        $provider = $this->provider ?? new LogNotificationProvider(dirname(__DIR__, 2) . '/storage/logs/notifications.log');
        $title = 'Today\'s reading is ready';
        $body = sprintf('%s %s — chapter %d', $plan['testament'], $plan['book'], (int) $plan['chapter']);

        $sentCount = 0;
        $userCount = 0;
        $tokenCount = 0;

        foreach ($usersToNotify as $row) {
            $tokensRaw = (string) ($row['tokens'] ?? '');
            $tokens = $tokensRaw === '' ? [] : array_values(array_filter(explode(',', $tokensRaw)));

            if ($tokens === []) {
                continue;
            }

            $tokenCount += count($tokens);
            $userCount++;

            $sentCount += $provider->send(
                $tokens,
                $title,
                $body,
                [
                    'planId' => (int) $plan['id'],
                    'date' => $today,
                    'userId' => (int) $row['user_id'],
                ],
            );
        }

        $details = [
            'planId' => (int) $plan['id'],
            'userCount' => $userCount,
            'tokenCount' => $tokenCount,
            'mode' => 'log',
        ];

        $this->insertRunLog($today, $sentCount, $details);

        Response::success([
            'date' => $today,
            'planId' => (int) $plan['id'],
            'sentCount' => $sentCount,
            'userCount' => $userCount,
            'tokenCount' => $tokenCount,
            'mode' => 'log',
        ]);
    }

    /**
     * @param array<string, mixed> $details
     */
    private function insertRunLog(string $runDate, int $sentCount, array $details): void
    {
        Query::exec(
            'INSERT INTO notifications_log (run_date, sent_count, details)
             VALUES (:run_date, :sent_count, :details)',
            [
                'run_date' => $runDate,
                'sent_count' => $sentCount,
                'details' => json_encode($details, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            ],
        );
    }
}
