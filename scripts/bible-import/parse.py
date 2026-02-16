#!/usr/bin/env python3
"""Parse Bible TXT files into normalized JSONL/CSV rows.

Normalized schema: book, chapter, verse, text.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
from pathlib import Path
from typing import Iterable


def parse_line_with_regex(line: str, regex: re.Pattern[str]) -> dict[str, object] | None:
    match = regex.match(line.strip())
    if not match:
        return None

    groups = match.groupdict()
    required = ("book", "chapter", "verse", "text")
    missing = [field for field in required if field not in groups or groups[field] is None]
    if missing:
        raise ValueError(f"Regex matched but missing named groups: {', '.join(missing)}")

    return {
        "book": groups["book"].strip(),
        "chapter": int(groups["chapter"]),
        "verse": int(groups["verse"]),
        "text": groups["text"].strip(),
    }


def parse_lines(lines: Iterable[str], regex: re.Pattern[str], skip_comments: bool = True) -> tuple[list[dict[str, object]], list[tuple[int, str]]]:
    rows: list[dict[str, object]] = []
    errors: list[tuple[int, str]] = []

    for idx, raw_line in enumerate(lines, start=1):
        line = raw_line.strip()
        if not line:
            continue
        if skip_comments and line.startswith("#"):
            continue

        parsed = parse_line_with_regex(line, regex)
        if parsed is None:
            errors.append((idx, raw_line.rstrip("\n")))
            continue

        rows.append(parsed)

    return rows, errors


def write_jsonl(rows: list[dict[str, object]], output_path: Path) -> None:
    with output_path.open("w", encoding="utf-8") as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")


def write_csv(rows: list[dict[str, object]], output_path: Path) -> None:
    with output_path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["book", "chapter", "verse", "text"])
        writer.writeheader()
        writer.writerows(rows)


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Parse Bible TXT to normalized JSONL/CSV.")
    parser.add_argument("--input", required=True, help="Input TXT file path")
    parser.add_argument("--output", required=True, help="Output file path")
    parser.add_argument(
        "--format",
        choices=("jsonl", "csv"),
        default="jsonl",
        help="Output format (default: jsonl)",
    )
    parser.add_argument(
        "--line-regex",
        default=r"^(?P<book>[1-3]?\s?[A-Za-z ]+?)\s+(?P<chapter>\d+):(?P<verse>\d+)\s+(?P<text>.+)$",
        help=(
            "Regex with named groups: book, chapter, verse, text. "
            "Default supports lines like 'Matthew 1:1 In the beginning...'"
        ),
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Fail if any non-empty line cannot be parsed",
    )
    parser.add_argument(
        "--print-errors",
        action="store_true",
        help="Print unparsed lines to stderr",
    )
    return parser


def main() -> int:
    parser = build_arg_parser()
    args = parser.parse_args()

    input_path = Path(args.input)
    output_path = Path(args.output)

    if not input_path.exists():
        parser.error(f"Input file does not exist: {input_path}")

    regex = re.compile(args.line_regex)
    rows, errors = parse_lines(input_path.read_text(encoding="utf-8").splitlines(), regex)

    if args.strict and errors:
        if args.print_errors:
            for line_no, line in errors:
                print(f"Unparsed line {line_no}: {line}")
        raise SystemExit(f"Failed in strict mode: {len(errors)} unparsed line(s)")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    if args.format == "jsonl":
        write_jsonl(rows, output_path)
    else:
        write_csv(rows, output_path)

    print(
        f"Parsed {len(rows)} rows from {input_path}. "
        f"Skipped {len(errors)} unparsed line(s). Output: {output_path}"
    )

    if args.print_errors and errors:
        for line_no, line in errors:
            print(f"Unparsed line {line_no}: {line}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
