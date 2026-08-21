# KPM Unified Web

Combined Admin and Expedition/User web app. This folder is independent from the existing `admin/` and `user/` pages.

## Run

1. Copy `.env.example` to `.env.local` if you need a local API URL override.
2. Run `npm install`.
3. Run `npm run dev` or build with `npm run build`.

The app calls the existing REST actions: `getMasterData`, `getMonitoring`, `getDeliveries`, `createKpm`, `updateStatus`, and `archiveKpm`.

Security notes:

- Set `ADMIN_TOKEN` and `DRIVER_TOKEN` in Apps Script Script Properties. The backend no longer accepts default credentials.
- Set `GOOGLE_SCRIPT_URL`, `ADMIN_TOKEN`, and `DRIVER_TOKEN` as Netlify environment variables. The Netlify Function injects the token server-side, so these values are not bundled into the browser.
- Deploy the repository/project with the Netlify Function. Uploading only `dist/` will omit the proxy and cause `Failed to fetch`.
- Uploaded proof photos are intentionally public by link so monitoring-card and spreadsheet links work for the delivery team.
