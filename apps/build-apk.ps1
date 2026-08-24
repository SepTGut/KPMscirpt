# Script Otomatis Build Android APK Driver KPM
$ErrorActionPreference = "Stop"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Mulai Membangun Android APK Driver KPM " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

$rootDir = Split-Path -Parent $PSScriptRoot
$driverDir = Join-Path $PSScriptRoot "driver-app"
$androidDir = Join-Path $driverDir "android"
$outputApk = Join-Path $PSScriptRoot "Driver-KPM-v1.0.apk"

# 1. Build Web Assets
Write-Host "`n[1/3] Membangun Web Assets (Vite)..." -ForegroundColor Yellow
Set-Location $driverDir
npm run build

# 2. Sync Capacitor Assets
Write-Host "`n[2/3] Sinkronisasi Aset ke Project Android..." -ForegroundColor Yellow
npx cap sync android

# 3. Assemble APK dengan Gradle
Write-Host "`n[3/3] Kompilasi Android APK (Gradle)..." -ForegroundColor Yellow
Set-Location $androidDir
$env:ANDROID_HOME = "C:\Users\user\AppData\Local\Android\Sdk"
.\gradlew.bat assembleDebug

# 4. Copy Output APK
$builtApk = Join-Path $androidDir "app\build\outputs\apk\debug\app-debug.apk"
if (Test-Path $builtApk) {
    Copy-Item $builtApk $outputApk -Force
    Write-Host "`n=========================================" -ForegroundColor Green
    Write-Host "✓ APK BERHASIL DIBANGUN!" -ForegroundColor Green
    Write-Host "Lokasi File: $outputApk" -ForegroundColor Green
    Write-Host "=========================================" -ForegroundColor Green
} else {
    Write-Host "`n[ERROR] File APK tidak ditemukan di: $builtApk" -ForegroundColor Red
}

Set-Location $rootDir
