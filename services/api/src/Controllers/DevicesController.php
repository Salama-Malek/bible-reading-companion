<?php

declare(strict_types=1);

namespace Api\Controllers;

use Api\Db\Query;
use Api\Http\Request;
use Api\Http\Response;

final class DevicesController
{
    private const ALLOWED_PLATFORMS = ['android', 'ios', 'web'];

    public function register(Request $request): void
    {
        $payload = $request->json();
        $pushToken = trim((string) ($payload['pushToken'] ?? ''));
        $platform = trim((string) ($payload['platform'] ?? ''));

        $issues = [];

        if ($pushToken === '') {
            $issues[] = ['field' => 'pushToken', 'issue' => 'Push token is required'];
        } elseif (mb_strlen($pushToken) > 255) {
            $issues[] = ['field' => 'pushToken', 'issue' => 'Must be at most 255 characters'];
        }

        if ($platform === '') {
            $issues[] = ['field' => 'platform', 'issue' => 'Platform is required'];
        } elseif (!in_array($platform, self::ALLOWED_PLATFORMS, true)) {
            $issues[] = ['field' => 'platform', 'issue' => 'Must be one of: android, ios, web'];
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

        Query::exec(
            'INSERT INTO user_devices (user_id, push_token, platform)
             VALUES (:user_id, :push_token, :platform)
             ON DUPLICATE KEY UPDATE
                user_id = VALUES(user_id),
                platform = VALUES(platform)',
            [
                'user_id' => $userId,
                'push_token' => $pushToken,
                'platform' => $platform,
            ],
        );

        Response::success([
            'registered' => true,
        ]);
    }

    public function unregister(Request $request): void
    {
        $payload = $request->json();
        $pushToken = trim((string) ($payload['pushToken'] ?? ''));

        $issues = [];

        if ($pushToken === '') {
            $issues[] = ['field' => 'pushToken', 'issue' => 'Push token is required'];
        } elseif (mb_strlen($pushToken) > 255) {
            $issues[] = ['field' => 'pushToken', 'issue' => 'Must be at most 255 characters'];
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

        Query::exec(
            'DELETE FROM user_devices WHERE push_token = :push_token AND user_id = :user_id',
            [
                'push_token' => $pushToken,
                'user_id' => $userId,
            ],
        );

        Response::success([
            'unregistered' => true,
        ]);
    }

    private function authUserId(Request $request): ?int
    {
        $user = $request->attribute('authUser');
        $userId = is_array($user) ? (int) ($user['id'] ?? 0) : 0;

        return $userId > 0 ? $userId : null;
    }
}
