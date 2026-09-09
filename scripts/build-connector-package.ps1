$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$source = Join-Path $root 'desktop-connector'
$publicDirectory = Join-Path $root 'public'
New-Item -ItemType Directory -Force -Path $publicDirectory | Out-Null
$files = @('Connector.Core.psm1','Setup-Connector.ps1','Sync-Drishti.ps1','Install-Startup.ps1','config.example.json','sample-items.csv','README.md') | ForEach-Object { Join-Path $source $_ }
$files += Join-Path $root 'supabase/LIVE_SETUP.sql'
$files += Join-Path $root 'supabase/VERIFY_LIVE.sql'
# Explicit allowlist: never include config.json, .state, local credentials, or logs.
Compress-Archive -LiteralPath $files -DestinationPath (Join-Path $publicDirectory 'drishti-connector.zip') -Force
Write-Host 'Built public/drishti-connector.zip (public configuration template only).'
