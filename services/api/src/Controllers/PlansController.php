<?php

declare(strict_types=1);

namespace Api\Controllers;

use Api\Db\Query;
use Api\Http\Request;
use Api\Http\Response;
use Api\Utils\Date;

final class PlansController
{
    public function today(Request $request): void
    {
        $today = Date::todayInTimezone('Europe/Riga');

        $plan = Query::fetchOne(
            'SELECT id, date, testament, book, chapter, created_at FROM reading_plan WHERE date = :date LIMIT 1',
            ['date' => $today],
        );

        Response::success([
            'plan' => $plan,
        ]);
    }

    public function range(Request $request): void
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

        $plans = Query::fetchAll(
            'SELECT id, date, testament, book, chapter, created_at
             FROM reading_plan
             WHERE date BETWEEN :from AND :to
             ORDER BY date ASC',
            [
                'from' => $from,
                'to' => $to,
            ],
        );

        Response::success([
            'plans' => $plans,
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
}
