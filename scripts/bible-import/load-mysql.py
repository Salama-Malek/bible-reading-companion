#!/usr/bin/env python3
"""Load normalized Bible rows (JSONL/CSV) into MySQL.

Reads env vars:
- DB_HOST
- DB_PORT
- DB_NAME
- DB_USER
- DB_PASS
"""

from __future__ import annotations

import argparse
import csv
import json
import os
from pathlib import Path
from typing import Any

def chunked(items: list[dict[str, Any]], size: int):
    for i in range(0, len(items), size):
        yield items[i : i + size]


def read_rows(input_path: Path) -> list[dict[str, Any]]:
    suffix = input_path.suffix.lower()
    if suffix == ".jsonl":
        rows: list[dict[str, Any]] = []
        with input_path.open("r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                rows.append(json.loads(line))
        return rows

    if suffix == ".csv":
        with input_path.open("r", encoding="utf-8", newline="") as f:
            reader = csv.DictReader(f)
            return [dict(row) for row in reader]

    raise ValueError("Unsupported input extension. Use .jsonl or .csv")


def normalize_row(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "book": str(row["book"]).strip(),
        "chapter": int(row["chapter"]),
        "verse": int(row["verse"]),
        "text": str(row["text"]).strip(),
    }


def connect_mysql() -> Any:
    try:
        import pymysql
    except ImportError as exc:  # pragma: no cover - runtime dependency
        raise SystemExit(
            "Missing dependency 'pymysql'. Install with: python3 -m pip install pymysql"
        ) from exc

    env = os.environ
    required = ["DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASS"]
    missing = [key for key in required if not env.get(key)]
    if missing:
        raise SystemExit(f"Missing required environment variables: {', '.join(missing)}")

    return pymysql.connect(
        host=env["DB_HOST"],
        port=int(env["DB_PORT"]),
        user=env["DB_USER"],
        password=env["DB_PASS"],
        database=env["DB_NAME"],
        charset="utf8mb4",
        autocommit=False,
        cursorclass=pymysql.cursors.DictCursor,
    )


def load_book_map(path: Path) -> dict[str, dict[str, Any]]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError("book-map.json must be a JSON object keyed by book name")
    return data


def upsert_books(conn: Any, book_map: dict[str, dict[str, Any]], books_in_input: set[str]) -> dict[str, int]:
    with conn.cursor() as cur:
        for book in sorted(books_in_input):
            mapped = book_map.get(book)
            if mapped is None:
                raise ValueError(
                    f"Book '{book}' missing in book-map.json. Add mapping before loading."
                )

            testament = mapped["testament"]
            sort_order = int(mapped["sort_order"])
            display_name = mapped.get("display_name") or book

            cur.execute(
                """
                INSERT INTO bible_books (testament, name, display_name, sort_order)
                VALUES (%s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                  testament = VALUES(testament),
                  display_name = VALUES(display_name),
                  sort_order = VALUES(sort_order)
                """,
                (testament, book, display_name, sort_order),
            )

        cur.execute("SELECT id, name FROM bible_books WHERE name IN ({})".format(
            ",".join(["%s"] * len(books_in_input))
        ), list(books_in_input))
        book_rows = cur.fetchall()

    mapping = {row["name"]: int(row["id"]) for row in book_rows}
    missing = books_in_input - set(mapping.keys())
    if missing:
        raise RuntimeError(f"Unable to resolve book IDs for: {', '.join(sorted(missing))}")
    return mapping


def upsert_verses(conn: Any, rows: list[dict[str, Any]], book_ids: dict[str, int], batch_size: int) -> int:
    inserted = 0
    sql = """
        INSERT INTO bible_verses (book_id, chapter, verse, text)
        VALUES (%s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE text = VALUES(text)
    """

    prepared = [
        (book_ids[r["book"]], int(r["chapter"]), int(r["verse"]), r["text"])
        for r in rows
    ]

    with conn.cursor() as cur:
        for batch in chunked(prepared, batch_size):
            cur.executemany(sql, batch)
            inserted += len(batch)

    return inserted


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Load normalized Bible rows into MySQL.")
    parser.add_argument("--input", required=True, help="Path to normalized .jsonl or .csv")
    parser.add_argument(
        "--book-map",
        default="scripts/bible-import/book-map.json",
        help="Path to book-map.json",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=500,
        help="Verse upsert batch size (default: 500)",
    )
    return parser


def main() -> int:
    parser = build_arg_parser()
    args = parser.parse_args()

    input_path = Path(args.input)
    book_map_path = Path(args.book_map)
    if not input_path.exists():
        parser.error(f"Input file does not exist: {input_path}")
    if not book_map_path.exists():
        parser.error(f"Book map does not exist: {book_map_path}")

    rows = [normalize_row(r) for r in read_rows(input_path)]
    if not rows:
        raise SystemExit("Input contains no rows; nothing to load.")

    book_map = load_book_map(book_map_path)
    books_in_input = {r["book"] for r in rows}

    conn = connect_mysql()
    try:
        with conn.cursor() as cur:
            cur.execute("START TRANSACTION")

        book_ids = upsert_books(conn, book_map, books_in_input)
        processed = upsert_verses(conn, rows, book_ids, args.batch_size)

        conn.commit()
        print(f"Committed {processed} verse row(s) across {len(book_ids)} book(s).")
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
