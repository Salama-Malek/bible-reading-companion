# Data Model

This document describes the MySQL schema for the Bible Reading Companion backend.

## Tables

### `users`
Stores application users and authorization role.

| Column | Type | Notes |
|---|---|---|
| `id` | `BIGINT UNSIGNED` | Primary key, auto-increment. |
| `email` | `VARCHAR(255)` | Unique login identifier. |
| `password_hash` | `VARCHAR(255)` | Password hash (never plain text). |
| `role` | `VARCHAR(32)` | Role string (for example: `user`, `admin`). |
| `created_at` | `TIMESTAMP` | Record creation time. |

Indexes/constraints:
- `PRIMARY KEY (id)`
- `UNIQUE (email)`
- index on `created_at`

---

### `reading_plan`
Stores one daily reading assignment.

| Column | Type | Notes |
|---|---|---|
| `id` | `BIGINT UNSIGNED` | Primary key, auto-increment. |
| `date` | `DATE` | Reading date, unique per day. |
| `testament` | `VARCHAR(16)` | `OT` or `NT`. |
| `book` | `VARCHAR(64)` | Bible book name. |
| `chapter` | `INT UNSIGNED` | Chapter number. |
| `created_at` | `TIMESTAMP` | Record creation time. |

Indexes/constraints:
- `PRIMARY KEY (id)`
- `UNIQUE (date)` to enforce exactly one reading per day
- composite lookup index on `(date, testament, book, chapter)` for today-plan fetches

---

### `reading_records`
Tracks completion records for users against the daily plan.

| Column | Type | Notes |
|---|---|---|
| `id` | `BIGINT UNSIGNED` | Primary key, auto-increment. |
| `user_id` | `BIGINT UNSIGNED` | FK to `users.id`. |
| `plan_id` | `BIGINT UNSIGNED` | FK to `reading_plan.id`. |
| `method` | `VARCHAR(32)` | Completion method (e.g. `manual`, `voice`). |
| `completed_at` | `TIMESTAMP` | Completion timestamp. |

Indexes/constraints:
- `PRIMARY KEY (id)`
- `UNIQUE (user_id, plan_id)` so each user can complete each plan once
- index on `(user_id, completed_at)` for user reading history queries
- index on `plan_id`
- FKs:
  - `user_id -> users.id` (`ON DELETE CASCADE`)
  - `plan_id -> reading_plan.id` (`ON DELETE CASCADE`)

---

### `saved_verses`
Stores user-saved verse references and notes.

| Column | Type | Notes |
|---|---|---|
| `id` | `BIGINT UNSIGNED` | Primary key, auto-increment. |
| `user_id` | `BIGINT UNSIGNED` | FK to `users.id`. |
| `plan_id` | `BIGINT UNSIGNED` | FK to `reading_plan.id`. |
| `reference_text` | `VARCHAR(128)` | Verse reference (for example `Matthew 1:21`). |
| `note` | `TEXT` | Optional user note. |
| `created_at` | `TIMESTAMP` | Record creation time. |

Indexes/constraints:
- `PRIMARY KEY (id)`
- index on `(user_id, created_at)` for per-user saved-verse history
- index on `plan_id`
- FKs:
  - `user_id -> users.id` (`ON DELETE CASCADE`)
  - `plan_id -> reading_plan.id` (`ON DELETE CASCADE`)

---

### `user_devices`
Stores push notification targets per user device.

| Column | Type | Notes |
|---|---|---|
| `id` | `BIGINT UNSIGNED` | Primary key, auto-increment. |
| `user_id` | `BIGINT UNSIGNED` | FK to `users.id`. |
| `push_token` | `VARCHAR(255)` | Unique push token. |
| `platform` | `VARCHAR(32)` | Device platform (`ios`, `android`, etc.). |
| `created_at` | `TIMESTAMP` | Record creation time. |

Indexes/constraints:
- `PRIMARY KEY (id)`
- `UNIQUE (push_token)`
- index on `user_id`
- FK `user_id -> users.id` (`ON DELETE CASCADE`)

---

### `announcements`
Stores admin-authored announcement messages.

| Column | Type | Notes |
|---|---|---|
| `id` | `BIGINT UNSIGNED` | Primary key, auto-increment. |
| `title` | `VARCHAR(255)` | Announcement title. |
| `body` | `TEXT` | Announcement content. |
| `created_at` | `TIMESTAMP` | Creation timestamp. |
| `created_by` | `BIGINT UNSIGNED` | FK to `users.id` (admin user). |

Indexes/constraints:
- `PRIMARY KEY (id)`
- index on `created_at` for reverse-chronological listing
- index on `created_by`
- FK `created_by -> users.id` (`ON DELETE RESTRICT`)

## Relationships overview

- `users` 1:N `reading_records`
- `users` 1:N `saved_verses`
- `users` 1:N `user_devices`
- `users` 1:N `announcements` (via `created_by`)
- `reading_plan` 1:N `reading_records`
- `reading_plan` 1:N `saved_verses`

## Query patterns covered by indexes

- **Today plan query**: `reading_plan` lookup by `date` (unique index + lookup composite index).
- **User history query**: `reading_records` lookup by `user_id` ordered/filter by `completed_at`.
- **Saved verses history**: `saved_verses` lookup by `user_id` ordered/filter by `created_at`.
