#!/usr/bin/env bash
set -euo pipefail

: "${API_BASE_URL:?Set API_BASE_URL, e.g. https://example.com/api}"
: "${CRON_SECRET:?Set CRON_SECRET}"

curl -sS -X POST "${API_BASE_URL%/}/admin/notifications/send-today" \
  -H "X-CRON-SECRET: ${CRON_SECRET}" \
  -H "Content-Type: application/json"

echo
