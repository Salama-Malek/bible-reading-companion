<?php

declare(strict_types=1);

namespace Api\Http;

use Api\Utils\Json;

final class Response
{
    public static function json(array $payload, int $status = 200): void
    {
        http_response_code($status);
        header('Content-Type: application/json');

        echo Json::encode($payload);
    }

    public static function success(mixed $data, int $status = 200): void
    {
        self::json([
            'ok' => true,
            'data' => $data,
        ], $status);
    }

    public static function error(
        string $code,
        string $message,
        mixed $details = null,
        int $status = 400
    ): void {
        self::json([
            'ok' => false,
            'error' => [
                'code' => $code,
                'message' => $message,
                'details' => $details,
            ],
        ], $status);
    }
}
