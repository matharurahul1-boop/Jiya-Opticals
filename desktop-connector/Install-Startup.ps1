param([string]$ConfigPath = (Join-Path $PSScriptRoot 'config.json'), [switch]$Remove)
$ErrorActionPreference = 'Stop'
$ConfigPath = (Resolve-Path -LiteralPath $ConfigPath).Path
Import-Module (Join-Path $PSScriptRoot 'Connector.Core.psm1') -Force
$suffix = (Get-ContentFingerprint $ConfigPath).Substring(0,12)
$taskName = 'JiyaDrishtiSync-' + $suffix
if ($Remove) { Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue; Unregister-ScheduledTask -TaskName $taskName -Confirm:$false; Write-Host 'Startup task stopped and removed.'; exit }
if (-not (Test-Path -LiteralPath (Join-Path (Split-Path -Parent $ConfigPath) '.state/session.encrypted'))) { throw 'Run Setup-Connector.ps1 and a successful -Once sync before installing startup.' }
$scriptPath = Join-Path $PSScriptRoot 'Sync-Drishti.ps1'
if ($ConfigPath.Contains('"') -or $scriptPath.Contains('"')) { throw 'Unsupported quotation mark in path.' }
$identity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
$shellPath = (Get-Process -Id $PID).Path
$action = New-ScheduledTaskAction -Execute $shellPath -Argument ('-NoProfile -ExecutionPolicy RemoteSigned -WindowStyle Hidden -File "{0}" -ConfigPath "{1}"' -f $scriptPath,$ConfigPath) -WorkingDirectory $PSScriptRoot
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $identity
$principal = New-ScheduledTaskPrincipal -UserId $identity -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew -StartWhenAvailable
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null
Start-ScheduledTask -TaskName $taskName
Write-Host 'Installed for this Windows user at sign-in. The task runs hidden; the computer must be awake and the user signed in.'
