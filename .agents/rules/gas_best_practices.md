---
trigger: always_on
description: Google Apps Script performance, security, and deployment best practices.
---

## Google Apps Script Best Practices

### 1. Batch Spreadsheet Operations (Zero Single-Cell Loop Writes)
- **NEVER** call `sheet.getRange(r, c).setValue()` or `sheet.getRange(r, c).setFormula()` inside a loop.
- Always read data into a 2D memory array (`sheet.getRange(...).getValues()`), transform all rows in JavaScript, and write all values/formulas using a single `setValues(dataArray)` or `setFormulas(formulaArray)` call.

### 2. Spreadsheet Formula Injection Defense
- Always sanitize user-provided strings before writing to cells using `sanitizeSpreadsheetInput(str)`.
- If a string starts with `=`, `+`, `-`, `@`, `\t`, or `\r`, prepend a single quote `'` so the spreadsheet engine interprets it as text rather than an active formula.

### 3. Clasp Deployment Versioning
- `npm run gas:push` (`clasp push`) only updates the `@HEAD` development script.
- When modifying Web App backend code, always redeploy the active deployment ID (`AKfycbz1XwsnPkZ7-gqV8CMgeg0GWpp6jLn13nR_CTqSWppVgYwr4IpqSIA710W8OUQz43g2IA`) so external clients receive the updated code.

### 4. Standard Response Envelope
- Web App API endpoints (`doGet` / `doPost`) must return a consistent JSON envelope:
  `{ success: boolean, action: string, data: any, error: { code: string, message: string } | null }`

### 5. Forbidden External Spreadsheet Scope Escalation
- **NEVER** use `SpreadsheetApp.openById(externalId)` or `SpreadsheetApp.openByUrl(url)` in code reachable from `doGet`/`doPost` Web App endpoints.
- These calls trigger Google's OAuth static analyzer to require the broad `https://www.googleapis.com/auth/spreadsheets` scope. If the deploying account hasn't authorized the new scope, Google **silently redirects** all anonymous Web App requests to `accounts.google.com/ServiceLogin`, returning HTML instead of JSON and breaking all API clients.
- For external spreadsheet data, use one of these scope-safe alternatives:
  1. **IMPORTRANGE** formula in a local sheet (read via `getActiveSpreadsheet().getSheetByName(...)`)
  2. **Public CSV export** via `UrlFetchApp.fetch("https://docs.google.com/spreadsheets/d/{ID}/export?format=csv&gid={GID}")` (requires the source spreadsheet to be shared as "Anyone with the link")
- After removing `openById`, always redeploy the active deployment and verify with `curl` that the endpoint returns JSON, not HTML.
