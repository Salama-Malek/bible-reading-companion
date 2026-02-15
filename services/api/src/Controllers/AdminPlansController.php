<?php

declare(strict_types=1);

namespace Api\Controllers;

use Api\Db\Query;
use Api\Http\Request;
use Api\Http\Response;

final class AdminPlansController
{
    public function create(Request $request): void
    {
        $payload = $request->json();
        $validated = $this->validatePlanPayload($payload);

        if ($validated['issues'] !== []) {
            Response::error('VALIDATION_ERROR', 'Request validation failed.', $validated['issues'], 400);
            return;
        }

        try {
            Query::exec(
                'INSERT INTO reading_plan (`date`, testament, book, chapter) VALUES (:date, :testament, :book, :chapter)',
                [
                    'date' => $validated['data']['date'],
                    'testament' => $validated['data']['testament'],
                    'book' => $validated['data']['book'],
                    'chapter' => $validated['data']['chapter'],
                ],
            );
        } catch (\PDOException $error) {
            if ($this->isDuplicateError($error)) {
                Response::error('DUPLICATE_DATE', 'A reading plan for this date already exists.', null, 409);
                return;
            }

            throw $error;
        }

        Response::success(['created' => true], 201);
    }

    public function list(Request $request): void
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
            ['from' => $from, 'to' => $to],
        );

        Response::success(['plans' => $plans]);
    }

    public function update(Request $request): void
    {
        $id = $this->routeId($request);

        if ($id === null) {
            Response::error('VALIDATION_ERROR', 'Request validation failed.', [['field' => 'id', 'issue' => 'Must be a positive integer']], 400);
            return;
        }

        $existing = Query::fetchOne('SELECT id FROM reading_plan WHERE id = :id LIMIT 1', ['id' => $id]);

        if ($existing === null) {
            Response::error('NOT_FOUND', 'Reading plan not found.', null, 404);
            return;
        }

        $payload = $request->json();
        $validated = $this->validatePlanPayload($payload);

        if ($validated['issues'] !== []) {
            Response::error('VALIDATION_ERROR', 'Request validation failed.', $validated['issues'], 400);
            return;
        }

        try {
            Query::exec(
                'UPDATE reading_plan
                 SET `date` = :date, testament = :testament, book = :book, chapter = :chapter
                 WHERE id = :id',
                [
                    'id' => $id,
                    'date' => $validated['data']['date'],
                    'testament' => $validated['data']['testament'],
                    'book' => $validated['data']['book'],
                    'chapter' => $validated['data']['chapter'],
                ],
            );
        } catch (\PDOException $error) {
            if ($this->isDuplicateError($error)) {
                Response::error('DUPLICATE_DATE', 'A reading plan for this date already exists.', null, 409);
                return;
            }

            throw $error;
        }

        Response::success(['updated' => true]);
    }

    public function delete(Request $request): void
    {
        $id = $this->routeId($request);

        if ($id === null) {
            Response::error('VALIDATION_ERROR', 'Request validation failed.', [['field' => 'id', 'issue' => 'Must be a positive integer']], 400);
            return;
        }

        $deleted = Query::exec('DELETE FROM reading_plan WHERE id = :id', ['id' => $id]);

        if ($deleted === 0) {
            Response::error('NOT_FOUND', 'Reading plan not found.', null, 404);
            return;
        }

        Response::success(['deleted' => true]);
    }

    public function bulkImport(Request $request): void
    {
        $payload = $request->json();
        $entries = $payload['entries'] ?? null;

        if (!is_array($entries)) {
            Response::error('VALIDATION_ERROR', 'Request validation failed.', [['field' => 'entries', 'issue' => 'Must be an array']], 400);
            return;
        }

        $failures = [];
        $validEntries = [];

        foreach ($entries as $index => $entry) {
            if (!is_array($entry)) {
                $failures[] = ['index' => $index, 'issues' => [['field' => 'entry', 'issue' => 'Must be an object']]];
                continue;
            }

            $validated = $this->validatePlanPayload($entry);

            if ($validated['issues'] !== []) {
                $failures[] = ['index' => $index, 'issues' => $validated['issues']];
                continue;
            }

            $validEntries[] = $validated['data'];
        }

        $insertedCount = 0;
        $updatedCount = 0;

        Query::transaction(function () use ($validEntries, &$insertedCount, &$updatedCount): void {
            foreach ($validEntries as $entry) {
                $existing = Query::fetchOne('SELECT id FROM reading_plan WHERE `date` = :date LIMIT 1', ['date' => $entry['date']]);

                if ($existing === null) {
                    Query::exec(
                        'INSERT INTO reading_plan (`date`, testament, book, chapter) VALUES (:date, :testament, :book, :chapter)',
                        $entry,
                    );
                    $insertedCount++;
                    continue;
                }

                Query::exec(
                    'UPDATE reading_plan
                     SET testament = :testament, book = :book, chapter = :chapter
                     WHERE id = :id',
                    [
                        'id' => $existing['id'],
                        'testament' => $entry['testament'],
                        'book' => $entry['book'],
                        'chapter' => $entry['chapter'],
                    ],
                );
                $updatedCount++;
            }
        });

        Response::success([
            'insertedCount' => $insertedCount,
            'updatedCount' => $updatedCount,
            'failedCount' => count($failures),
            'failures' => $failures,
        ]);
    }

    private function routeId(Request $request): ?int
    {
        $params = $request->attribute('routeParams', []);
        $rawId = is_array($params) ? ($params['id'] ?? null) : null;

        if (!is_string($rawId) && !is_int($rawId)) {
            return null;
        }

        $id = (int) $rawId;

        return $id > 0 ? $id : null;
    }

    /**
     * @param array<string, mixed> $payload
     * @return array{data: array{date:string,testament:string,book:string,chapter:int}, issues: array<int, array{field:string, issue:string}>}
     */
    private function validatePlanPayload(array $payload): array
    {
        $date = trim((string) ($payload['date'] ?? ''));
        $testament = trim((string) ($payload['testament'] ?? ''));
        $book = trim((string) ($payload['book'] ?? ''));
        $chapterRaw = $payload['chapter'] ?? null;

        $issues = [];

        if (!$this->isValidDate($date)) {
            $issues[] = ['field' => 'date', 'issue' => 'Must be a valid date in YYYY-MM-DD format'];
        }

        if (!in_array($testament, ['old', 'new'], true)) {
            $issues[] = ['field' => 'testament', 'issue' => 'Must be one of: old, new'];
        }

        if ($book === '') {
            $issues[] = ['field' => 'book', 'issue' => 'Must be non-empty'];
        }

        $chapter = filter_var($chapterRaw, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);

        if ($chapter === false) {
            $issues[] = ['field' => 'chapter', 'issue' => 'Must be a positive integer'];
            $chapter = 1;
        }

        return [
            'data' => [
                'date' => $date,
                'testament' => $testament,
                'book' => $book,
                'chapter' => $chapter,
            ],
            'issues' => $issues,
        ];
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
        return $error->getCode() === '23000';
    }
}
