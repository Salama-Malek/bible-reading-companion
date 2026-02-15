# Requirements (MVP)

## Roles
- User
- Admin

## User Features
1. Auth (email/password)
2. Today’s reading:
   - shows book + chapter for today
3. Reading method:
   - Physical: user confirms manually
   - Digital: read inside app (chapter viewer)
4. Mark as Read:
   - one completion per plan/day
5. Saved verse:
   - save reference + optional note
6. History:
   - completed days
   - missed days
   - streak

## Admin Features
1. Dashboard analytics:
   - completion rate today
   - active users / missing today
   - streak leaders
   - inactive users
2. Reading plan management:
   - CRUD
   - bulk import JSON
3. Announcements:
   - admin creates
   - users view

## Notifications
- Daily push notification
- Only notify users who have not completed today
- Device token stored per user

## Bible Text
- Source: TXT files
- Import into DB as verses

## Open Questions
- Translation/license confirmed?
- Timezone: Europe/Amsterdam
