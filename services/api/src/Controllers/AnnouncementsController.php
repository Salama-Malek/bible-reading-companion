<?php

declare(strict_types=1);

namespace Api\Controllers;

use Api\Db\Query;
use Api\Http\Request;
use Api\Http\Response;

final class AnnouncementsController
{
    public function create(Request $request): void
    {
        $payload = $request->json();
        $title = trim((string) ($payload['title'] ?? ''));
        $body = trim((string) ($payload['body'] ?? ''));

        $issues = [];

        if ($title === '') {
            $issues[] = ['field' => 'title', 'issue' => 'Title is required'];
        } elseif (mb_strlen($title) > 140) {
            $issues[] = ['field' => 'title', 'issue' => 'Title must be 140 characters or fewer'];
        }

        if ($body === '') {
            $issues[] = ['field' => 'body', 'issue' => 'Body is required'];
        }

        if ($issues !== []) {
            Response::error('VALIDATION_ERROR', 'Request validation failed.', $issues, 400);
            return;
        }

        $authUser = $request->attribute('authUser');

        if (!is_array($authUser) || !isset($authUser['id']) || !is_int($authUser['id'])) {
            Response::error('UNAUTHORIZED', 'Authenticated user is required.', null, 401);
            return;
        }

        Query::exec(
            'INSERT INTO announcements (title, body, created_by) VALUES (:title, :body, :created_by)',
            [
                'title' => $title,
                'body' => $body,
                'created_by' => $authUser['id'],
            ],
        );

        Response::success(['created' => true], 201);
    }

    public function list(Request $request): void
    {
        $pageRaw = $request->query['page'] ?? null;
        $pageSizeRaw = $request->query['pageSize'] ?? null;

        $page = filter_var($pageRaw, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        $pageSize = filter_var($pageSizeRaw, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 50]]);

        $resolvedPage = $page === false ? 1 : (int) $page;
        $resolvedPageSize = $pageSize === false ? 50 : (int) $pageSize;
        $offset = ($resolvedPage - 1) * $resolvedPageSize;

        $announcements = Query::fetchAll(
            'SELECT id, title, body, created_at, created_by
             FROM announcements
             ORDER BY created_at DESC
             LIMIT :limit OFFSET :offset',
            [
                'limit' => $resolvedPageSize,
                'offset' => $offset,
            ],
        );

        Response::success([
            'announcements' => $announcements,
            'page' => $resolvedPage,
            'pageSize' => $resolvedPageSize,
        ]);
    }
}
