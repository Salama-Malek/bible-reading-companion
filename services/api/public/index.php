<?php

declare(strict_types=1);

use Api\Config;
use Api\Env;
use Api\Http\Request;
use Api\Http\Router;
use Api\Middleware\MiddlewareStack;

$basePath = dirname(__DIR__);

require_once $basePath . '/src/Utils/Json.php';
require_once $basePath . '/src/Utils/Date.php';
require_once $basePath . '/src/Config.php';
require_once $basePath . '/src/Db/Db.php';
require_once $basePath . '/src/Db/Query.php';
require_once $basePath . '/src/Env.php';
require_once $basePath . '/src/Http/Request.php';
require_once $basePath . '/src/Http/Response.php';
require_once $basePath . '/src/Http/Router.php';
require_once $basePath . '/src/Auth/Password.php';
require_once $basePath . '/src/Auth/Jwt.php';
require_once $basePath . '/src/Auth/AuthService.php';
require_once $basePath . '/src/Middleware/AuthMiddleware.php';
require_once $basePath . '/src/Middleware/RequireRole.php';
require_once $basePath . '/src/Middleware/MiddlewareStack.php';
require_once $basePath . '/src/Controllers/PlansController.php';
require_once $basePath . '/src/Controllers/AdminPlansController.php';
require_once $basePath . '/src/Reading/StreakCalculator.php';
require_once $basePath . '/src/Controllers/ReadingController.php';
require_once $basePath . '/src/Controllers/VersesController.php';
require_once $basePath . '/src/Controllers/DevicesController.php';
require_once $basePath . '/src/Controllers/AdminNotificationsController.php';
require_once $basePath . '/src/Notifications/NotificationProvider.php';
require_once $basePath . '/src/Notifications/LogNotificationProvider.php';

Env::load($basePath);

Config::appEnv();
Config::appUrl();

$router = new Router();
$registerRoutes = require $basePath . '/routes.php';
$registerRoutes($router);

$request = Request::fromGlobals();
$stack = new MiddlewareStack();
$stack->handle($request, static function (Request $req) use ($router): void {
    $router->dispatch($req);
});
