<?php

declare(strict_types=1);

namespace Api\Controllers;

use Api\Db\Db;
use Api\Db\Query;
use Api\Http\Request;
use Api\Http\Response;

final class VersesController
{
    public function create(Request $request): void
    {
        $payload = $request->json();
        $date = trim((string) ($payload['date'] ?? ''));
        $referenceText = trim((string) ($payload['referenceText'] ?? ''));
        $note = $payload['note'] ?? null;

        $issues = [];

        if ($date !== '' && !$this->isValidDate($date)) {
            $issues[] = ['field' => 'date', 'issue' => 'Must be a valid date in YYYY-MM-DD format'];
        }

        if ($referenceText === '') {
            $issues[] = ['field' => 'referenceText', 'issue' => 'Reference text is required'];
        } elseif (mb_strlen($referenceText) > 100) {
            $issues[] = ['field' => 'referenceText', 'issue' => 'Must be at most 100 characters'];
        }

        if ($note !== null && !is_string($note)) {
            $issues[] = ['field' => 'note', 'issue' => 'Must be a string'];
        }

        if ($issues !== []) {
            Response::error('VALIDATION_ERROR', 'Request validation failed.', $issues, 400);
            return;
        }

        $userId = $this->authUserId($request);

        if ($userId === null) {
            Response::error('UNAUTHORIZED', 'Authentication required.', null, 401);
            return;
        }

        $planId = null;

        if ($date !== '') {
            $plan = Query::fetchOne(
                'SELECT id FROM reading_plan WHERE `date` = :date LIMIT 1',
                ['date' => $date],
            );

            if ($plan !== null) {
                $planId = (int) $plan['id'];
            }
        }

        Query::exec(
            'INSERT INTO saved_verses (user_id, plan_id, reference_text, note)
             VALUES (:user_id, :plan_id, :reference_text, :note)',
            [
                'user_id' => $userId,
                'plan_id' => $planId,
                'reference_text' => $referenceText,
                'note' => is_string($note) ? $note : null,
            ],
        );

        $savedVerseId = (int) Db::get()->lastInsertId();

        $verse = Query::fetchOne(
            'SELECT id, user_id, plan_id, reference_text, note, created_at
             FROM saved_verses
             WHERE id = :id AND user_id = :user_id
             LIMIT 1',
            [
                'id' => $savedVerseId,
                'user_id' => $userId,
            ],
        );

        if ($verse === null) {
            Response::error('INTERNAL_ERROR', 'Unable to load saved verse.', null, 500);
            return;
        }

        Response::success([
            'verse' => $verse,
        ], 201);
    }

    public function list(Request $request): void
    {
        $page = $this->parsePositiveInt($request->query['page'] ?? 1);
        $pageSize = $this->parsePositiveInt($request->query['pageSize'] ?? 20);

        $issues = [];

        if ($page === null) {
            $issues[] = ['field' => 'page', 'issue' => 'Must be a positive integer'];
        }

        if ($pageSize === null) {
            $issues[] = ['field' => 'pageSize', 'issue' => 'Must be a positive integer'];
        }

        if ($issues !== []) {
            Response::error('VALIDATION_ERROR', 'Request validation failed.', $issues, 400);
            return;
        }

        $userId = $this->authUserId($request);

        if ($userId === null) {
            Response::error('UNAUTHORIZED', 'Authentication required.', null, 401);
            return;
        }

        $offset = ($page - 1) * $pageSize;

        $items = Query::fetchAll(
            sprintf(
                'SELECT id, user_id, plan_id, reference_text, note, created_at
                 FROM saved_verses
                 WHERE user_id = :user_id
                 ORDER BY created_at DESC
                 LIMIT %d OFFSET %d',
                $pageSize,
                $offset,
            ),
            ['user_id' => $userId],
        );

        $countRow = Query::fetchOne(
            'SELECT COUNT(*) AS total FROM saved_verses WHERE user_id = :user_id',
            ['user_id' => $userId],
        );

        $total = (int) ($countRow['total'] ?? 0);

        Response::success([
            'items' => $items,
            'page' => $page,
            'pageSize' => $pageSize,
            'total' => $total,
        ]);
    }

    public function delete(Request $request): void
    {
        $id = $this->routeId($request);

        if ($id === null) {
            Response::error('VALIDATION_ERROR', 'Request validation failed.', [['field' => 'id', 'issue' => 'Must be a positive integer']], 400);
            return;
        }

        $userId = $this->authUserId($request);

        if ($userId === null) {
            Response::error('UNAUTHORIZED', 'Authentication required.', null, 401);
            return;
        }

        $deleted = Query::exec(
            'DELETE FROM saved_verses WHERE id = :id AND user_id = :user_id',
            [
                'id' => $id,
                'user_id' => $userId,
            ],
        );

        if ($deleted === 0) {
            Response::error('NOT_FOUND', 'Saved verse not found.', null, 404);
            return;
        }

        Response::success([
            'deleted' => true,
        ]);
    }

    private function authUserId(Request $request): ?int
    {
        $user = $request->attribute('authUser');
        $userId = is_array($user) ? (int) ($user['id'] ?? 0) : 0;

        return $userId > 0 ? $userId : null;
    }

    private function isValidDate(string $value): bool
    {
        $date = \DateTimeImmutable::createFromFormat('Y-m-d', $value);

        return $date !== false && $date->format('Y-m-d') === $value;
    }

    private function routeId(Request $request): ?int
    {
        $params = $request->attribute('routeParams', []);
        $rawId = is_array($params) ? ($params['id'] ?? null) : null;

        return $this->parsePositiveInt($rawId);
    }

    private function parsePositiveInt(mixed $value): ?int
    {
        if (is_int($value)) {
            return $value > 0 ? $value : null;
        }

        if (!is_string($value) || !preg_match('/^[1-9]\d*$/', $value)) {
            return null;
        }

        $intValue = (int) $value;

        return $intValue > 0 ? $intValue : null;
    }
}
