# Operation MOLE

Live URL: https://mining-three-jet.vercel.app

Operation MOLE, or Mining Operation Lethality Explorer, is a student prototype for underground mine inspection, live mission telemetry, hazard alerting, safety reporting, and role-based operational review.

## Main Features

- Public landing page for the Operation MOLE concept.
- Supabase authentication with role-based access for Administrator, Mine Operator, Safety Officer, Drone Operator, Viewer, and Regulator.
- Operator dashboard with persisted simulated mission runs.
- Supabase-backed mine sites, zones, hazard thresholds, reports, users, drone health, and notifications.
- MOLE-01 drone health and maintenance management.
- Live mission telemetry with Supabase Realtime subscriptions.
- Critical alert notifications, in-app unread counts, and escalation records.
- Safety approval workflow and printable mission reports.
- Production security hardening documented in `RELEASE-CHECKLIST.md`.

## Technology Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Auth, Postgres, RLS, and Realtime
- Vercel production deployment
- GitHub repository: `timila06/Mining`

## Demo Account Instructions

Create or confirm one Supabase Auth user for each demo role:

- Administrator
- Mine Operator
- Safety Officer
- Drone Operator
- Viewer
- Regulator

Assign roles from `/app/users` as an Administrator. Do not commit or publish passwords in this repository. Share demo credentials privately before the presentation.

## Controlled Demo Scenarios

- Normal inspection: run a mission, review low/medium readings, open the generated report.
- Critical gas hazard: run the persisted mission simulation and show methane/oxygen critical alerts, notifications, live telemetry, and alert handling.
- Signal-loss automatic return: use the drone health and live mission controls to show return-to-base behavior and mission event logging.

## Simulated-Data Disclaimer

Operation MOLE is a student prototype. Drone telemetry, sensor readings, hazard detection, and mission behavior are simulated and are not certified for real-world safety decisions.

## Local Setup

```bash
npm install
npm run dev
```

Open http://localhost:3000.

Required environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SITE_URL=
```

Use the Supabase SQL editor to apply migrations in `supabase/migrations` in order when creating a fresh project.

## Deployment

The project is connected to Vercel from the GitHub repository `timila06/Mining`. Pushes to the `main` branch trigger production deployments.

## Known Prototype Limitations

- Drone movement, sensor readings, mission progress, notifications, and reports use simulated data.
- Email and SMS notification channels are not enabled yet; notification delivery is currently in-app only.
- Alert escalation is stored in the database and can be run through `public.run_alert_escalations()` or a future scheduled job.
- Demo users and credentials must be managed privately in Supabase Auth.
- This prototype is not certified for real-world mine safety decisions.
