# KPM Unified Web

Combined Admin and Expedition/User web app. This folder is independent from the existing `admin/` and `user/` pages.

## Run

1. Copy `.env.example` to `.env.local` and fill in the existing Apps Script URL and tokens.
2. Run `npm install`.
3. Run `npm run dev` or build with `npm run build`.

The app calls the existing REST actions: `getMasterData`, `getMonitoring`, `getDeliveries`, `createKpm`, `updateStatus`, and `archiveKpm`.

Security notes:

- Set `ADMIN_TOKEN` and `DRIVER_TOKEN` in Apps Script Script Properties. The backend no longer accepts default credentials.
- `VITE_*` values are bundled into the browser. They are bearer credentials, not true secrets. For a production admin surface, use an authenticated server-side proxy or Google identity-based access.
- Uploaded proof photos are intentionally public by link so monitoring-card and spreadsheet links work for the delivery team.
