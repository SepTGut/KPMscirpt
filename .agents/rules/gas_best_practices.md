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
- When modifying Web App backend code, always redeploy the active deployment ID (`AKfycbxXRRDoiIXVt8VwUa7Gq-ZUdEP4YZhHiMoTdPKnSZ4eWMNBclUmQ5d86Zqoaxo76OM1jg`) so external clients receive the updated code.

### 4. Standard Response Envelope
- Web App API endpoints (`doGet` / `doPost`) must return a consistent JSON envelope:
  `{ success: boolean, action: string, data: any, error: { code: string, message: string } | null }`
