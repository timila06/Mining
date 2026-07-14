# Operation MOLE Release Checklist

Audit date: 2026-07-14
Production URL: https://mining-three-jet.vercel.app
Repository: https://github.com/timila06/Mining

## Final Status

- Production build: passed with `npm.cmd run build`.
- Static/lint checks: passed with `npm.cmd run lint`.
- Protected-route logged-out checks: passed for app routes tested with `curl.exe -I`, returning `307` to `/login?next=...`.
- Secret exposure review: no service-role key, database password, private API key, auth token, or local `.env` content is committed or referenced in browser code. Browser/client code uses only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- RLS posture: enabled on application data tables. Notifications are restricted to each notification owner; admin screens use server actions plus RLS role checks.
- Critical/high findings fixed during audit: notification unread count, notification mine-site filter, secure headers, friendly error/not-found pages, and executable alert-escalation function.

## Route Coverage

- `/app/dashboard`: protected, mission start readiness enforced, notifications bell present.
- `/app/missions`: protected, includes mission detail and live telemetry links.
- `/app/live-mission/[missionId]`: protected, mission-scoped Realtime subscriptions, controls restricted to operator/admin roles.
- `/app/reports`: protected, safety approval action role-gated.
- `/app/alerts`: protected, status/assignment actions role-gated.
- `/app/notifications`: protected, own-notification RLS and mark-read actions scoped to `user_id`.
- `/app/drone`: protected, maintenance actions restricted to Administrator and Drone Operator.
- `/app/sites`: protected, modification actions restricted to Administrator.
- `/app/settings`: protected, threshold edits restricted to Administrator.
- `/app/users`: protected, user administration restricted to Administrator.

## Security Review

- Authentication: Supabase auth is required for every `/app/*` route by middleware.
- Account status: middleware signs out suspended/inactive users and redirects to login with a status message.
- Authorization/RBAC: server actions check roles before database writes; RLS reinforces write restrictions.
- Server actions: reviewed for authenticated-user checks, role checks, input validation, and scoped updates.
- Sensitive data: no service keys or private credentials are exposed in source; no direct password viewing/editing exists.
- Secure headers: added `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and a baseline `Content-Security-Policy`.
- Error handling: added global friendly error and not-found pages.
- Realtime: subscriptions are mission/user scoped and cleaned up on component unmount.

## Remaining Operational Notes

- Email/SMS notification delivery is intentionally not implemented; `delivery_status` is stored for future channels.
- Escalation timing is configurable in `system_settings`; `public.run_alert_escalations()` is available for a scheduled job or manual run.
- Full multi-role manual testing requires separate credentials for each role; direct write attempts are blocked by server action role checks and RLS policies.
- Lighthouse should be rerun after any visual redesign. The app is server-rendered and production build completed successfully.

## End-To-End Smoke Test

- Logged in as Administrator.
- Started a mission and persisted readings.
- Generated high/critical alerts.
- Received in-app notifications.
- Opened live telemetry.
- Tested pause/resume controls and verified mission event persistence.
- Marked a notification as read.
- Verified notification links to alert and live mission.
- Verified logged-out protected-route redirect.
