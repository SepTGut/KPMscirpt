$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$staging = Join-Path $projectRoot 'netlify-upload'
$zipPath = Join-Path $projectRoot 'kpm-netlify-upload.zip'

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
  'netlify.toml'
)

foreach ($file in $files) {
  $source = Join-Path $projectRoot $file
  if (Test-Path -LiteralPath $source) {
    Copy-Item -LiteralPath $source -Destination (Join-Path $staging $file)
  }
}

foreach ($directory in @('src', 'public', 'netlify')) {
  $source = Join-Path $projectRoot $directory
  if (Test-Path -LiteralPath $source) {
    Copy-Item -LiteralPath $source -Destination (Join-Path $staging $directory) -Recurse
  }
}

Compress-Archive -Path (Join-Path $staging '*') -DestinationPath $zipPath -CompressionLevel Optimal
Remove-Item -LiteralPath $staging -Recurse -Force

Write-Host "Created: $zipPath"
Write-Host 'This package intentionally excludes .env files, node_modules, and dist.'
