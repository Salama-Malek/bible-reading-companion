<?php

declare(strict_types=1);

namespace Api\Http;

final class Request
{
    public function __construct(
        public readonly string $method,
        public readonly string $path,
        public readonly array $query = [],
        public readonly array $server = []
    ) {
    }

    public static function fromGlobals(): self
    {
        $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
        $uri = $_SERVER['REQUEST_URI'] ?? '/';
        $path = parse_url($uri, PHP_URL_PATH);

        return new self(
            method: $method,
            path: is_string($path) && $path !== '' ? $path : '/',
            query: $_GET,
            server: $_SERVER
        );
    }
}
