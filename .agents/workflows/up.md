---
name: up
description: Quick workflow to stage, commit, push all code changes to GitHub and push to Google Apps Script
---

# Workflow: /up (Upload & Push All)

1. Stage all changes across all sub-apps and backend:
   ```bash
   git add .
   ```
2. Commit with a meaningful message:
   ```bash
   git commit -m "<descriptive message>"
   ```
3. Push to remote origin:
   ```bash
   git push origin <current_branch>
   ```
4. Push Google Apps Script backend if relevant:
   ```bash
   npm run gas:push
   ```
5. Update graphify knowledge graph:
   ```bash
   python -m graphify.cli update .
   ```
