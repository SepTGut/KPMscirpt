# Quick Netlify Production Deployment Script
param(
    [string]$AuthToken = "nfp_cZNivopF31aJP11LvaDt21ycfxnRogiX02ac",
    [string]$SiteId = "85341f06-3418-4ee3-9010-ebc5493095ce"
)

$ErrorActionPreference = "Stop"

Write-Host "Building KPM Web App for Netlify..." -ForegroundColor Cyan
npm run build

Write-Host "Deploying to Netlify Production..." -ForegroundColor Yellow
npx netlify deploy --prod --dir=dist --auth=$AuthToken --site=$SiteId

Write-Host "Deployment Live at: https://linefeedingd.netlify.app" -ForegroundColor Green
