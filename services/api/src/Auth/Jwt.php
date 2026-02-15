<?php

declare(strict_types=1);

namespace Api\Auth;

use Api\Config;

final class Jwt
{
    public const TTL_SECONDS = 30 * 24 * 60 * 60;

    public static function sign(array $payload): string
    {
        $secret = self::secret();
        $header = ['alg' => 'HS256', 'typ' => 'JWT'];

        $encodedHeader = self::base64UrlEncode(json_encode($header, JSON_THROW_ON_ERROR));
        $encodedPayload = self::base64UrlEncode(json_encode($payload, JSON_THROW_ON_ERROR));
        $signature = hash_hmac('sha256', $encodedHeader . '.' . $encodedPayload, $secret, true);

        return $encodedHeader . '.' . $encodedPayload . '.' . self::base64UrlEncode($signature);
    }

    public static function verify(string $token): array|null
    {
        $parts = explode('.', $token);

        if (count($parts) !== 3) {
            return null;
        }

        [$encodedHeader, $encodedPayload, $encodedSignature] = $parts;

        $headerJson = self::base64UrlDecode($encodedHeader);
        $payloadJson = self::base64UrlDecode($encodedPayload);
        $signature = self::base64UrlDecode($encodedSignature);

        if ($headerJson === null || $payloadJson === null || $signature === null) {
            return null;
        }

        try {
            $header = json_decode($headerJson, true, 512, JSON_THROW_ON_ERROR);
            $payload = json_decode($payloadJson, true, 512, JSON_THROW_ON_ERROR);
        } catch (\Throwable) {
            return null;
        }

        if (!is_array($header) || !is_array($payload)) {
            return null;
        }

        if (($header['alg'] ?? null) !== 'HS256' || ($header['typ'] ?? null) !== 'JWT') {
            return null;
        }

        $expected = hash_hmac('sha256', $encodedHeader . '.' . $encodedPayload, self::secret(), true);

        if (!hash_equals($expected, $signature)) {
            return null;
        }

        $now = time();
        $exp = $payload['exp'] ?? null;
        $iat = $payload['iat'] ?? null;

        if (!is_int($exp) || !is_int($iat)) {
            return null;
        }

        if ($exp < $now || $iat > $now + 60) {
            return null;
        }

        return $payload;
    }

    private static function secret(): string
    {
        $secret = (string) Config::get('JWT_SECRET', '');

        if ($secret === '') {
            throw new \RuntimeException('JWT_SECRET is not configured.');
        }

        return $secret;
    }

    private static function base64UrlEncode(string $input): string
    {
        return rtrim(strtr(base64_encode($input), '+/', '-_'), '=');
    }

    private static function base64UrlDecode(string $input): string|null
    {
        $remainder = strlen($input) % 4;

        if ($remainder !== 0) {
            $input .= str_repeat('=', 4 - $remainder);
        }

        $decoded = base64_decode(strtr($input, '-_', '+/'), true);

        if ($decoded === false) {
            return null;
        }

        return $decoded;
    }
}
