# Script to push local Apps Script files to Google Apps Script
$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Split-Path -Parent $scriptDir
Set-Location -LiteralPath $rootDir

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   Pushing Code to Google Apps Script     " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$choice = Read-Host "Select action: [1] Push Once  [2] Watch Mode (Auto Push on Save)"
if ($choice -eq '2') {
    Write-Host "Starting Watch Mode... (Press Ctrl+C to stop)" -ForegroundColor Yellow
    npm run gas:watch
} else {
    Write-Host "Pushing files to GAS..." -ForegroundColor Green
    npm run gas:push
}
