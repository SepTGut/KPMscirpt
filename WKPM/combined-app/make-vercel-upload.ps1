$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$staging = Join-Path $projectRoot 'vercel-upload'
$zipPath = Join-Path $projectRoot 'kpm-vercel-upload.zip'

if (Test-Path -LiteralPath $staging) {
  Remove-Item -LiteralPath $staging -Recurse -Force
}
if (Test-Path -LiteralPath $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}

New-Item -ItemType Directory -Path $staging | Out-Null

$files = @(
  'index.html',
  'package.json',
  'package-lock.json',
  'vite.config.js',
  'tailwind.config.js',
  'postcss.config.js',
  'vercel.json',
  'netlify.toml'
)

foreach ($file in $files) {
  $source = Join-Path $projectRoot $file
  if (Test-Path -LiteralPath $source) {
    Copy-Item -LiteralPath $source -Destination (Join-Path $staging $file)
  }
}

foreach ($directory in @('src', 'public', 'api', 'netlify')) {
  $source = Join-Path $projectRoot $directory
  if (Test-Path -LiteralPath $source) {
    Copy-Item -LiteralPath $source -Destination (Join-Path $staging $directory) -Recurse
  }
}

Compress-Archive -Path (Join-Path $staging '*') -DestinationPath $zipPath -CompressionLevel Optimal
Remove-Item -LiteralPath $staging -Recurse -Force

Write-Host "Created: $zipPath" -ForegroundColor Green
Write-Host 'This package includes src/ and api/ proxy, and excludes .env files, node_modules, and dist.' -ForegroundColor Yellow
Write-Host 'You can deploy directly to Vercel via CLI (npx vercel) or upload/link your Git repository.' -ForegroundColor Cyan
