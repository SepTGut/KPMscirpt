# PowerShell script to deploy WKPM Combined App to Vercel
$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $scriptDir

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   Deploying KPM Web to Vercel (CLI)      " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Account: rekappc03-6994" -ForegroundColor Gray
Write-Host "Building project with Vite..." -ForegroundColor Yellow

npm run build

Write-Host "Deploying to Vercel Production..." -ForegroundColor Green
if ($env:VERCEL_TOKEN) {
    npx vercel --prod --yes --token $env:VERCEL_TOKEN
} else {
    npx vercel --prod --yes
}

Write-Host ""
Write-Host "Deployment Complete! Live at: https://combined-app-eight.vercel.app" -ForegroundColor Cyan
