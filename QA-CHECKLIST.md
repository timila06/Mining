# Operation MOLE Local QA Checklist

Date: 2026-07-13

## Local Run

- [x] App starts locally at `http://localhost:3000`.
- [x] Production build passes with `npm.cmd run build`.
- [x] Browser console shows no app errors during desktop QA.
- [x] Browser console shows no app errors during tablet QA.
- [x] Browser console shows no app errors during mobile QA.

## Main Sections

- [x] Public landing page loads.
- [x] Navigation links exist for Home, Solution, Dashboard, Sensors, Map, Reports, and Operator Login.
- [x] Desktop navigation links route to the correct sections.
- [x] Operator Login section opens from the navigation.
- [x] Operations dashboard loads.
- [x] The prototype shows one long-range drone, not a five-drone system.
- [x] Underground map displays the drone, cleared zone, unsafe zone, and dust zone.
- [x] Hazard charts render.
- [x] Sensor cards show units and safe thresholds.
- [x] Alerts are readable and categorized.
- [x] Mission history loads.
- [x] Reports table loads.

## Responsive Layout

- [x] Desktop layout checked at 1366px wide.
- [x] Tablet layout checked at 768px wide.
- [x] Mobile layout checked at 390px wide.
- [x] No horizontal overflow detected on tablet.
- [x] No horizontal overflow detected on mobile.
- [x] Operator Login remains accessible on mobile.
- [x] Charts remain present on mobile.
- [x] Reports table remains present and scrollable on mobile.

## Issues Found

- [x] Page initially allowed horizontal scrolling on mobile.
  - Problem: Decorative and table content could make the viewport wider than the screen.
  - Expected behaviour: Mobile layout should stay within the viewport.
  - Fix: Added `overflow-x-hidden` to the main page wrapper and kept the report table inside an overflow container.

## Result

- [x] Major visual, navigation, console, and responsive checks passed.
- [x] Ready for the next project step: push to GitHub and prepare deployment.

## Live Authentication QA

- [x] Manually created Supabase Auth user can log in on the live Vercel site.
- [x] Profile row is created automatically and displayed on `/app/dashboard`.
- [x] Session persists after browser refresh.
- [x] Logout returns the user to the public homepage.
- [x] Direct access to `/app/dashboard` while logged out redirects to `/login?next=%2Fapp%2Fdashboard`.
- [x] Invalid login shows an error message.
