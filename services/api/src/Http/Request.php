<?php

declare(strict_types=1);

namespace Api\Http;

final class Request
{
    private ?array $jsonBody = null;

    public function __construct(
        public readonly string $method,
        public readonly string $path,
        public readonly array $query = [],
        public readonly array $server = [],
        private readonly string $rawBody = '',
        private readonly array $attributes = []
    ) {
    }

    public static function fromGlobals(): self
    {
        $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
        $uri = $_SERVER['REQUEST_URI'] ?? '/';
        $path = parse_url($uri, PHP_URL_PATH);

        $rawBody = file_get_contents('php://input');

        return new self(
            method: $method,
            path: is_string($path) && $path !== '' ? $path : '/',
            query: $_GET,
            server: $_SERVER,
            rawBody: is_string($rawBody) ? $rawBody : ''
        );
    }

    public function header(string $name): string|null
    {
        $serverKey = 'HTTP_' . strtoupper(str_replace('-', '_', $name));

        if (isset($this->server[$serverKey]) && is_string($this->server[$serverKey])) {
            return $this->server[$serverKey];
        }

        if (strcasecmp($name, 'Content-Type') === 0 && isset($this->server['CONTENT_TYPE'])) {
            return (string) $this->server['CONTENT_TYPE'];
        }

        return null;
    }

    public function json(): array
    {
        if ($this->jsonBody !== null) {
            return $this->jsonBody;
        }

        if ($this->rawBody === '') {
            $this->jsonBody = [];
            return $this->jsonBody;
        }

        try {
            $decoded = json_decode($this->rawBody, true, 512, JSON_THROW_ON_ERROR);
        } catch (\Throwable) {
            $this->jsonBody = [];
            return $this->jsonBody;
        }

        $this->jsonBody = is_array($decoded) ? $decoded : [];

        return $this->jsonBody;
    }

    public function attribute(string $key, mixed $default = null): mixed
    {
        return $this->attributes[$key] ?? $default;
    }

    public function withAttribute(string $key, mixed $value): self
    {
        $attributes = $this->attributes;
        $attributes[$key] = $value;

        return new self(
            method: $this->method,
            path: $this->path,
            query: $this->query,
            server: $this->server,
            rawBody: $this->rawBody,
            attributes: $attributes
        );
    }
}
