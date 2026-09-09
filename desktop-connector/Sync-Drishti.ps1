param([string]$ConfigPath = (Join-Path $PSScriptRoot 'config.json'), [switch]$Once, [switch]$Preview, [switch]$ResetCheckpoint)
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'Connector.Core.psm1') -Force
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$ConfigPath = (Resolve-Path -LiteralPath $ConfigPath).Path
$config = Read-ConnectorConfig $ConfigPath
$stateDirectory = Join-Path (Split-Path -Parent $ConfigPath) '.state'
New-Item -ItemType Directory -Path $stateDirectory -Force | Out-Null
$lockPath = Join-Path $stateDirectory 'connector.lock'
try { $processLock = [IO.File]::Open($lockPath, 'OpenOrCreate', 'ReadWrite', 'None') }
catch { throw 'Another connector is using this configuration. Stop it before starting another.' }
$checkpointPath = Join-Path $stateDirectory 'checkpoint.json'
$sessionPath = Join-Path $stateDirectory 'session.encrypted'
$sourcePath = Join-Path $stateDirectory 'source.encrypted'
$statusPath = Join-Path $stateDirectory 'status.json'
$scope = Get-ContentFingerprint ($config.supabaseUrl + '|' + $config.teamOwner + '|' + $config.shopId + '|' + $config.sourceId)
$known = @{}
if ((Test-Path -LiteralPath $checkpointPath) -and -not $ResetCheckpoint) {
    $checkpoint = Get-Content -LiteralPath $checkpointPath -Raw | ConvertFrom-Json
    if ($checkpoint.scope -eq $scope) { foreach ($property in $checkpoint.hashes.PSObject.Properties) { $known[$property.Name] = [string]$property.Value } }
}
$failures = 0
try {
    do {
        try {
            $connectionString = if (Test-Path -LiteralPath $sourcePath) { (Read-EncryptedObject $sourcePath).connectionString } else { '' }
            $rows = @(Read-SourceRows $config $connectionString)
            $items = @(Convert-SourceItems $rows $config)
            if ($Preview) {
                Write-Host ('Validated {0} source items. Preview makes NO cloud writes.' -f $items.Count)
                $items | Select-Object -First 5 externalId,barcode,qrCode,name,salePrice,stockQty | Format-Table -AutoSize
                break
            }
            $pending = @($items | Where-Object {
                $hash = Get-ContentFingerprint (ConvertTo-Json -InputObject $_ -Depth 5 -Compress)
                -not $known.ContainsKey($_.externalId) -or $known[$_.externalId] -ne $hash
            })
            for ($offset = 0; $offset -lt $pending.Count; $offset += 200) {
                if (-not (Test-Path -LiteralPath $sessionPath)) { throw 'Run Setup-Connector.ps1 first.' }
                $session = Read-EncryptedObject $sessionPath
                $now = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
                if ([long]$session.expires_at -le $now + 120) {
                    $session = Invoke-SupabaseRequest $config '/auth/v1/token?grant_type=refresh_token' @{refresh_token=$session.refresh_token}
                    Write-EncryptedObject $sessionPath $session
                }
                $batch = @($pending[$offset..([Math]::Min($pending.Count - 1, $offset + 199))])
                $result = Invoke-SupabaseRequest $config '/rest/v1/rpc/optical_drishti_import' @{team_owner=$config.teamOwner;target_shop=$config.shopId;source_id=$config.sourceId;items=$batch} $session.access_token
                foreach ($item in $batch) { $known[$item.externalId] = Get-ContentFingerprint (ConvertTo-Json -InputObject $item -Depth 5 -Compress) }
                # Advance only after server acknowledgement; retries are idempotent on the server too.
                $checkpoint = @{scope=$scope;hashes=$known}
                ConvertTo-Json -InputObject $checkpoint -Depth 5 | Set-Content -LiteralPath ($checkpointPath + '.tmp') -Encoding UTF8
                Move-Item -LiteralPath ($checkpointPath + '.tmp') -Destination $checkpointPath -Force
                Write-Host ('Synced: {0} added, {1} updated, {2} unchanged.' -f $result.added,$result.updated,$result.unchanged)
            }
            @{checkedAt=[DateTime]::UtcNow.ToString('o');state='ok';sourceRows=$items.Count;sent=$pending.Count} | ConvertTo-Json | Set-Content -LiteralPath $statusPath -Encoding UTF8
            $failures = 0
            if ($Once) { Write-Host 'Sync completed.' }
        } catch {
            $failures++
            # Error bodies can contain item data. Keep background status free of credentials and raw responses.
            @{checkedAt=[DateTime]::UtcNow.ToString('o');state='error';message='Source or cloud operation failed. Run interactively with -Preview/-Once; check mapping, permissions and session.'} | ConvertTo-Json | Set-Content -LiteralPath $statusPath -Encoding UTF8
            if ($Once -or $Preview) { throw }
            Write-Warning 'Sync failed; retrying with backoff. Check .state/status.json and run -Once for details.'
        }
        if (-not $Once -and -not $Preview) { Start-Sleep -Seconds ([Math]::Min(300, [int]$config.pollSeconds * [Math]::Pow(2, [Math]::Min(4,$failures)))) }
    } while (-not $Once -and -not $Preview)
} finally { $processLock.Dispose() }
