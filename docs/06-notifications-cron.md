# Daily notifications cron (MVP)

## How it works

The API exposes a cron-safe endpoint:

- `POST /api/admin/notifications/send-today`
- Security header required: `X-CRON-SECRET: <CRON_SECRET>`

When triggered, it:

1. Calculates "today" in `Europe/Riga` timezone.
2. Looks up today's row in `reading_plan`.
3. If no plan exists, returns `ok: true` with `sentCount: 0` and logs the run.
4. Selects users who:
   - have at least one token in `user_devices`
   - do **not** have a `reading_records` entry for today's plan
5. Uses the MVP notification provider (`LogNotificationProvider`) which does not call Expo/FCM.
6. Persists one run row to `notifications_log`.

## Environment setup

In `services/api/.env` add:

```env
CRON_SECRET=replace_with_a_long_random_secret
```

Use a long, unguessable secret (for example 32+ random chars).

## Hostinger cron setup

Use Hostinger's Cron Jobs UI and run once daily at your chosen local time.

Example command:

```bash
curl -X POST https://YOUR_DOMAIN/api/admin/notifications/send-today -H "X-CRON-SECRET: YOUR_SECRET"
```

Suggested schedule:

- Frequency: daily
- Time: pick one time in the morning (for example 08:00 Europe/Riga)

## Local/manual run examples

```bash
curl -X POST http://127.0.0.1:8080/api/admin/notifications/send-today -H "X-CRON-SECRET: replace_with_a_long_random_secret"
```

Or use the helper script:

```bash
API_BASE_URL=http://127.0.0.1:8080/api CRON_SECRET=replace_with_a_long_random_secret ./infra/cron/curl_send_today.sh
```

## Upgrade path (later)

For MVP the provider only logs counts and payload metadata.

To upgrade later:

1. Add an `ExpoNotificationProvider` (or FCM provider) implementing `NotificationProvider::send()`.
2. Wire it into `AdminNotificationsController` (instead of `LogNotificationProvider`).
3. Configure real push credentials in environment variables.
4. Keep `notifications_log` as an audit trail for each cron run.
