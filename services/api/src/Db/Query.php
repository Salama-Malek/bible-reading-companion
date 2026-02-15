<?php

declare(strict_types=1);

namespace Api\Db;

use Closure;
use PDO;

final class Query
{
    public static function fetchOne(string $sql, array $params = []): array|null
    {
        $statement = self::prepareAndExecute($sql, $params);
        $result = $statement->fetch();

        if ($result === false) {
            return null;
        }

        return $result;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public static function fetchAll(string $sql, array $params = []): array
    {
        $statement = self::prepareAndExecute($sql, $params);
        $results = $statement->fetchAll();

        if (!is_array($results)) {
            return [];
        }

        return $results;
    }

    public static function exec(string $sql, array $params = []): int
    {
        $statement = self::prepareAndExecute($sql, $params);

        return $statement->rowCount();
    }

    public static function transaction(Closure $callback): mixed
    {
        $pdo = Db::get();

        $pdo->beginTransaction();

        try {
            $result = $callback($pdo);
            $pdo->commit();

            return $result;
        } catch (\Throwable $error) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }

            throw $error;
        }
    }

    private static function prepareAndExecute(string $sql, array $params = []): \PDOStatement
    {
        $statement = Db::get()->prepare($sql);
        $statement->execute($params);

        return $statement;
    }
}
