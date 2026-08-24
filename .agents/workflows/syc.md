---
name: syc
description: Cross-branch synchronization workflow prioritizing the main branch
---

# Workflow: /syc (Sync Across Branches with Priority to Main)

1. Save current branch name:
   ```bash
   $b = (git rev-parse --abbrev-ref HEAD).Trim()
   ```
2. Commit any pending working tree modifications:
   ```bash
   git add .
   git commit -m "chore: automated sync commit before branch synchronization"
   ```
3. Push current branch:
   ```bash
   git push origin $b
   ```
4. Merge into `main` (Top Priority) and push:
   ```bash
   git checkout main
   git merge $b
   git push origin main
   ```
5. Propagate `main` to other secondary branches and push:
   ```bash
   git checkout Beta
   git merge main
   git push origin Beta

   git checkout "Apps(personel)"
   git merge main
   git push origin "Apps(personel)"
   ```
6. Return to starting branch:
   ```bash
   git checkout $b
   ```
7. Or run the unified automated script:
   ```bash
   npm run git:sync
   ```
