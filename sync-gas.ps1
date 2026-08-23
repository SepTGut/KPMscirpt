# Script to push local Apps Script files to Google Apps Script
$ErrorActionPreference = 'Stop'

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   Pushing Code to Google Apps Script     " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$choice = Read-Host "Select action: [1] Push Once  [2] Watch Mode (Auto Push on Save)"
if ($choice -eq '2') {
    Write-Host "Starting Watch Mode... (Press Ctrl+C to stop)" -ForegroundColor Yellow
    npx @google/clasp push --watch
} else {
    Write-Host "Pushing files to GAS..." -ForegroundColor Green
    npx @google/clasp push
}
