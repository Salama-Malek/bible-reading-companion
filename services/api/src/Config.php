<?php

declare(strict_types=1);

namespace Api;

final class Config
{
    public static function get(string $key, mixed $default = null): mixed
    {
        $value = getenv($key);

        if ($value === false) {
            return $_ENV[$key] ?? $_SERVER[$key] ?? $default;
        }

        return $value;
    }

    public static function appEnv(): string
    {
        return (string) self::get('APP_ENV', 'local');
    }

    public static function appUrl(): string
    {
        return (string) self::get('APP_URL', 'http://127.0.0.1:8080');
    }
}
