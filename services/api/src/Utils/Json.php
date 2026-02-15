<?php

declare(strict_types=1);

namespace Api\Utils;

use RuntimeException;

final class Json
{
    public static function encode(mixed $value): string
    {
        $json = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        if ($json === false) {
            throw new RuntimeException('Failed to encode JSON response.');
        }

        return $json;
    }
}
