# PowerShell script to deploy WKPM Combined App to Vercel
$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $scriptDir

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   Deploying KPM Web to Vercel (CLI)      " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Make sure you have configured Environment Variables in Vercel:" -ForegroundColor Yellow
Write-Host "  1. GOOGLE_SCRIPT_URL (Apps Script Web App Exec URL)" -ForegroundColor Gray
Write-Host "  2. ADMIN_TOKEN (Admin secret token)" -ForegroundColor Gray
Write-Host "  3. DRIVER_TOKEN (Driver/Personel secret token)" -ForegroundColor Gray
Write-Host ""

$choice = Read-Host "Deploy to Production directly? (y/N)"
if ($choice -match '^[Yy]') {
    Write-Host "Running: npx vercel --prod" -ForegroundColor Green
    npx vercel --prod
} else {
    Write-Host "Running: npx vercel (Preview Deployment)" -ForegroundColor Green
    npx vercel
}
