# Acceptance Test Checklist (T17)

Use this checklist for a happy-path verification pass across API + mobile + admin web.

## Auth (mobile + admin)

- [ ] **Mobile user registration succeeds**
  - **Steps:**
    1. Open mobile app login/register flow.
    2. Go to Register.
    3. Submit valid `name`, unique `email`, and password (8+ chars).
    4. Confirm app returns to authenticated state.
  - **Expected result:** Account is created, token is stored, and user can access main tabs without auth errors.

- [ ] **Mobile login succeeds for existing user**
  - **Steps:**
    1. Open mobile app.
    2. Log in with existing user credentials.
    3. Navigate across Home, History, Saved tabs.
  - **Expected result:** Login succeeds, authenticated endpoints load, and no forced logout occurs.

- [ ] **Admin login succeeds only for admin user**
  - **Steps:**
    1. Open admin web app `/login`.
    2. Log in using admin credentials.
    3. Confirm navigation to dashboard.
    4. Log out and attempt login with non-admin user.
  - **Expected result:** Admin account can access protected pages; non-admin receives Forbidden behavior and no admin access.

## Plans (today + range)

- [ ] **Today plan returns expected payload**
  - **Steps:**
    1. Ensure at least one `reading_plan` row exists for today (Europe/Riga date).
    2. Call `GET /plans/today`.
  - **Expected result:** Response is `ok: true` with `data.plan` containing `date`, `testament`, `book`, `chapter`.

- [ ] **Range plans returns filtered list**
  - **Steps:**
    1. Seed multiple plan rows spanning a date range.
    2. Call `GET /plans?from=YYYY-MM-DD&to=YYYY-MM-DD` within that range.
  - **Expected result:** Response is `ok: true`; returned plans fall inside requested range and are ordered by date.

## Reading complete + idempotency

- [ ] **Mark reading complete once**
  - **Steps:**
    1. Login as user.
    2. From mobile Home, choose method (physical or digital).
    3. Tap “Mark as Read”.
    4. Verify `POST /reading/complete` via API/network logs.
  - **Expected result:** Completion succeeds and Home shows completed state.

- [ ] **Mark reading complete twice is idempotent**
  - **Steps:**
    1. Submit `POST /reading/complete` twice for same user/date.
  - **Expected result:** Second call succeeds without duplicate row creation; existing record is returned.

## History summary + streak correctness

- [ ] **History endpoint includes plans, records, missedDates, summary**
  - **Steps:**
    1. Call `GET /reading/history?from=...&to=...` for a window with completed and missed days.
  - **Expected result:** Response includes `plans`, `records`, `missedDates`, and `summary` with completed/missed counts plus current/longest streak.

- [ ] **Mobile History tab renders summary and daily statuses correctly**
  - **Steps:**
    1. Open History tab after having at least one completion and one missed plan day.
    2. Compare UI cards and day rows with API response.
  - **Expected result:** Summary metrics and per-day labels (Completed/Missed/No plan) match API data.

## Saved verses (create/list/delete)

- [ ] **Save verse from reader**
  - **Steps:**
    1. From Home, open Reader via “Read inside the app”.
    2. Select or enter verse reference in save modal.
    3. Save with optional note.
  - **Expected result:** Save succeeds (201), success feedback appears, verse is persisted.

- [ ] **List saved verses**
  - **Steps:**
    1. Open Saved tab.
    2. Trigger refresh.
  - **Expected result:** Saved verses list loads with newest first and shows empty state when none exist.

- [ ] **Delete saved verse**
  - **Steps:**
    1. In Saved tab, delete a verse.
    2. Confirm deletion prompt.
  - **Expected result:** Verse is removed, API returns success, list refreshes without deleted item.

## Devices register/unregister

- [ ] **Register device token**
  - **Steps:**
    1. Login as user.
    2. Call `POST /devices/register` with valid `platform` and `pushToken`.
  - **Expected result:** Response contains `registered: true` and row exists/updates in `user_devices`.

- [ ] **Unregister device token**
  - **Steps:**
    1. Call `POST /devices/unregister` with same `pushToken`.
  - **Expected result:** Response contains `unregistered: true`; token is removed for that user.

## Notifications cron endpoint (log provider)

- [ ] **Cron endpoint authorizes by secret and logs run**
  - **Steps:**
    1. Set `CRON_SECRET` in API env.
    2. Call `POST /admin/notifications/send-today` with `X-CRON-SECRET`.
    3. Inspect `notifications_log` table and notification log file.
  - **Expected result:** Authorized request succeeds, response includes counts/date, and a run entry is persisted (log-provider mode).

- [ ] **Cron endpoint rejects invalid secret**
  - **Steps:**
    1. Call same endpoint with missing/invalid `X-CRON-SECRET`.
  - **Expected result:** Request fails with `401 UNAUTHORIZED` and no successful run side effects.

## Announcements (admin create, user view)

- [ ] **Admin can create announcement**
  - **Steps:**
    1. Login to admin app.
    2. Open Announcements page.
    3. Submit title + body.
  - **Expected result:** Create succeeds, form resets, and new announcement appears in admin list.

- [ ] **Mobile user can view announcements**
  - **Steps:**
    1. Open mobile Home and Announcements screen.
    2. Refresh announcements.
  - **Expected result:** Latest announcements are visible with title/body/date and no navigation dead-end.

## Bible reader (chapter load, save verse)

- [ ] **Reader loads chapter verses**
  - **Steps:**
    1. Open Reader for a valid plan (`book`, `chapter`, `date` params).
  - **Expected result:** Chapter is fetched and rendered; loading and error states are shown appropriately.

- [ ] **Reader save modal handles success/failure states**
  - **Steps:**
    1. Open save modal and submit valid verse.
    2. Repeat with invalid/missing data (e.g., empty reference).
  - **Expected result:** Valid save shows success; invalid input shows actionable error and does not crash the screen.
