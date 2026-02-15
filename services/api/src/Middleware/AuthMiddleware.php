<?php

declare(strict_types=1);

namespace Api\Middleware;

use Api\Auth\AuthService;
use Api\Auth\Jwt;
use Api\Http\Request;
use Api\Http\Response;

final class AuthMiddleware
{
    public function __construct(private readonly AuthService $authService)
    {
    }

    public function __invoke(Request $request, callable $next): void
    {
        $authorization = $request->header('Authorization');

        if ($authorization === null || !preg_match('/^Bearer\s+(.+)$/i', $authorization, $matches)) {
            Response::error('UNAUTHORIZED', 'Authorization token is missing or invalid.', null, 401);
            return;
        }

        $payload = Jwt::verify($matches[1]);

        if ($payload === null) {
            Response::error('UNAUTHORIZED', 'Authorization token is invalid or expired.', null, 401);
            return;
        }

        $userId = $payload['sub'] ?? null;

        if (!is_int($userId)) {
            Response::error('UNAUTHORIZED', 'Authorization token is invalid.', null, 401);
            return;
        }

        $user = $this->authService->findById($userId);

        if ($user === null) {
            Response::error('UNAUTHORIZED', 'Authenticated user does not exist.', null, 401);
            return;
        }

        $next($request->withAttribute('authUser', $user));
    }
}
