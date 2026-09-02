---
trigger: always_on
description: Custom trigger shortcuts for "up" (upload/commit/gas:push) and "syc" (cross-branch synchronization prioritizing main).
---

## Git Upload & Sync Rules ("up" and "syc")

When the user gives shortcut commands **"up"** or **"syc"** (or similar requests), follow these exact rules:

### 1. Trigger "up" (Upload, Commit & Push):
When the user says **"up"**, **"upload"**, or asks to commit and push all files:
1. Stage all modified and untracked files: `git add .`
2. Commit with a concise, descriptive conventional-commit message based on recent changes: `git commit -m "<type>: <description>"`
3. Push to current branch on remote origin: `git push origin <current_branch>`
4. Push Google Apps Script backend if any GAS `.gs` / `.html` / `appsscript.json` files were modified: `npm run gas:push && npx @google/clasp deploy -i AKfycbz1XwsnPkZ7-gqV8CMgeg0GWpp6jLn13nR_CTqSWppVgYwr4IpqSIA710W8OUQz43g2IA -d "auto-sync update"`
5. Keep knowledge graph current: `python -m graphify.cli update .`

---

### 2. Trigger "syc" (Cross-Branch Sync Prioritizing `main`):
When the user says **"syc"**, **"sync"**, or asks to synchronize across branches:
1. **Top Priority is `main` branch**:
   - Ensure the working tree is committed: `git add .` + `git commit -m "chore: automated sync commit"` (if changes exist).
   - Push current branch: `git push origin <current_branch>`.
   - Checkout `main`, merge current branch into `main`, and push:
     ```bash
     git checkout main
     git merge <current_branch>
     git push origin main
     ```
2. **Propagate `main` to All Other Branches**:
   - Merge `main` into each secondary branch (`Beta`, `Apps(personel)`, etc.) and push:
     ```bash
     git checkout Beta && git merge main && git push origin Beta
     git checkout "Apps(personel)" && git merge main && git push origin "Apps(personel)"
     ```
3. **Return to Starting Branch**:
   - Switch back to the branch the user started on (`git checkout <current_branch>`).
4. **Convenience Command**: Alternatively, run `npm run git:sync` which automates this exact priority sequence.
