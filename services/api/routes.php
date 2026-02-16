<?php

declare(strict_types=1);

use Api\Auth\AuthService;
use Api\Controllers\AdminPlansController;
use Api\Controllers\AdminNotificationsController;
use Api\Controllers\DevicesController;
use Api\Controllers\PlansController;
use Api\Controllers\ReadingController;
use Api\Controllers\VersesController;
use Api\Db\Query;
use Api\Http\Request;
use Api\Http\Response;
use Api\Http\Router;
use Api\Middleware\AuthMiddleware;
use Api\Middleware\RequireRole;

return static function (Router $router): void {
    $authService = new AuthService();
    $authMiddleware = new AuthMiddleware($authService);
    $plansController = new PlansController();
    $adminPlansController = new AdminPlansController();
    $adminNotificationsController = new AdminNotificationsController();
    $readingController = new ReadingController();
    $versesController = new VersesController();
    $devicesController = new DevicesController();
    $requireAdmin = new RequireRole('admin');

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


    $router->get('/plans/today', static function (Request $request) use ($plansController): void {
        $plansController->today($request);
    });

    $router->get('/plans', static function (Request $request) use ($plansController): void {
        $plansController->range($request);
    });


    $router->post('/admin/plans', static function (Request $request) use ($authMiddleware, $requireAdmin, $adminPlansController): void {
        $authMiddleware($request, static function (Request $authedRequest) use ($requireAdmin, $adminPlansController): void {
            $requireAdmin($authedRequest, static function (Request $adminRequest) use ($adminPlansController): void {
                $adminPlansController->create($adminRequest);
            });
        });
    });

    $router->get('/admin/plans', static function (Request $request) use ($authMiddleware, $requireAdmin, $adminPlansController): void {
        $authMiddleware($request, static function (Request $authedRequest) use ($requireAdmin, $adminPlansController): void {
            $requireAdmin($authedRequest, static function (Request $adminRequest) use ($adminPlansController): void {
                $adminPlansController->list($adminRequest);
            });
        });
    });

    $router->put('/admin/plans/:id', static function (Request $request) use ($authMiddleware, $requireAdmin, $adminPlansController): void {
        $authMiddleware($request, static function (Request $authedRequest) use ($requireAdmin, $adminPlansController): void {
            $requireAdmin($authedRequest, static function (Request $adminRequest) use ($adminPlansController): void {
                $adminPlansController->update($adminRequest);
            });
        });
    });

    $router->delete('/admin/plans/:id', static function (Request $request) use ($authMiddleware, $requireAdmin, $adminPlansController): void {
        $authMiddleware($request, static function (Request $authedRequest) use ($requireAdmin, $adminPlansController): void {
            $requireAdmin($authedRequest, static function (Request $adminRequest) use ($adminPlansController): void {
                $adminPlansController->delete($adminRequest);
            });
        });
    });

    $router->post('/admin/plans/bulk-import', static function (Request $request) use ($authMiddleware, $requireAdmin, $adminPlansController): void {
        $authMiddleware($request, static function (Request $authedRequest) use ($requireAdmin, $adminPlansController): void {
            $requireAdmin($authedRequest, static function (Request $adminRequest) use ($adminPlansController): void {
                $adminPlansController->bulkImport($adminRequest);
            });
        });
    });

    $router->post('/admin/notifications/send-today', static function (Request $request) use ($adminNotificationsController): void {
        $adminNotificationsController->sendToday($request);
    });

    $router->get('/auth/me', static function (Request $request) use ($authMiddleware): void {
        $authMiddleware($request, static function (Request $authedRequest): void {
            $user = $authedRequest->attribute('authUser');

            Response::success([
                'user' => $user,
            ]);
        });
    });

    $router->post('/verses', static function (Request $request) use ($authMiddleware, $versesController): void {
        $authMiddleware($request, static function (Request $authedRequest) use ($versesController): void {
            $versesController->create($authedRequest);
        });
    });

    $router->get('/verses', static function (Request $request) use ($authMiddleware, $versesController): void {
        $authMiddleware($request, static function (Request $authedRequest) use ($versesController): void {
            $versesController->list($authedRequest);
        });
    });

    $router->delete('/verses/:id', static function (Request $request) use ($authMiddleware, $versesController): void {
        $authMiddleware($request, static function (Request $authedRequest) use ($versesController): void {
            $versesController->delete($authedRequest);
        });
    });


    $router->post('/devices/register', static function (Request $request) use ($authMiddleware, $devicesController): void {
        $authMiddleware($request, static function (Request $authedRequest) use ($devicesController): void {
            $devicesController->register($authedRequest);
        });
    });

    $router->post('/devices/unregister', static function (Request $request) use ($authMiddleware, $devicesController): void {
        $authMiddleware($request, static function (Request $authedRequest) use ($devicesController): void {
            $devicesController->unregister($authedRequest);
        });
    });

    $router->post('/reading/complete', static function (Request $request) use ($authMiddleware, $readingController): void {
        $authMiddleware($request, static function (Request $authedRequest) use ($readingController): void {
            $readingController->complete($authedRequest);
        });
    });

    $router->get('/reading/history', static function (Request $request) use ($authMiddleware, $readingController): void {
        $authMiddleware($request, static function (Request $authedRequest) use ($readingController): void {
            $readingController->history($authedRequest);
        });
    });

};
