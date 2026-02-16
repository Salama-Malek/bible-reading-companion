# Bible TXT import scripts

This folder contains a 2-step import pipeline:

1. `parse.py` converts source TXT into normalized rows (`book, chapter, verse, text`) in `.jsonl` or `.csv`.
2. `load-mysql.py` loads normalized rows into MySQL tables `bible_books` and `bible_verses` with upserts.

## Supported input format

Default parser format expects one verse per line:

```txt
Matthew 1:1 In the beginning...
Matthew 1:2 ...
```

Default regex:

```regex
^(?P<book>[1-3]?\s?[A-Za-z ]+?)\s+(?P<chapter>\d+):(?P<verse>\d+)\s+(?P<text>.+)$
```

Named groups must include:

- `book`
- `chapter`
- `verse`
- `text`

### Adapting to other TXT formats

Use `--line-regex` to match your input structure.

Example (dash separator):

```txt
Matthew 1:1 - In the beginning...
```

```bash
python3 scripts/bible-import/parse.py \
  --input samples/bible_txt_sample.txt \
  --output /tmp/bible.jsonl \
  --line-regex '^(?P<book>[1-3]?\s?[A-Za-z ]+?)\s+(?P<chapter>\d+):(?P<verse>\d+)\s+-\s+(?P<text>.+)$'
```

## Parse command

```bash
python3 scripts/bible-import/parse.py \
  --input samples/bible_txt_sample.txt \
  --output /tmp/bible.jsonl \
  --format jsonl \
  --strict
```

## Load command

Set DB environment variables:

- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASS`

Then run:

```bash
python3 scripts/bible-import/load-mysql.py \
  --input /tmp/bible.jsonl \
  --book-map scripts/bible-import/book-map.json \
  --batch-size 500
```

## Book mapping

`book-map.json` controls book metadata for `bible_books` upserts:

```json
{
  "Matthew": {
    "testament": "new",
    "sort_order": 40,
    "display_name": "Matthew"
  }
}
```

Add all books that appear in the parsed input before running `load-mysql.py`.

## Notes

- Duplicate verses are upserted by unique key `(book_id, chapter, verse)`.
- Verse text is replaced on duplicates (`ON DUPLICATE KEY UPDATE text = VALUES(text)`).
- Loader uses a transaction and batch upserts (`--batch-size`, default `500`).
