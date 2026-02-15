<?php

declare(strict_types=1);

namespace Api\Middleware;

use Api\Http\Request;
use Api\Http\Response;

final class RequireRole
{
    public function __construct(private readonly string $role)
    {
    }

    public function __invoke(Request $request, callable $next): void
    {
        $user = $request->attribute('authUser');

        if (!is_array($user) || ($user['role'] ?? null) !== $this->role) {
            Response::error('FORBIDDEN', 'You do not have permission to access this resource.', null, 403);
            return;
        }

        $next($request);
    }
}
