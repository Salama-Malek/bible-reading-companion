<?php

declare(strict_types=1);

namespace Api\Notifications;

interface NotificationProvider
{
    /**
     * @param array<int, string> $tokens
     * @param array<string, mixed> $data
     */
    public function send(array $tokens, string $title, string $body, array $data = []): int;
}
