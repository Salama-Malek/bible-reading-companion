<?php

declare(strict_types=1);

namespace Api\Auth;

use Api\Db\Db;
use Api\Db\Query;

final class AuthService
{
    public function register(string $email, string $password, string $name): array
    {
        $normalizedEmail = mb_strtolower(trim($email));

        $existing = $this->findByEmail($normalizedEmail);
        if ($existing !== null) {
            throw new \DomainException('EMAIL_TAKEN');
        }

        $passwordHash = Password::hash($password);

        Query::exec(
            'INSERT INTO users (email, password_hash, name, role) VALUES (:email, :password_hash, :name, :role)',
            [
                'email' => $normalizedEmail,
                'password_hash' => $passwordHash,
                'name' => $name,
                'role' => 'user',
            ]
        );

        $userId = (int) Db::get()->lastInsertId();

        $user = $this->findById($userId);

        if ($user === null) {
            throw new \RuntimeException('Failed to load user after registration.');
        }

        return $user;
    }

    public function login(string $email, string $password): array
    {
        $normalizedEmail = mb_strtolower(trim($email));
        $user = $this->findByEmail($normalizedEmail, includePasswordHash: true);

        if ($user === null) {
            throw new \DomainException('INVALID_CREDENTIALS');
        }

        $passwordHash = (string) ($user['password_hash'] ?? '');

        if ($passwordHash === '' || !Password::verify($password, $passwordHash)) {
            throw new \DomainException('INVALID_CREDENTIALS');
        }

        unset($user['password_hash']);

        return $user;
    }

    public function issueToken(array $user): string
    {
        $now = time();

        return Jwt::sign([
            'sub' => (int) $user['id'],
            'role' => (string) $user['role'],
            'iat' => $now,
            'exp' => $now + Jwt::TTL_SECONDS,
        ]);
    }

    public function findById(int $userId): array|null
    {
        return $this->findBy('id', $userId);
    }

    public function findByEmail(string $email, bool $includePasswordHash = false): array|null
    {
        return $this->findBy('email', $email, $includePasswordHash);
    }

    private function findBy(string $field, int|string $value, bool $includePasswordHash = false): array|null
    {
        $select = 'SELECT id, email, name, role';

        if ($includePasswordHash) {
            $select .= ', password_hash';
        }

        $allowedFields = ['id', 'email'];
        if (!in_array($field, $allowedFields, true)) {
            throw new \InvalidArgumentException('Unsupported field.');
        }

        $user = Query::fetchOne(
            sprintf('%s FROM users WHERE %s = :value LIMIT 1', $select, $field),
            ['value' => $value]
        );

        if ($user === null) {
            return null;
        }

        return [
            'id' => (int) $user['id'],
            'email' => (string) $user['email'],
            'name' => $user['name'] !== null ? (string) $user['name'] : null,
            'role' => (string) $user['role'],
            ...($includePasswordHash ? ['password_hash' => (string) $user['password_hash']] : []),
        ];
    }
}
