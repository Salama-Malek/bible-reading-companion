<?php

declare(strict_types=1);

namespace Api\Controllers;

use Api\Db\Query;
use Api\Http\Request;
use Api\Http\Response;
use Api\Reading\StreakCalculator;

final class ReadingController
{
    public function __construct(private readonly StreakCalculator $streakCalculator = new StreakCalculator())
    {
    }

    public function complete(Request $request): void
    {
        $payload = $request->json();
        $date = trim((string) ($payload['date'] ?? ''));
        $method = trim((string) ($payload['method'] ?? ''));

        $issues = [];

        if (!$this->isValidDate($date)) {
            $issues[] = ['field' => 'date', 'issue' => 'Must be a valid date in YYYY-MM-DD format'];
        }

        if (!in_array($method, ['physical', 'digital'], true)) {
            $issues[] = ['field' => 'method', 'issue' => 'Must be one of: physical, digital'];
        }

        if ($issues !== []) {
            Response::error('VALIDATION_ERROR', 'Request validation failed.', $issues, 400);
            return;
        }

        $user = $request->attribute('authUser');
        $userId = is_array($user) ? (int) ($user['id'] ?? 0) : 0;

        if ($userId <= 0) {
            Response::error('UNAUTHORIZED', 'Authentication required.', null, 401);
            return;
        }

        $plan = Query::fetchOne(
            'SELECT id, `date`, testament, book, chapter, created_at
             FROM reading_plan
             WHERE `date` = :date
             LIMIT 1',
            ['date' => $date],
        );

        if ($plan === null) {
            Response::error('PLAN_NOT_FOUND', 'Reading plan not found for the provided date.', null, 404);
            return;
        }

        $planId = (int) $plan['id'];

        try {
            Query::exec(
                'INSERT INTO reading_records (user_id, plan_id, method)
                 VALUES (:user_id, :plan_id, :method)',
                [
                    'user_id' => $userId,
                    'plan_id' => $planId,
                    'method' => $method,
                ],
            );
        } catch (\PDOException $error) {
            if (!$this->isDuplicateError($error)) {
                throw $error;
            }
        }

        $record = Query::fetchOne(
            'SELECT id, user_id, plan_id, method, completed_at
             FROM reading_records
             WHERE user_id = :user_id AND plan_id = :plan_id
             LIMIT 1',
            [
                'user_id' => $userId,
                'plan_id' => $planId,
            ],
        );

        if ($record === null) {
            Response::error('INTERNAL_ERROR', 'Unable to load reading record.', null, 500);
            return;
        }

        Response::success([
            'record' => $record,
        ]);
    }

    public function history(Request $request): void
    {
        $from = trim((string) ($request->query['from'] ?? ''));
        $to = trim((string) ($request->query['to'] ?? ''));

        $issues = [];

        if (!$this->isValidDate($from)) {
            $issues[] = ['field' => 'from', 'issue' => 'Must be a valid date in YYYY-MM-DD format'];
        }

        if (!$this->isValidDate($to)) {
            $issues[] = ['field' => 'to', 'issue' => 'Must be a valid date in YYYY-MM-DD format'];
        }

        if ($this->isValidDate($from) && $this->isValidDate($to) && $from > $to) {
            $issues[] = ['field' => 'to', 'issue' => 'Must be greater than or equal to from'];
        }

        if ($issues !== []) {
            Response::error('VALIDATION_ERROR', 'Request validation failed.', $issues, 400);
            return;
        }

        $user = $request->attribute('authUser');
        $userId = is_array($user) ? (int) ($user['id'] ?? 0) : 0;

        if ($userId <= 0) {
            Response::error('UNAUTHORIZED', 'Authentication required.', null, 401);
            return;
        }

        $plans = Query::fetchAll(
            'SELECT id, `date`, testament, book, chapter, created_at
             FROM reading_plan
             WHERE `date` BETWEEN :from AND :to
             ORDER BY `date` ASC',
            [
                'from' => $from,
                'to' => $to,
            ],
        );

        $records = Query::fetchAll(
            'SELECT rr.id, rr.user_id, rr.plan_id, rr.method, rr.completed_at, rp.`date`
             FROM reading_records rr
             INNER JOIN reading_plan rp ON rp.id = rr.plan_id
             WHERE rr.user_id = :user_id AND rp.`date` BETWEEN :from AND :to
             ORDER BY rp.`date` ASC, rr.id ASC',
            [
                'user_id' => $userId,
                'from' => $from,
                'to' => $to,
            ],
        );

        $completedByDate = [];
        foreach ($records as $record) {
            $recordDate = (string) ($record['date'] ?? '');
            if ($recordDate !== '') {
                $completedByDate[$recordDate] = true;
            }
        }

        $orderedDates = [];
        $missedDates = [];

        foreach ($plans as $plan) {
            $planDate = (string) ($plan['date'] ?? '');

            if ($planDate === '') {
                continue;
            }

            $orderedDates[] = $planDate;

            if (($completedByDate[$planDate] ?? false) !== true) {
                $missedDates[] = $planDate;
            }
        }

        $streaks = $this->streakCalculator->calculate($orderedDates, $completedByDate);

        Response::success([
            'plans' => $plans,
            'records' => $records,
            'missedDates' => $missedDates,
            'summary' => [
                'completedCount' => count($completedByDate),
                'missedCount' => count($missedDates),
                'currentStreak' => $streaks['currentStreak'],
                'longestStreak' => $streaks['longestStreak'],
            ],
        ]);
    }

    private function isValidDate(string $value): bool
    {
        if ($value === '') {
            return false;
        }

        $date = \DateTimeImmutable::createFromFormat('Y-m-d', $value);

        return $date !== false && $date->format('Y-m-d') === $value;
    }

    private function isDuplicateError(\PDOException $error): bool
    {
        $sqlState = $error->errorInfo[0] ?? null;
        $driverCode = $error->errorInfo[1] ?? null;

        if ($sqlState === '23000' || $driverCode === 1062) {
            return true;
        }

        return str_contains(strtolower($error->getMessage()), 'duplicate');
    }
}
