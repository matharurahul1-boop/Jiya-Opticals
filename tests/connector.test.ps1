$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../desktop-connector/Connector.Core.psm1') -Force
$config = Get-Content (Join-Path $PSScriptRoot '../desktop-connector/config.example.json') -Raw | ConvertFrom-Json
$config.source.path = (Resolve-Path (Join-Path $PSScriptRoot '../desktop-connector/sample-items.csv')).Path
$rows = @(Read-SourceRows $config '')
$items = @(Convert-SourceItems $rows $config)
if ($items.Count -ne 2) { throw 'CSV row count failed' }
if ($items[0].barcode -cne '0000123456') { throw 'Leading zeroes were lost' }
if ($items[0].qrCode -cne 'https://example.invalid/frame/AbC001') { throw 'QR payload was changed' }
if ($items[0].name -cne 'Demo frame, black') { throw 'Quoted comma parsing failed' }
if ($items[1].stockQty -ne 0) { throw 'Zero stock was not preserved' }
$duplicate = @($rows[0],$rows[0])
$rejected = $false
try { $null = Convert-SourceItems $duplicate $config } catch { $rejected = $true }
if (-not $rejected) { throw 'Duplicate source IDs accepted' }
$numericCode = $rows[0] | ConvertTo-Json | ConvertFrom-Json
$numericCode.Barcode = 12345
$rejected = $false
try { $null = Convert-SourceItems @($numericCode) $config } catch { $rejected = $true }
if (-not $rejected) { throw 'Numeric barcode column accepted' }
$bad = $rows[0] | ConvertTo-Json | ConvertFrom-Json
$bad.SalePrice = '-10'
$rejected = $false
try { $null = Convert-SourceItems @($bad) $config } catch { $rejected = $true }
if (-not $rejected) { throw 'Negative price accepted' }
foreach ($file in Get-ChildItem (Join-Path $PSScriptRoot '../desktop-connector') -Include '*.ps1','*.psm1' -Recurse) {
    $tokens = $null; $errors = $null
    $null = [Management.Automation.Language.Parser]::ParseFile($file.FullName, [ref]$tokens, [ref]$errors)
    if ($errors.Count) { throw ($errors | Out-String) }
}
Write-Host 'PASS: CSV mapping, quoted commas, original codes, zero stock, duplicate rejection, numeric-code rejection, price validation and PowerShell syntax.'
