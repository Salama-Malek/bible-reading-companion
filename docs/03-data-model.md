# Data Model

This document describes the MySQL 8+ data model for Bible Reading Companion.

## Tables

### `users`
Application user accounts.

- `id`: `BIGINT UNSIGNED` primary key, auto-increment.
- `email`: `VARCHAR(255)` unique, required.
- `password_hash`: `VARCHAR(255)` required.
- `name`: `VARCHAR(120)` optional display name.
- `role`: `ENUM('user','admin')`, defaults to `user`.
- `created_at`: creation timestamp.

Key constraints:
- `PRIMARY KEY (id)`
- `UNIQUE (email)`

### `reading_plan`
Canonical daily reading assignment, one row per calendar date.

- `id`: `BIGINT UNSIGNED` primary key, auto-increment.
- `date`: `DATE` unique, required.
- `testament`: `ENUM('old','new')`, required.
- `book`: `VARCHAR(80)`, required.
- `chapter`: `INT`, required.
- `created_at`: creation timestamp.

Key constraints:
- `PRIMARY KEY (id)`
- `UNIQUE (date)` (also serves as index for date lookup)

### `reading_records`
Tracks completion of a plan item by a user.

- `id`: `BIGINT UNSIGNED` primary key, auto-increment.
- `user_id`: FK to `users.id`.
- `plan_id`: FK to `reading_plan.id`.
- `method`: `ENUM('physical','digital')`.
- `completed_at`: completion timestamp.

Key constraints:
- `PRIMARY KEY (id)`
- `UNIQUE (user_id, plan_id)`
- `INDEX (user_id, completed_at)`
- `INDEX (plan_id)`
- `FOREIGN KEY user_id -> users.id ON DELETE CASCADE`
- `FOREIGN KEY plan_id -> reading_plan.id ON DELETE CASCADE`

### `saved_verses`
User-saved references and notes.

- `id`: `BIGINT UNSIGNED` primary key, auto-increment.
- `user_id`: FK to `users.id`.
- `plan_id`: nullable FK to `reading_plan.id`.
- `reference_text`: `VARCHAR(100)` (example: `Matthew 1:1-5`).
- `note`: optional `TEXT`.
- `created_at`: creation timestamp.

Key constraints:
- `PRIMARY KEY (id)`
- `INDEX (user_id, created_at)`
- `FOREIGN KEY user_id -> users.id ON DELETE CASCADE`
- `FOREIGN KEY plan_id -> reading_plan.id ON DELETE SET NULL`

### `user_devices`
Push notification registrations per user device.

- `id`: `BIGINT UNSIGNED` primary key, auto-increment.
- `user_id`: FK to `users.id`.
- `push_token`: `VARCHAR(255)` unique.
- `platform`: `ENUM('android','ios','web')`.
- `created_at`: creation timestamp.

Key constraints:
- `PRIMARY KEY (id)`
- `UNIQUE (push_token)`
- `INDEX (user_id)`
- `FOREIGN KEY user_id -> users.id ON DELETE CASCADE`

### `announcements`
Admin-created announcements shown to users.

- `id`: `BIGINT UNSIGNED` primary key, auto-increment.
- `title`: `VARCHAR(140)`.
- `body`: `TEXT`.
- `created_at`: creation timestamp.
- `created_by`: FK to `users.id`.

Key constraints:
- `PRIMARY KEY (id)`
- `INDEX (created_at)`
- `FOREIGN KEY created_by -> users.id ON DELETE RESTRICT`

### `bible_books`
Bible book catalog used by verse storage.

- `id`: `SMALLINT UNSIGNED` primary key, auto-increment.
- `testament`: `ENUM('old','new')`.
- `name`: unique canonical book name.
- `display_name`: display label for UI.
- `sort_order`: ordering value within full canon.

Key constraints:
- `PRIMARY KEY (id)`
- `UNIQUE (name)`
- `INDEX (testament, sort_order)`

### `bible_verses`
Bible verse text keyed by book/chapter/verse.

- `id`: `BIGINT UNSIGNED` primary key, auto-increment.
- `book_id`: FK to `bible_books.id`.
- `chapter`: `SMALLINT UNSIGNED`.
- `verse`: `SMALLINT UNSIGNED`.
- `text`: verse text.

Key constraints:
- `PRIMARY KEY (id)`
- `UNIQUE (book_id, chapter, verse)`
- `INDEX (book_id, chapter)`
- `FOREIGN KEY book_id -> bible_books.id ON DELETE CASCADE`

## Relationships

- `users` 1:N `reading_records`
- `users` 1:N `saved_verses`
- `users` 1:N `user_devices`
- `users` 1:N `announcements` (via `created_by`)
- `reading_plan` 1:N `reading_records`
- `reading_plan` 1:N `saved_verses` (nullable reference)
- `bible_books` 1:N `bible_verses`

## "Today" plan lookup and timezone

The source-of-truth key for daily assignments is `reading_plan.date` (`DATE`, no timezone). The API layer is responsible for timezone-aware "today" resolution:

1. Determine the user's effective timezone (profile setting, device timezone, or app default).
2. Compute today's local date in that timezone.
3. Query `reading_plan` by that computed local `DATE` value.

This keeps schema design simple and deterministic while ensuring users in different timezones can receive the correct daily chapter.
