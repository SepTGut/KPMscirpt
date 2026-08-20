# KPM Unified Web

Combined Admin and Expedition/User web app. This folder is independent from the existing `admin/` and `user/` pages.

## Run

1. Copy `.env.example` to `.env.local` and fill in the existing Apps Script URL and tokens.
2. Run `npm install`.
3. Run `npm run dev` or build with `npm run build`.

The app calls the existing REST actions: `getMasterData`, `getMonitoring`, `getDeliveries`, `createKpm`, `updateStatus`, and `archiveKpm`.
