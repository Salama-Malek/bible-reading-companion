# API Specification v1 (Draft)

Status: contract-first draft for MVP. Endpoints are documented for implementation planning; behavior may be refined during build.

## Base Information

- Base URL (production): `https://<your-domain>/api/v1`
- Content type: `application/json`
- Timezone: `Europe/Amsterdam`
- Date format: `YYYY-MM-DD`
- Date-time format: ISO 8601 UTC, example `2026-01-15T07:30:00Z`

---

## Authentication

### Header Format (Bearer Token)

Authenticated endpoints require:

```http
Authorization: Bearer <access_token>
```

Example:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

If missing/invalid/expired, return `401 Unauthorized`.

---

## Standard Response Envelope

### Success

```json
{
  "ok": true,
  "data": {}
}
```

### Error Format

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

- `VALIDATION_ERROR` (400)
- `UNAUTHORIZED` (401)
- `FORBIDDEN` (403)
- `NOT_FOUND` (404)
- `CONFLICT` (409)
- `RATE_LIMITED` (429)
- `INTERNAL_ERROR` (500)

---

## User Authentication

### `POST /auth/register`

Create a user account.

Auth: Public

Request body:

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "StrongPass123!"
}
```

Success `201 Created`:

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

Possible errors:

- `400 VALIDATION_ERROR`
- `409 CONFLICT` (email already exists)

---

### `POST /auth/login`

Authenticate user and return access token.

Auth: Public

Request body:

```json
{
  "email": "john@example.com",
  "password": "StrongPass123!"
}
```

Success `200 OK`:

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

Possible errors:

- `400 VALIDATION_ERROR`
- `401 UNAUTHORIZED` (invalid credentials)

---

## Reading Plans

### `GET /plans/today`

Get today’s assigned reading plan for authenticated user.

Auth: User/Admin

Success `200 OK`:

```json
{
  "ok": true,
  "data": {
    "date": "2026-01-15",
    "plan": {
      "id": 450,
      "book": "Matthew",
      "chapter": 5,
      "title": "Sermon on the Mount (Part 1)"
    },
    "completion": {
      "completed": false,
      "completedAt": null
    }
  }
}
```

Possible errors:

- `401 UNAUTHORIZED`
- `404 NOT_FOUND` (no plan assigned for today)

---

### `GET /plans?from=YYYY-MM-DD&to=YYYY-MM-DD`

Get plans in date range.

Auth: User/Admin

Query params:

- `from` (required)
- `to` (required)

Success `200 OK`:

```json
{
  "ok": true,
  "data": {
    "from": "2026-01-01",
    "to": "2026-01-07",
    "items": [
      {
        "date": "2026-01-01",
        "planId": 436,
        "book": "Matthew",
        "chapter": 1,
        "title": "Genealogy and birth"
      },
      {
        "date": "2026-01-02",
        "planId": 437,
        "book": "Matthew",
        "chapter": 2,
        "title": "Visit of the Magi"
      }
    ]
  }
}
```

Possible errors:

- `400 VALIDATION_ERROR` (invalid/missing date params)
- `401 UNAUTHORIZED`

---

## Reading Completion & History

### `POST /reading/complete`

Mark reading as completed for a specific date (max one completion per user/day).

Auth: User/Admin

Request body:

```json
{
  "date": "2026-01-15",
  "method": "physical"
}
```

`method` allowed values: `physical`, `digital`

Success `201 Created`:

```json
{
  "ok": true,
  "data": {
    "completionId": 3001,
    "date": "2026-01-15",
    "method": "physical",
    "completedAt": "2026-01-15T07:28:00Z"
  }
}
```

Possible errors:

- `400 VALIDATION_ERROR`
- `401 UNAUTHORIZED`
- `409 CONFLICT` (already completed for date)

---

### `GET /reading/history?from=YYYY-MM-DD&to=YYYY-MM-DD`

Return completion history and summary in date range.

Auth: User/Admin

Success `200 OK`:

```json
{
  "ok": true,
  "data": {
    "from": "2026-01-01",
    "to": "2026-01-15",
    "summary": {
      "completedDays": 12,
      "missedDays": 3,
      "currentStreak": 5,
      "longestStreak": 9
    },
    "items": [
      {
        "date": "2026-01-14",
        "status": "completed",
        "method": "digital",
        "completedAt": "2026-01-14T06:42:00Z"
      },
      {
        "date": "2026-01-15",
        "status": "missed",
        "method": null,
        "completedAt": null
      }
    ]
  }
}
```

Possible errors:

- `400 VALIDATION_ERROR`
- `401 UNAUTHORIZED`

---

## Saved Verses

### `POST /verses/save`

Save a verse reference with optional note.

Auth: User/Admin

Request body:

```json
{
  "book": "John",
  "chapter": 3,
  "verse": 16,
  "note": "God's love and salvation"
}
```

Success `201 Created`:

```json
{
  "ok": true,
  "data": {
    "id": 9001,
    "book": "John",
    "chapter": 3,
    "verse": 16,
    "note": "God's love and salvation",
    "createdAt": "2026-01-15T08:12:00Z"
  }
}
```

Possible errors:

- `400 VALIDATION_ERROR`
- `401 UNAUTHORIZED`

---

### `GET /verses`

Get authenticated user’s saved verses.

Auth: User/Admin

Optional query params:

- `page` (default `1`)
- `limit` (default `20`, max `100`)

Success `200 OK`:

```json
{
  "ok": true,
  "data": {
    "items": [
      {
        "id": 9001,
        "book": "John",
        "chapter": 3,
        "verse": 16,
        "note": "God's love and salvation",
        "createdAt": "2026-01-15T08:12:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1
    }
  }
}
```

Possible errors:

- `401 UNAUTHORIZED`

---

### `DELETE /verses/:id`

Delete a saved verse by id (owned by authenticated user).

Auth: User/Admin

Success `200 OK`:

```json
{
  "ok": true,
  "data": {
    "deleted": true
  }
}
```

Possible errors:

- `401 UNAUTHORIZED`
- `404 NOT_FOUND` (verse not found or not owned by user)

---

## Device Registration

### `POST /devices/register`

Register or refresh mobile push device token.

Auth: User/Admin

Request body:

```json
{
  "platform": "ios",
  "deviceToken": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "appVersion": "1.0.0"
}
```

`platform` allowed values: `ios`, `android`, `web`

Success `200 OK`:

```json
{
  "ok": true,
  "data": {
    "registered": true,
    "deviceId": 77
  }
}
```

Possible errors:

- `400 VALIDATION_ERROR`
- `401 UNAUTHORIZED`

---

## Admin Endpoints

All `/admin/*` endpoints require role `admin`.

### `POST /admin/plans` (Create)

Create a plan entry for a date.

Auth: Admin

Request body:

```json
{
  "date": "2026-01-20",
  "book": "Matthew",
  "chapter": 10,
  "title": "Jesus sends the twelve"
}
```

Success `201 Created`:

```json
{
  "ok": true,
  "data": {
    "id": 460,
    "date": "2026-01-20",
    "book": "Matthew",
    "chapter": 10,
    "title": "Jesus sends the twelve"
  }
}
```

### Additional CRUD routes for plans

- `GET /admin/plans?from=YYYY-MM-DD&to=YYYY-MM-DD` (List)
- `GET /admin/plans/:id` (Get one)
- `PUT /admin/plans/:id` (Update)
- `DELETE /admin/plans/:id` (Delete)

CRUD errors:

- `400 VALIDATION_ERROR`
- `401 UNAUTHORIZED`
- `403 FORBIDDEN`
- `404 NOT_FOUND`
- `409 CONFLICT` (duplicate date)

---

### `GET /admin/analytics/today`

Get today’s dashboard metrics.

Auth: Admin

Success `200 OK`:

```json
{
  "ok": true,
  "data": {
    "date": "2026-01-15",
    "totals": {
      "users": 120,
      "completedToday": 84,
      "missingToday": 36,
      "completionRate": 0.7
    },
    "streakLeaders": [
      {
        "userId": 101,
        "name": "John Doe",
        "streak": 15
      }
    ],
    "inactiveUsers": [
      {
        "userId": 205,
        "name": "Jane Smith",
        "daysInactive": 8
      }
    ]
  }
}
```

Possible errors:

- `401 UNAUTHORIZED`
- `403 FORBIDDEN`

---

### `POST /admin/announcements`

Create announcement visible to users.

Auth: Admin

Request body:

```json
{
  "title": "Youth Retreat Reminder",
  "body": "Bring your Bible and notebook this Friday.",
  "publishAt": "2026-01-16T09:00:00Z"
}
```

Success `201 Created`:

```json
{
  "ok": true,
  "data": {
    "id": 501,
    "title": "Youth Retreat Reminder",
    "body": "Bring your Bible and notebook this Friday.",
    "publishAt": "2026-01-16T09:00:00Z",
    "createdAt": "2026-01-15T08:30:00Z"
  }
}
```

Possible errors:

- `400 VALIDATION_ERROR`
- `401 UNAUTHORIZED`
- `403 FORBIDDEN`

---

## Announcements

### `GET /announcements`

Get published announcements for authenticated user.

Auth: User/Admin

Optional query params:

- `page` (default `1`)
- `limit` (default `20`)

Success `200 OK`:

```json
{
  "ok": true,
  "data": {
    "items": [
      {
        "id": 501,
        "title": "Youth Retreat Reminder",
        "body": "Bring your Bible and notebook this Friday.",
        "publishAt": "2026-01-16T09:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1
    }
  }
}
```

Possible errors:

- `401 UNAUTHORIZED`

---

## Notes

- Endpoint list above defines the contract for MVP implementation.
- Authorization and validation behavior should be consistent with the standard error format.
- Versioning strategy: maintain compatibility within `/api/v1`; breaking changes go to `/api/v2`.
