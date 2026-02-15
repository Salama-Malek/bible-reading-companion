# API Specification v1

Status: contract-first specification for implementation. This document is the **single source of truth** for backend, mobile, and admin integrations.

## 1) Global Conventions

### Base URL

- Production: `https://<your-domain>/api/v1`
- Staging (example): `https://staging.<your-domain>/api/v1`

### Headers

Required for JSON endpoints:

```http
Content-Type: application/json
```

Required for authenticated endpoints:

```http
Authorization: Bearer <token>
```

### Date and Time Rules

- Date format: `YYYY-MM-DD`
- Date-time format: ISO 8601 UTC (e.g. `2026-01-15T07:30:00Z`)
- Timezone used to compute **today**: `Europe/Riga`

### Pagination (list endpoints)

List endpoints support query params:

- `page` (optional, default `1`, min `1`)
- `pageSize` (optional, default `20`, min `1`, max `100`)

Paginated response metadata format:

```json
{
  "page": 1,
  "pageSize": 20,
  "totalItems": 125,
  "totalPages": 7
}
```

### Standard Success Envelope

```json
{
  "ok": true,
  "data": {}
}
```

### Standard Error Format

All endpoints use this error envelope:

```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed.",
    "details": [
      {
        "field": "email",
        "issue": "Must be a valid email address"
      }
    ]
  }
}
```

Common error codes:

- `VALIDATION_ERROR` → `400`
- `EMAIL_TAKEN` → `409`
- `INVALID_CREDENTIALS` → `401`
- `UNAUTHORIZED` → `401`
- `FORBIDDEN` → `403`
- `NOT_FOUND` → `404`
- `CONFLICT` → `409`
- `DUPLICATE_DATE` → `409`
- `PLAN_NOT_FOUND` → `404`
- `RATE_LIMITED` → `429`
- `INTERNAL_ERROR` → `500`

---

## 2) Endpoint Contracts

## AUTH

### `POST /auth/register`

- **Purpose:** Register a new user account.
- **Auth required?** No.
- **Request JSON:**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "StrongPass123!"
}
```

- **Response JSON (success `201 Created`):**

```json
{
  "ok": true,
  "data": {
    "user": {
      "id": 101,
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user"
    },
    "token": "<jwt_access_token>"
  }
}
```

- **Error format (standard):** Uses global standard error envelope.
- **Status codes:** `201`, `400`, `409` (`EMAIL_TAKEN`), `500`.

### `POST /auth/login`

- **Purpose:** Authenticate user and return access token.
- **Auth required?** No.
- **Request JSON:**

```json
{
  "email": "john@example.com",
  "password": "StrongPass123!"
}
```

- **Response JSON (success `200 OK`):**

```json
{
  "ok": true,
  "data": {
    "user": {
      "id": 101,
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user"
    },
    "token": "<jwt_access_token>"
  }
}
```

- **Error format (standard):** Uses global standard error envelope.
- **Status codes:** `200`, `400`, `401` (`INVALID_CREDENTIALS`), `500`.

### `GET /auth/me`

- **Purpose:** Return profile of currently authenticated user.
- **Auth required?** Yes.
- **Request JSON:** None.
- **Response JSON (success `200 OK`):**

```json
{
  "ok": true,
  "data": {
    "user": {
      "id": 101,
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user"
    }
  }
}
```

- **Error format (standard):** Uses global standard error envelope.
- **Status codes:** `200`, `401`, `500`.

## PLANS (user)

### `GET /plans/today`

- **Purpose:** Return today’s reading plan (based on `Europe/Riga`).
- **Auth required?** No (optional for now).
- **Request JSON:** None.
- **Response JSON (success `200 OK`):**

```json
{
  "ok": true,
  "data": {
    "plan": {
      "id": 450,
      "date": "2026-01-15",
      "testament": "new",
      "book": "Matthew",
      "chapter": 5,
      "created_at": "2026-01-01T00:00:00Z"
    }
  }
}
```

If no plan exists for today, `plan` is `null`.

- **Error format (standard):** Uses global standard error envelope.
- **Status codes:** `200`, `500`.

### `GET /plans?from=YYYY-MM-DD&to=YYYY-MM-DD`

- **Purpose:** Return reading plans in a date range.
- **Auth required?** No (optional for now).
- **Request JSON:** None (query params only).
- **Response JSON (success `200 OK`):**

```json
{
  "ok": true,
  "data": {
    "plans": [
      {
        "id": 436,
        "date": "2026-01-01",
        "testament": "new",
        "book": "Matthew",
        "chapter": 1,
        "created_at": "2026-01-01T00:00:00Z"
      },
      {
        "id": 437,
        "date": "2026-01-02",
        "testament": "new",
        "book": "Matthew",
        "chapter": 2,
        "created_at": "2026-01-01T00:00:00Z"
      }
    ]
  }
}
```

- **Error format (standard):** Uses global standard error envelope.
- **Status codes:** `200`, `400`, `500`.

## READING (user)

### `POST /reading/complete`

- **Purpose:** Mark the reading plan for a specific date as completed for current user.
- **Auth required?** Yes.
- **Request JSON:**

```json
{
  "date": "2026-01-15",
  "method": "physical"
}
```

- `method` must be one of: `physical`, `digital`.
- `date` is interpreted as the `reading_plan.date` value (date-only, no timezone conversion in this endpoint).

- **Response JSON (success `200 OK`):**

```json
{
  "ok": true,
  "data": {
    "record": {
      "id": 9001,
      "user_id": 101,
      "plan_id": 450,
      "method": "physical",
      "completed_at": "2026-01-15T19:14:22Z"
    }
  }
}
```

- If a completion already exists for `(user_id, plan_id)`, endpoint is idempotent and returns existing record.
- If no plan exists for the provided date, returns `PLAN_NOT_FOUND`.
- **Error format (standard):** Uses global standard error envelope.
- **Status codes:** `200`, `400`, `401`, `404` (`PLAN_NOT_FOUND`), `500`.

### `GET /reading/history?from=YYYY-MM-DD&to=YYYY-MM-DD`

- **Purpose:** Return plans and current user completion data in date range, plus streak summary.
- **Auth required?** Yes.
- **Request JSON:** None (query params only).
- **Response JSON (success `200 OK`):**

```json
{
  "ok": true,
  "data": {
    "plans": [
      {
        "id": 436,
        "date": "2026-01-01",
        "testament": "new",
        "book": "Matthew",
        "chapter": 1,
        "created_at": "2026-01-01T00:00:00Z"
      }
    ],
    "records": [
      {
        "id": 9001,
        "user_id": 101,
        "plan_id": 436,
        "method": "digital",
        "completed_at": "2026-01-01T06:21:00Z",
        "date": "2026-01-01"
      }
    ],
    "missedDates": [
      "2026-01-02"
    ],
    "summary": {
      "completedCount": 1,
      "missedCount": 1,
      "currentStreak": 0,
      "longestStreak": 1
    }
  }
}
```

- **Error format (standard):** Uses global standard error envelope.
- **Status codes:** `200`, `400`, `401`, `500`.

## SAVED VERSES (user)

### `POST /verses`

- **Purpose:** Save a verse reference/note for current user.
- **Auth required?** Yes.
- **Request JSON:**

```json
{
  "date": "2026-01-15",
  "referenceText": "Matthew 1:1-5",
  "note": "Encouragement for today"
}
```

- `date` is optional. When present, API tries to resolve `plan_id` from `reading_plan.date`; if not found, save still succeeds with `plan_id = null`.
- **Response JSON (success `201 Created`):**

```json
{
  "ok": true,
  "data": {
    "verse": {
      "id": 301,
      "user_id": 101,
      "plan_id": 450,
      "reference_text": "Matthew 1:1-5",
      "note": "Encouragement for today",
      "created_at": "2026-01-15T19:20:00Z"
    }
  }
}
```

- **Validation:** `referenceText` required, max length `100`; `note` optional.
- **Error format (standard):** Uses global standard error envelope.
- **Status codes:** `201`, `400`, `401`, `500`.

### `GET /verses?page=1&pageSize=20`

- **Purpose:** Return saved verses for current user.
- **Auth required?** Yes.
- **Request JSON:** None.
- **Response JSON (success `200 OK`):**

```json
{
  "ok": true,
  "data": {
    "items": [
      {
        "id": 301,
        "user_id": 101,
        "plan_id": 450,
        "reference_text": "Matthew 1:1-5",
        "note": "Encouragement for today",
        "created_at": "2026-01-15T19:20:00Z"
      }
    ],
    "page": 1,
    "pageSize": 20,
    "total": 1
  }
}
```

- **Error format (standard):** Uses global standard error envelope.
- **Status codes:** `200`, `400`, `401`, `500`.

### `DELETE /verses/:id`

- **Purpose:** Delete a saved verse belonging to current user.
- **Auth required?** Yes.
- **Request JSON:** None.
- **Response JSON (success `200 OK`):**

```json
{
  "ok": true,
  "data": {
    "deleted": true
  }
}
```

- If record is missing or owned by another user, API returns `NOT_FOUND`.
- **Error format (standard):** Uses global standard error envelope.
- **Status codes:** `200`, `400`, `401`, `500`.

## DEVICES (user)

### `POST /devices/register`

- **Purpose:** Register/update device push token for current user.
- **Auth required?** Yes.
- **Request JSON:**

```json
{
  "platform": "ios",
  "pushToken": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
}
```

- `platform` must be one of `android`, `ios`, `web`.
- `pushToken` is required and max length is 255 characters.
- Existing `pushToken` rows are reassigned to the current user and platform (upsert).

- **Response JSON (success `200 OK`):**

```json
{
  "ok": true,
  "data": {
    "registered": true
  }
}
```

- **Error format (standard):** Uses global standard error envelope.
- **Status codes:** `200`, `400`, `401`, `500`.

### `POST /devices/unregister`

- **Purpose:** Unregister a device push token for current user.
- **Auth required?** Yes.
- **Request JSON:**

```json
{
  "pushToken": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
}
```

- **Response JSON (success `200 OK`):**

```json
{
  "ok": true,
  "data": {
    "unregistered": true
  }
}
```

- **Error format (standard):** Uses global standard error envelope.
- **Status codes:** `200`, `400`, `401`, `500`.

## ANNOUNCEMENTS (user)

### `GET /announcements?page=1&pageSize=20`

- **Purpose:** Return active announcements visible to current user.
- **Auth required?** Yes.
- **Request JSON:** None.
- **Response JSON (success `200 OK`):**

```json
{
  "ok": true,
  "data": {
    "items": [
      {
        "id": 801,
        "title": "Friday youth service",
        "message": "Join us at 19:00 in the main hall.",
        "startsAt": "2026-01-15T00:00:00Z",
        "endsAt": "2026-01-17T21:00:00Z",
        "createdAt": "2026-01-14T11:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "totalItems": 1,
      "totalPages": 1
    }
  }
}
```

- **Error format (standard):** Uses global standard error envelope.
- **Status codes:** `200`, `401`, `500`.

## ADMIN (admin only)

> All `/admin/*` endpoints require authenticated user with role `admin`.

### `GET /admin/analytics/today`

- **Purpose:** Return admin analytics snapshot for current day.
- **Auth required?** Yes (admin).
- **Request JSON:** None.
- **Response JSON (success `200 OK`):**

```json
{
  "ok": true,
  "data": {
    "date": "2026-01-15",
    "timezone": "Europe/Riga",
    "totalUsers": 220,
    "activeToday": 151,
    "missingToday": 69,
    "inactive7d": 28,
    "inactive14d": 14,
    "completionRateToday": 68.64
  }
}
```

- **Error format (standard):** Uses global standard error envelope.
- **Status codes:** `200`, `401`, `403`, `500`.

### `GET /admin/users?status=active|missing_today|inactive_7d|inactive_14d&page=1&pageSize=20`

- **Purpose:** List users by activity segment.
- **Auth required?** Yes (admin).
- **Request JSON:** None (query params only).
- **Response JSON (success `200 OK`):**

```json
{
  "ok": true,
  "data": {
    "status": "missing_today",
    "items": [
      {
        "id": 101,
        "name": "John Doe",
        "email": "john@example.com",
        "lastCompletedDate": "2026-01-14",
        "lastCompletedAt": "2026-01-14T06:10:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "totalItems": 69,
      "totalPages": 4
    }
  }
}
```

- **Error format (standard):** Uses global standard error envelope.
- **Status codes:** `200`, `400`, `401`, `403`, `500`.

### `POST /admin/plans`

- **Purpose:** Create a single reading plan item.
- **Auth required?** Yes (admin).
- **Request JSON:**

```json
{
  "date": "2026-01-20",
  "book": "Matthew",
  "chapter": 10,
  "verses": "1-20",
  "title": "Jesus sends the twelve",
  "notes": "Optional note"
}
```

- **Response JSON (success `201 Created`):**

```json
{
  "ok": true,
  "data": {
    "plan": {
      "id": 500,
      "date": "2026-01-20",
      "book": "Matthew",
      "chapter": 10,
      "verses": "1-20",
      "title": "Jesus sends the twelve",
      "notes": "Optional note",
      "createdAt": "2026-01-15T19:40:00Z"
    }
  }
}
```

- **Error format (standard):** Uses global standard error envelope.
- **Status codes:** `201`, `400`, `401`, `403`, `409`, `500`.

### `GET /admin/plans?from=YYYY-MM-DD&to=YYYY-MM-DD&page=1&pageSize=20`

- **Purpose:** List reading plans in date range.
- **Auth required?** Yes (admin).
- **Request JSON:** None (query params only).
- **Response JSON (success `200 OK`):**

```json
{
  "ok": true,
  "data": {
    "from": "2026-01-01",
    "to": "2026-01-31",
    "items": [
      {
        "id": 436,
        "date": "2026-01-01",
        "book": "Matthew",
        "chapter": 1,
        "verses": "1-25",
        "title": "Genealogy and birth",
        "notes": null
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "totalItems": 31,
      "totalPages": 2
    }
  }
}
```

- **Error format (standard):** Uses global standard error envelope.
- **Status codes:** `200`, `400`, `401`, `403`, `500`.

### `PUT /admin/plans/:id`

- **Purpose:** Update an existing reading plan.
- **Auth required?** Yes (admin).
- **Request JSON:**

```json
{
  "date": "2026-01-20",
  "book": "Matthew",
  "chapter": 10,
  "verses": "1-24",
  "title": "Jesus sends the twelve (updated)",
  "notes": "Expanded verse range"
}
```

- **Response JSON (success `200 OK`):**

```json
{
  "ok": true,
  "data": {
    "plan": {
      "id": 500,
      "date": "2026-01-20",
      "book": "Matthew",
      "chapter": 10,
      "verses": "1-24",
      "title": "Jesus sends the twelve (updated)",
      "notes": "Expanded verse range",
      "updatedAt": "2026-01-15T19:44:00Z"
    }
  }
}
```

- **Error format (standard):** Uses global standard error envelope.
- **Status codes:** `200`, `400`, `401`, `403`, `404`, `409`, `500`.

### `DELETE /admin/plans/:id`

- **Purpose:** Delete a reading plan by ID.
- **Auth required?** Yes (admin).
- **Request JSON:** None.
- **Response JSON (success `200 OK`):**

```json
{
  "ok": true,
  "data": {
    "deleted": true,
    "id": 500
  }
}
```

- **Error format (standard):** Uses global standard error envelope.
- **Status codes:** `200`, `401`, `403`, `404`, `500`.

### `POST /admin/plans/bulk-import`

- **Purpose:** Bulk create/update plans from payload (idempotent by `date`).
- **Auth required?** Yes (admin).
- **Request JSON:**

```json
{
  "items": [
    {
      "date": "2026-02-01",
      "book": "Matthew",
      "chapter": 21,
      "verses": "1-22",
      "title": "Triumphal entry",
      "notes": null
    },
    {
      "date": "2026-02-02",
      "book": "Matthew",
      "chapter": 22,
      "verses": "1-22",
      "title": "Parables and questions",
      "notes": null
    }
  ]
}
```

- **Response JSON (success `200 OK`):**

```json
{
  "ok": true,
  "data": {
    "created": 2,
    "updated": 0,
    "failed": 0,
    "errors": []
  }
}
```

- **Error format (standard):** Uses global standard error envelope.
- **Status codes:** `200`, `400`, `401`, `403`, `500`.

### `POST /admin/announcements`

- **Purpose:** Create an announcement.
- **Auth required?** Yes (admin).
- **Request JSON:**

```json
{
  "title": "Friday youth service",
  "message": "Join us at 19:00 in the main hall.",
  "startsAt": "2026-01-15T00:00:00Z",
  "endsAt": "2026-01-17T21:00:00Z"
}
```

- **Response JSON (success `201 Created`):**

```json
{
  "ok": true,
  "data": {
    "announcement": {
      "id": 801,
      "title": "Friday youth service",
      "message": "Join us at 19:00 in the main hall.",
      "startsAt": "2026-01-15T00:00:00Z",
      "endsAt": "2026-01-17T21:00:00Z",
      "createdAt": "2026-01-14T11:00:00Z"
    }
  }
}
```

- **Error format (standard):** Uses global standard error envelope.
- **Status codes:** `201`, `400`, `401`, `403`, `500`.

---

## 3) Data Contracts

### `UserProfile`

```json
{
  "id": 101,
  "name": "John Doe",
  "email": "john@example.com",
  "role": "user",
  "createdAt": "2026-01-15T07:30:00Z"
}
```

### `ReadingPlan`

```json
{
  "id": 450,
  "date": "2026-01-15",
  "book": "Matthew",
  "chapter": 5,
  "verses": "1-16",
  "title": "Sermon on the Mount (Part 1)",
  "notes": null
}
```

### `ReadingRecord`

```json
{
  "id": 9001,
  "userId": 101,
  "planId": 450,
  "date": "2026-01-15",
  "completed": true,
  "completedAt": "2026-01-15T19:14:22Z"
}
```

### `SavedVerse`

```json
{
  "id": 301,
  "user_id": 101,
  "plan_id": 450,
  "reference_text": "Matthew 1:1-5",
  "note": "Encouragement for today",
  "created_at": "2026-01-15T19:20:00Z"
}
```

### `Announcement`

```json
{
  "id": 801,
  "title": "Friday youth service",
  "message": "Join us at 19:00 in the main hall.",
  "startsAt": "2026-01-15T00:00:00Z",
  "endsAt": "2026-01-17T21:00:00Z",
  "createdAt": "2026-01-14T11:00:00Z"
}
```

### `AnalyticsToday`

```json
{
  "date": "2026-01-15",
  "timezone": "Europe/Riga",
  "totalUsers": 220,
  "activeToday": 151,
  "missingToday": 69,
  "inactive7d": 28,
  "inactive14d": 14,
  "completionRateToday": 68.64
}
```

## ADMIN PLANS (admin)

All `/admin/*` endpoints require a valid JWT and `role=admin`.

### `POST /admin/plans`

- **Purpose:** Create a single reading plan entry.
- **Auth required?** Yes (`admin` only).
- **Request JSON:**

```json
{
  "date": "2026-01-15",
  "testament": "new",
  "book": "Matthew",
  "chapter": 5
}
```

- **Status codes:** `201`, `400`, `401`, `403`, `409` (`DUPLICATE_DATE`), `500`.

### `GET /admin/plans?from=YYYY-MM-DD&to=YYYY-MM-DD`

- **Purpose:** List plans in date range ordered ascending by date.
- **Auth required?** Yes (`admin` only).
- **Status codes:** `200`, `400`, `401`, `403`, `500`.

### `PUT /admin/plans/:id`

- **Purpose:** Update plan by id.
- **Auth required?** Yes (`admin` only).
- **Status codes:** `200`, `400`, `401`, `403`, `404`, `409` (`DUPLICATE_DATE`), `500`.

### `DELETE /admin/plans/:id`

- **Purpose:** Delete plan by id.
- **Auth required?** Yes (`admin` only).
- **Status codes:** `200`, `400`, `401`, `403`, `404`, `500`.

### `POST /admin/plans/bulk-import`

- **Purpose:** Bulk upsert plans by date in one DB transaction.
- **Auth required?** Yes (`admin` only).
- **Request JSON:**

```json
{
  "entries": [
    {
      "date": "2026-01-15",
      "testament": "new",
      "book": "Matthew",
      "chapter": 5
    }
  ]
}
```

- **Response summary fields:** `insertedCount`, `updatedCount`, `failedCount`, `failures`.
- **Validation per entry:** date valid, testament in `old|new`, non-empty book, positive integer chapter.
- **Status codes:** `200`, `400`, `401`, `403`, `500`.
