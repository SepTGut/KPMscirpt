---
trigger: always_on
description: Web App resilience patterns for critical auth and fallback handling.
---

## Web App Resilience & Emergency Access

### 1. IT Master Emergency Fast-Path (3-Layer Guarantee)
The IT master token (`st_master_access_99x` / `kpm_st_master_99x`) must ALWAYS authenticate successfully, even if every backend service is down. Implement these layers in order:

1. **Vercel Proxy Layer** (`apps/web/api/index.js`): If `action=login` and `qrAuth` matches a master token, return the full IT session JSON immediately without forwarding to Google Apps Script.
2. **Frontend Auth Store** (`stores/auth.js`): In `loginWithQr()` and `loginWithCredentials()`, if the API call throws, check if the token/credentials match the master secret. If yes, construct the session object client-side via `getItMasterSession()` and persist it.
3. **Router Navigation Guard** (`router/index.js`): The `beforeEach` guard must be `async` and must always process `?qrAuth=` params regardless of existing session state (overwrite stale sessions).

### 2. Never Redirect to /login on Master Token Failure
When a QR auth token matching the IT master pattern fails, the router guard must NOT silently redirect to `/login`. Instead, use the client-side emergency fallback, which is guaranteed to succeed.

### 3. Vercel Proxy Token Defaults
The Vercel API proxy (`api/index.js`) must have hardcoded fallback values for `GOOGLE_SCRIPT_URL`, `ADMIN_TOKEN`, and `DRIVER_TOKEN` so the proxy remains functional even if Vercel environment variables are misconfigured or missing.
