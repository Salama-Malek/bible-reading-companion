<?php

declare(strict_types=1);

namespace Api\Utils;

final class Date
{
    public static function todayInTimezone(string $timezone): string
    {
        $today = new \DateTimeImmutable('now', new \DateTimeZone($timezone));

        return $today->format('Y-m-d');
    }
}
