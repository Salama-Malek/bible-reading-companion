# Bible Reading Companion

## Goal
Encourage daily Bible reading for church youth group using daily plans, reminders, confirmations, history, and admin analytics.

## Architecture
- Mobile: Expo React Native (TypeScript)
- Admin Dashboard: Web (Hostinger)
- Backend: PHP REST API (Hostinger)
- DB: MySQL
- Scheduler: Hostinger cron jobs

## Repo structure
- apps/mobile: Expo app
- apps/admin-web: Admin dashboard web app
- services/api: PHP API
- docs: Specs (single source of truth)
- tasks: Milestones/backlog/acceptance tests
- infra: SQL + cron scripts
- samples: input data examples

## Next
Follow tasks/01-backlog.md in order.

## Documentation
- API specification (v1 draft): `docs/04-api-spec.md`
