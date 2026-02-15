<?php

declare(strict_types=1);

namespace Api;

final class Env
{
    public static function load(string $basePath): void
    {
        $envPath = $basePath . '/.env';
        $examplePath = $basePath . '/.env.example';

        if (is_file($envPath)) {
            self::loadFile($envPath);
            return;
        }

        if (is_file($examplePath)) {
            self::loadFile($examplePath);
        }
    }

    private static function loadFile(string $filePath): void
    {
        $lines = file($filePath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);

        if ($lines === false) {
            return;
        }

        foreach ($lines as $line) {
            $trimmed = trim($line);

            if ($trimmed === '' || str_starts_with($trimmed, '#')) {
                continue;
            }

            [$key, $value] = array_pad(explode('=', $trimmed, 2), 2, '');
            $key = trim($key);

            if ($key === '') {
                continue;
            }

            $value = trim($value);

            if (
                (str_starts_with($value, '"') && str_ends_with($value, '"')) ||
                (str_starts_with($value, "'") && str_ends_with($value, "'"))
            ) {
                $value = substr($value, 1, -1);
            }

            if (getenv($key) !== false || array_key_exists($key, $_ENV)) {
                continue;
            }

            putenv(sprintf('%s=%s', $key, $value));
            $_ENV[$key] = $value;
            $_SERVER[$key] = $value;
        }
    }
}
