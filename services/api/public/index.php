<?php

declare(strict_types=1);

use Api\Config;
use Api\Env;
use Api\Http\Request;
use Api\Http\Router;
use Api\Middleware\MiddlewareStack;

$basePath = dirname(__DIR__);

require_once $basePath . '/src/Utils/Json.php';
require_once $basePath . '/src/Config.php';
require_once $basePath . '/src/Db/Db.php';
require_once $basePath . '/src/Db/Query.php';
require_once $basePath . '/src/Env.php';
require_once $basePath . '/src/Http/Request.php';
require_once $basePath . '/src/Http/Response.php';
require_once $basePath . '/src/Http/Router.php';
require_once $basePath . '/src/Middleware/MiddlewareStack.php';

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
