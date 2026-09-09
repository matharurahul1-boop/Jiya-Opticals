param([string]$ConfigPath = (Join-Path $PSScriptRoot 'config.json'))
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'Connector.Core.psm1') -Force
$ConfigPath = (Resolve-Path -LiteralPath $ConfigPath).Path
$config = Read-ConnectorConfig $ConfigPath
$configDirectory = Split-Path -Parent $ConfigPath
$stateDirectory = Join-Path $configDirectory '.state'
New-Item -ItemType Directory -Path $stateDirectory -Force | Out-Null
Write-Host 'Use a verified app account assigned to ONLY this shop. Do not enter the Drishti password.'
$login = Get-Credential -Message 'Supabase app email and password'
if ($null -eq $login) { throw 'Sign-in cancelled.' }
$session = Invoke-SupabaseRequest $config '/auth/v1/token?grant_type=password' @{email=$login.UserName;password=$login.GetNetworkCredential().Password}
$null = Invoke-SupabaseRequest $config '/rest/v1/rpc/optical_drishti_import' @{team_owner=$config.teamOwner;target_shop=$config.shopId;source_id=$config.sourceId;items=@()} $session.access_token
Write-EncryptedObject (Join-Path $stateDirectory 'session.encrypted') $session
if ($config.source.mode -eq 'odbc') {
    $secret = Read-Host 'Enter the read-only ODBC connection string (saved encrypted for this Windows user)' -AsSecureString
    $credential = New-Object System.Management.Automation.PSCredential('odbc', $secret)
    Write-EncryptedObject (Join-Path $stateDirectory 'source.encrypted') @{connectionString=$credential.GetNetworkCredential().Password}
}
Write-Host 'Connected to the selected shop. Next run Sync-Drishti.ps1 -Preview to verify source mapping, then -Once to upload.'
