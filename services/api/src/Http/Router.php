<?php

declare(strict_types=1);

namespace Api\Http;

final class Router
{
    /** @var array<string, array<int, array{path:string,handler:callable(Request): void}>> */
    private array $routes = [];

    public function get(string $path, callable $handler): void
    {
        $this->add('GET', $path, $handler);
    }

    public function post(string $path, callable $handler): void
    {
        $this->add('POST', $path, $handler);
    }

    public function put(string $path, callable $handler): void
    {
        $this->add('PUT', $path, $handler);
    }

    public function delete(string $path, callable $handler): void
    {
        $this->add('DELETE', $path, $handler);
    }

    public function add(string $method, string $path, callable $handler): void
    {
        $normalizedMethod = strtoupper($method);
        $this->routes[$normalizedMethod][] = [
            'path' => $path,
            'handler' => $handler,
        ];
    }

    public function dispatch(Request $request): void
    {
        $routes = $this->routes[$request->method] ?? [];

        foreach ($routes as $route) {
            $params = $this->matchPath($route['path'], $request->path);

            if ($params === null) {
                continue;
            }

            $handler = $route['handler'];
            $handler($request->withAttribute('routeParams', $params));
            return;
        }

        if ($routes === []) {
            Response::error('NOT_FOUND', 'Route not found.', null, 404);
            return;
        }

        Response::error('NOT_FOUND', 'Route not found.', null, 404);
    }

    /**
     * @return array<string, string>|null
     */
    private function matchPath(string $routePath, string $requestPath): ?array
    {
        $routeSegments = explode('/', trim($routePath, '/'));
        $requestSegments = explode('/', trim($requestPath, '/'));

        if ($routePath === '/') {
            $routeSegments = [];
        }

        if ($requestPath === '/') {
            $requestSegments = [];
        }

        if (count($routeSegments) !== count($requestSegments)) {
            return null;
        }

        $params = [];

        foreach ($routeSegments as $index => $routeSegment) {
            $requestSegment = $requestSegments[$index] ?? '';

            if (str_starts_with($routeSegment, ':')) {
                $name = substr($routeSegment, 1);

                if ($name === '' || $requestSegment === '') {
                    return null;
                }

                $params[$name] = $requestSegment;
                continue;
            }

            if ($routeSegment !== $requestSegment) {
                return null;
            }
        }

        return $params;
    }
}
