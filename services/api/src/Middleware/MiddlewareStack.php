<?php

declare(strict_types=1);

namespace Api\Middleware;

use Api\Http\Request;

final class MiddlewareStack
{
    /** @var array<int, callable(Request, callable): void> */
    private array $middlewares = [];

    public function push(callable $middleware): void
    {
        $this->middlewares[] = $middleware;
    }

    public function handle(Request $request, callable $destination): void
    {
        $runner = array_reduce(
            array_reverse($this->middlewares),
            static function (callable $next, callable $middleware): callable {
                return static function (Request $req) use ($middleware, $next): void {
                    $middleware($req, $next);
                };
            },
            static function (Request $req) use ($destination): void {
                $destination($req);
            }
        );

        $runner($request);
    }
}
