<?php

declare(strict_types=1);

namespace Api\Http;

final class Router
{
    /** @var array<string, array<string, callable(Request): void>> */
    private array $routes = [];

    public function get(string $path, callable $handler): void
    {
        $this->add('GET', $path, $handler);
    }

    public function add(string $method, string $path, callable $handler): void
    {
        $normalizedMethod = strtoupper($method);
        $this->routes[$normalizedMethod][$path] = $handler;
    }

    public function dispatch(Request $request): void
    {
        $handler = $this->routes[$request->method][$request->path] ?? null;

        if ($handler === null) {
            Response::error('NOT_FOUND', 'Route not found.', null, 404);
            return;
        }

        $handler($request);
    }
}
