# Quick Netlify Production Deployment Script
param(
    [string]$AuthToken = "nfp_cZNivopF31aJP11LvaDt21ycfxnRogiX02ac",
    [string]$SiteId = "85341f06-3418-4ee3-9010-ebc5493095ce"
)

$ErrorActionPreference = "Stop"

$appDir = $PSScriptRoot
if (-not $appDir) {
    $appDir = (Join-Path (Get-Location) "WKPM/combined-app")
}

Push-Location $appDir
try {
    Write-Host "Building KPM Web App in $appDir..." -ForegroundColor Cyan
    npm run build

    Write-Host "Deploying to Netlify Production (Site: $SiteId)..." -ForegroundColor Yellow
    npx netlify deploy --prod --dir=dist --auth=$AuthToken --site=$SiteId

    Write-Host "Deployment Live at: https://linefeedingd.netlify.app" -ForegroundColor Green
} finally {
    Pop-Location
}
