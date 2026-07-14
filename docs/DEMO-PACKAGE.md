# Demo Package

## Demo Roles

Create stable Supabase Auth accounts for these roles before presenting:

- Administrator
- Mine Operator
- Safety Officer
- Drone Operator
- Viewer
- Regulator

Do not store passwords in GitHub. Keep credentials in a private note or password manager and test them on the presentation laptop.

## Controlled Scenarios

### Normal Inspection

1. Log in.
2. Open `/app/dashboard`.
3. Review dashboard status, drone status, and recent missions.
4. Open `/app/missions` and a completed report.

### Critical Gas Hazard

1. Open `/app/dashboard`.
2. Start a persisted mission run.
3. Show critical methane/oxygen readings.
4. Open `/app/notifications`.
5. Open the alert and live mission from notification links.

### Signal-Loss Automatic Return

1. Open `/app/drone`.
2. Discuss signal and battery health.
3. Open `/app/live-mission/[missionId]`.
4. Use Return to Base and show the mission event entry.

## Backup Screen-Capture Video

Record one offline backup video on the actual presentation laptop:

1. Login.
2. Start mission.
3. Show live drone movement.
4. Show hazard detection.
5. Show notification.
6. Resolve or acknowledge alert.
7. Open report.
8. Submit safety approval.
9. Logout.

Save the video outside the repository if it contains credentials.

## Backup Screenshots

Screenshots are stored in `docs/screenshots`:

- Landing page
- Dashboard
- Live mission
- Alert detail
- Mission report
- Safety approval
- Drone health page

## Final Laptop Checklist

- Test the live URL on the actual laptop and internet connection.
- Test every demo account.
- Test the backup video offline.
- Keep Supabase and Vercel dashboards logged in only if needed.
- Keep private credentials out of the projected screen.
