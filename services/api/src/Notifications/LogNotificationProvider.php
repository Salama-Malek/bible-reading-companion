<?php

declare(strict_types=1);

namespace Api\Notifications;

final class LogNotificationProvider implements NotificationProvider
{
    public function __construct(
        private readonly string $logPath
    ) {
    }

    public function send(array $tokens, string $title, string $body, array $data = []): int
    {
        $count = count($tokens);

        $entry = [
            'at' => gmdate('c'),
            'title' => $title,
            'body' => $body,
            'tokenCount' => $count,
            'data' => $data,
        ];

        $logDir = dirname($this->logPath);

        if (!is_dir($logDir)) {
            mkdir($logDir, 0777, true);
        }

        file_put_contents(
            $this->logPath,
            json_encode($entry, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . PHP_EOL,
            FILE_APPEND,
        );

        return $count;
    }
}
