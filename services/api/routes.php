<?php

declare(strict_types=1);

use Api\Http\Request;
use Api\Http\Response;
use Api\Http\Router;

return static function (Router $router): void {
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
};
