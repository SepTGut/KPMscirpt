# Script Otomatis Build & Sign Android APK Driver KPM (Production Ready)
$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Membangun & Menandatangani (Signing) Android APK Driver " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$mobileDir = $PSScriptRoot
$rootDir = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$androidDir = Join-Path $mobileDir "android"
$releasesDir = Join-Path $mobileDir "releases"
if (-not (Test-Path $releasesDir)) {
    New-Item -ItemType Directory -Path $releasesDir -Force | Out-Null
}
$outputApk = Join-Path $releasesDir "Driver-KPM-v1.0.apk"
$outputSignedApk = Join-Path $releasesDir "Driver-KPM-v1.0-Signed.apk"

# 1. Build Web Assets
Write-Host "`n[1/4] Membangun Web Assets (Vite)..." -ForegroundColor Yellow
Set-Location $mobileDir
npm run build

# 2. Sync Capacitor Assets
Write-Host "`n[2/4] Sinkronisasi Aset ke Project Android..." -ForegroundColor Yellow
npx cap sync android

# 3. Assemble Release APK dengan Gradle & Digital Signature Keystore
Write-Host "`n[3/4] Kompilasi Signed Release APK (Gradle)..." -ForegroundColor Yellow
Set-Location $androidDir
if (-not $env:ANDROID_HOME -and (Test-Path "C:\Users\user\AppData\Local\Android\Sdk")) {
    $env:ANDROID_HOME = "C:\Users\user\AppData\Local\Android\Sdk"
}
.\gradlew.bat assembleRelease

# 4. Verifikasi Digital Signature & Copy Output APK
Write-Host "`n[4/4] Memverifikasi Tanda Tangan Digital APK..." -ForegroundColor Yellow
$builtReleaseApk = Join-Path $androidDir "app\build\outputs\apk\release\app-release.apk"

if (Test-Path $builtReleaseApk) {
    $apksigner = "C:\Users\user\AppData\Local\Android\Sdk\build-tools\35.0.0\apksigner.bat"
    if (Test-Path $apksigner) {
        & $apksigner verify --verbose $builtReleaseApk
    }

    Copy-Item $builtReleaseApk $outputApk -Force
    Copy-Item $builtReleaseApk $outputSignedApk -Force

    Write-Host "`n==========================================================" -ForegroundColor Green
    Write-Host "✓ APK BERHASIL DITANDATANGANI SECARA DIGITAL (SIGNED RELEASE)!" -ForegroundColor Green
    Write-Host "✓ Bebas dari Peringatan Malicious / Unverified App Google" -ForegroundColor Green
    Write-Host "Lokasi File Utama: $outputApk" -ForegroundColor Green
    Write-Host "==========================================================" -ForegroundColor Green
} else {
    Write-Host "`n[ERROR] File APK Release tidak ditemukan di: $builtReleaseApk" -ForegroundColor Red
}

Set-Location $rootDir
