<?php

declare(strict_types=1);

namespace Api\Controllers;

use Api\Db\Query;
use Api\Http\Request;
use Api\Http\Response;

final class BibleController
{
    /** @var array<string, array<string, mixed>|null> */
    private array $bookCache = [];

    /** @var array<string, array<int, array<string, mixed>>> */
    private array $chapterCache = [];

    public function books(Request $request): void
    {
        $books = Query::fetchAll(
            'SELECT id, testament, name, display_name, sort_order
             FROM bible_books
             ORDER BY FIELD(testament, "old", "new"), sort_order ASC'
        );

        $normalizedBooks = array_map(
            static fn (array $book): array => [
                'id' => (int) $book['id'],
                'testament' => (string) $book['testament'],
                'name' => (string) $book['name'],
                'displayName' => (string) $book['display_name'],
                'sortOrder' => (int) $book['sort_order'],
            ],
            $books,
        );

        Response::success([
            'books' => $normalizedBooks,
        ]);
    }

    public function chapter(Request $request): void
    {
        $bookName = $this->routeParam($request, 'book');
        $chapter = $this->positiveRouteInt($request, 'chapter');

        if ($bookName === null || $chapter === null) {
            Response::error('VALIDATION_ERROR', 'Request validation failed.', [['field' => 'path', 'issue' => 'Invalid book or chapter parameter']], 400);
            return;
        }

        $book = $this->findBookByName($bookName);

        if ($book === null) {
            Response::error('BOOK_NOT_FOUND', 'Book not found.', null, 404);
            return;
        }

        $cacheKey = sprintf('%d:%d', (int) $book['id'], $chapter);

        if (!array_key_exists($cacheKey, $this->chapterCache)) {
            $rows = Query::fetchAll(
                'SELECT v.verse, v.text
                 FROM bible_verses v
                 INNER JOIN bible_books b ON b.id = v.book_id
                 WHERE b.id = :book_id AND v.chapter = :chapter
                 ORDER BY v.verse ASC',
                [
                    'book_id' => (int) $book['id'],
                    'chapter' => $chapter,
                ],
            );

            $this->chapterCache[$cacheKey] = array_map(
                static fn (array $row): array => [
                    'verse' => (int) $row['verse'],
                    'text' => (string) $row['text'],
                ],
                $rows,
            );
        }

        Response::success([
            'book' => (string) $book['name'],
            'chapter' => $chapter,
            'verses' => $this->chapterCache[$cacheKey],
        ]);
    }

    public function verse(Request $request): void
    {
        $bookName = $this->routeParam($request, 'book');
        $chapter = $this->positiveRouteInt($request, 'chapter');
        $verse = $this->positiveRouteInt($request, 'verse');

        if ($bookName === null || $chapter === null || $verse === null) {
            Response::error('VALIDATION_ERROR', 'Request validation failed.', [['field' => 'path', 'issue' => 'Invalid book, chapter, or verse parameter']], 400);
            return;
        }

        $book = $this->findBookByName($bookName);

        if ($book === null) {
            Response::error('BOOK_NOT_FOUND', 'Book not found.', null, 404);
            return;
        }

        $row = Query::fetchOne(
            'SELECT v.text
             FROM bible_verses v
             INNER JOIN bible_books b ON b.id = v.book_id
             WHERE b.id = :book_id
               AND v.chapter = :chapter
               AND v.verse = :verse
             LIMIT 1',
            [
                'book_id' => (int) $book['id'],
                'chapter' => $chapter,
                'verse' => $verse,
            ],
        );

        if ($row === null) {
            Response::error('VERSE_NOT_FOUND', 'Verse not found.', null, 404);
            return;
        }

        Response::success([
            'reference' => sprintf('%s %d:%d', (string) $book['name'], $chapter, $verse),
            'text' => (string) $row['text'],
        ]);
    }

    /** @return array<string, mixed>|null */
    private function findBookByName(string $bookName): ?array
    {
        if (array_key_exists($bookName, $this->bookCache)) {
            return $this->bookCache[$bookName];
        }

        $book = Query::fetchOne(
            'SELECT id, name
             FROM bible_books
             WHERE name = :name
             LIMIT 1',
            ['name' => $bookName],
        );

        $this->bookCache[$bookName] = $book;

        return $book;
    }

    private function routeParam(Request $request, string $name): ?string
    {
        $params = $request->attribute('routeParams', []);

        if (!is_array($params)) {
            return null;
        }

        $value = $params[$name] ?? null;

        if (!is_string($value) || trim($value) === '') {
            return null;
        }

        return trim(rawurldecode($value));
    }

    private function positiveRouteInt(Request $request, string $name): ?int
    {
        $params = $request->attribute('routeParams', []);

        if (!is_array($params)) {
            return null;
        }

        $value = $params[$name] ?? null;

        if (!is_string($value) || !preg_match('/^\d+$/', $value)) {
            return null;
        }

        $parsed = (int) $value;

        return $parsed > 0 ? $parsed : null;
    }
}
