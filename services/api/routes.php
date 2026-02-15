<?php

declare(strict_types=1);

use Api\Db\Query;
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
};
