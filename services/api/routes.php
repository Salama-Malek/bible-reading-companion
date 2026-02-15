<?php

declare(strict_types=1);

use Api\Auth\AuthService;
use Api\Db\Query;
use Api\Http\Request;
use Api\Http\Response;
use Api\Http\Router;
use Api\Middleware\AuthMiddleware;

return static function (Router $router): void {
    $authService = new AuthService();
    $authMiddleware = new AuthMiddleware($authService);

    $router->get('/health', static function (Request $request): void {
        Response::success([
            'service' => 'api',
        ]);
    });

    $router->get('/version', static function (Request $request): void {
        Response::success([
            'version' => '0.1.0',
        ]);
    });

    $router->get('/db/ping', static function (Request $request): void {
        try {
            Query::fetchOne('SELECT 1 AS ping');

            Response::success([
                'connected' => true,
            ]);
        } catch (\Throwable $error) {
            Response::error(
                'DB_CONNECT_FAILED',
                'Database connection failed.',
                null,
                500,
            );
        }
    });

    $router->post('/auth/register', static function (Request $request) use ($authService): void {
        $payload = $request->json();
        $email = trim((string) ($payload['email'] ?? ''));
        $password = (string) ($payload['password'] ?? '');
        $name = trim((string) ($payload['name'] ?? ''));

        $issues = [];

        if ($name === '') {
            $issues[] = ['field' => 'name', 'issue' => 'Name is required'];
        }

        if ($email === '' || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            $issues[] = ['field' => 'email', 'issue' => 'Must be a valid email address'];
        }

        if (strlen($password) < 8) {
            $issues[] = ['field' => 'password', 'issue' => 'Password must be at least 8 characters'];
        }

        if ($issues !== []) {
            Response::error('VALIDATION_ERROR', 'Request validation failed.', $issues, 400);
            return;
        }

        try {
            $user = $authService->register($email, $password, $name);
        } catch (\DomainException $error) {
            if ($error->getMessage() === 'EMAIL_TAKEN') {
                Response::error('EMAIL_TAKEN', 'Email is already registered.', null, 409);
                return;
            }

            Response::error('VALIDATION_ERROR', 'Registration failed.', null, 400);
            return;
        } catch (\Throwable $error) {
            Response::error('INTERNAL_ERROR', 'Unable to register user.', null, 500);
            return;
        }

        $token = $authService->issueToken($user);

        Response::success([
            'token' => $token,
            'user' => $user,
        ], 201);
    });

    $router->post('/auth/login', static function (Request $request) use ($authService): void {
        $payload = $request->json();
        $email = trim((string) ($payload['email'] ?? ''));
        $password = (string) ($payload['password'] ?? '');

        $issues = [];

        if ($email === '' || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            $issues[] = ['field' => 'email', 'issue' => 'Must be a valid email address'];
        }

        if ($password === '') {
            $issues[] = ['field' => 'password', 'issue' => 'Password is required'];
        }

        if ($issues !== []) {
            Response::error('VALIDATION_ERROR', 'Request validation failed.', $issues, 400);
            return;
        }

        try {
            $user = $authService->login($email, $password);
        } catch (\DomainException $error) {
            Response::error('INVALID_CREDENTIALS', 'Invalid email or password.', null, 401);
            return;
        } catch (\Throwable $error) {
            Response::error('INTERNAL_ERROR', 'Unable to authenticate user.', null, 500);
            return;
        }

        $token = $authService->issueToken($user);

        Response::success([
            'token' => $token,
            'user' => $user,
        ]);
    });

    $router->get('/auth/me', static function (Request $request) use ($authMiddleware): void {
        $authMiddleware($request, static function (Request $authedRequest): void {
            $user = $authedRequest->attribute('authUser');

            Response::success([
                'user' => $user,
            ]);
        });
    });
};
