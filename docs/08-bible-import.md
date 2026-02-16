# 08. Bible TXT import

This document describes how to import Bible text from TXT into MySQL tables:

- `bible_books`
- `bible_verses`

Scripts live in `scripts/bible-import/`.

## 1) Input format and parser behavior

The importer pipeline expects one verse per source line and normalizes each row to:

- `book`
- `chapter`
- `verse`
- `text`

### Default supported format

```txt
Matthew 1:1 In the beginning...
Matthew 1:2 ...
```

Default parser regex in `parse.py`:

```regex
^(?P<book>[1-3]?\s?[A-Za-z ]+?)\s+(?P<chapter>\d+):(?P<verse>\d+)\s+(?P<text>.+)$
```

This supports common inputs such as:

- `Matthew 1:1 ...`
- `1 John 2:3 ...`

### Alternative format examples

If source format differs, pass a custom regex via `--line-regex`.

Example source:

```txt
Matthew 1:1 - In the beginning...
```

Command:

```bash
python3 scripts/bible-import/parse.py \
  --input samples/bible_txt_sample.txt \
  --output /tmp/bible.jsonl \
  --line-regex '^(?P<book>[1-3]?\s?[A-Za-z ]+?)\s+(?P<chapter>\d+):(?P<verse>\d+)\s+-\s+(?P<text>.+)$'
```

## 2) Book mapping and testament

Loader upserts `bible_books` first using `book-map.json`.

File: `scripts/bible-import/book-map.json`

```json
{
  "Matthew": {
    "testament": "new",
    "sort_order": 40,
    "display_name": "Matthew"
  }
}
```

### Mapping rules

- Keys must match parsed `book` text exactly.
- `testament` must be `old` or `new`.
- `sort_order` should follow canonical order.
- Add every book present in parsed input; loader fails fast for missing mappings.

## 3) Run parse + load

### Step A: Parse TXT to JSONL

```bash
python3 scripts/bible-import/parse.py \
  --input samples/bible_txt_sample.txt \
  --output /tmp/bible.jsonl \
  --format jsonl \
  --strict
```

### Step B: Load JSONL into MySQL

Set env vars:

```bash
export DB_HOST=127.0.0.1
export DB_PORT=3306
export DB_NAME=bible_reading_companion
export DB_USER=root
export DB_PASS=secret
```

Run loader:

```bash
python3 scripts/bible-import/load-mysql.py \
  --input /tmp/bible.jsonl \
  --book-map scripts/bible-import/book-map.json \
  --batch-size 500
```

## 4) Loader behavior

- Uses one transaction for book + verse upserts.
- Upserts books by unique `bible_books.name`.
- Upserts verses by unique `(book_id, chapter, verse)`.
- Uses batch `executemany` for verses (`--batch-size`, default `500`).

## 5) Troubleshooting

- **`Missing dependency 'pymysql'`**
  - Install dependency: `python3 -m pip install pymysql`
- **Missing DB env variables**
  - Ensure all are set: `DB_HOST DB_PORT DB_NAME DB_USER DB_PASS`
- **Book missing in map**
  - Add the book key to `scripts/bible-import/book-map.json`
- **Unparsed lines**
  - Re-run parser with `--print-errors`
  - Adjust `--line-regex` to fit source format
- **Strict mode failures**
  - Remove/clean malformed lines or update regex
