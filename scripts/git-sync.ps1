# Git Cross-Branch Synchronization Script (Prioritizing main)
param(
    [string]$CurrentBranch = ""
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($CurrentBranch)) {
    $CurrentBranch = (git rev-parse --abbrev-ref HEAD).Trim()
}

Write-Host "Starting Cross-Branch Sync (Current: $CurrentBranch, Priority: main)..." -ForegroundColor Cyan

# 1. Commit any remaining changes if any
$changedFiles = git status --porcelain
if ($changedFiles) {
    Write-Host "Staging and committing uncommitted changes..." -ForegroundColor Yellow
    git add .
    git commit -m "chore: automated sync commit before branch synchronization"
}

# 2. Push current branch first
Write-Host "Pushing $CurrentBranch to origin..." -ForegroundColor Yellow
git push origin $CurrentBranch

# 3. Merge into main (Top Priority)
Write-Host "Merging into main (Top Priority)..." -ForegroundColor Green
git checkout main
git merge $CurrentBranch
git push origin main

# 4. Sync main into all secondary branches
$allBranches = @("Beta", "Apps(personel)")
foreach ($b in $allBranches) {
    if ($b -ne "main") {
        Write-Host "Syncing main into $b..." -ForegroundColor Yellow
        git checkout $b
        git merge main
        git push origin $b
    }
}

# 5. Return to starting branch
Write-Host "Returning to branch $CurrentBranch..." -ForegroundColor Cyan
git checkout $CurrentBranch

Write-Host "All branches (main, Beta, Apps(personel)) successfully synchronized and pushed to GitHub!" -ForegroundColor Green
