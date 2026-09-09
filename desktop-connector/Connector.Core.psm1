Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-PropertyValue($Object, [string]$Name, $Fallback = $null) {
    if ($null -eq $Object) { return $Fallback }
    $property = $Object.PSObject.Properties[$Name]
    if ($null -eq $property) { return $Fallback }
    return $property.Value
}

function Read-ConnectorConfig([string]$Path) {
    $config = Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
    $uri = [Uri]$config.supabaseUrl
    if ($uri.Scheme -ne 'https' -or $uri.Host -notmatch '^[a-z0-9-]+\.supabase\.co$' -or $uri.UserInfo) { throw 'Use the HTTPS project URL from Supabase.' }
    if ([string]::IsNullOrWhiteSpace($config.publishableKey) -or $config.publishableKey.StartsWith('sb_secret_')) { throw 'A public anon/publishable key is required, never a secret key.' }
    if ($config.publishableKey.StartsWith('eyJ')) {
        $payload = $config.publishableKey.Split('.')[1].Replace('-', '+').Replace('_', '/')
        $payload = $payload.PadRight($payload.Length + ((4 - $payload.Length % 4) % 4), '=')
        $claims = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($payload)) | ConvertFrom-Json
        if ($claims.role -ne 'anon') { throw 'Do not use a service-role key.' }
    }
    $parsedOwner = [Guid]::Empty
    if (-not [Guid]::TryParse($config.teamOwner, [ref]$parsedOwner)) { throw 'Set teamOwner to the business owner UUID.' }
    if ([string]::IsNullOrWhiteSpace($config.shopId) -or $config.shopId -eq 'all') { throw 'Choose one shop for each connector.' }
    if ($config.pollSeconds -lt 10) { throw 'pollSeconds must be at least 10.' }
    if ($config.source.mode -notin @('csv', 'odbc')) { throw 'Source mode must be csv or odbc.' }
    return $config
}

function Read-SourceRows($Config, [string]$ConnectionString) {
    $limit = [int](Get-PropertyValue $Config.source 'maxRows' 50000)
    if ($limit -lt 1 -or $limit -gt 500000) { throw 'maxRows must be between 1 and 500000.' }
    if ($Config.source.mode -eq 'csv') {
        $path = $Config.source.path
        if (Test-Path -LiteralPath $path -PathType Container) {
            $file = Get-ChildItem -LiteralPath $path -File -Filter $Config.source.pattern | Sort-Object LastWriteTimeUtc -Descending | Select-Object -First 1
        } else { $file = Get-Item -LiteralPath $path }
        if ($null -eq $file) { throw 'No matching CSV export was found.' }
        if (($file.LastWriteTimeUtc -gt [DateTime]::UtcNow.AddSeconds(-2))) { throw 'Export is still being written; waiting for the next poll.' }
        $beforeLength = $file.Length; $beforeTime = $file.LastWriteTimeUtc
        if ($beforeLength -gt 100MB) { throw 'CSV exceeds 100 MB; use a smaller export.' }
        $rows = @(Import-Csv -LiteralPath $file.FullName -Delimiter ([char]$Config.source.delimiter) -Encoding $Config.source.encoding)
        $after = Get-Item -LiteralPath $file.FullName
        if ($beforeLength -ne $after.Length -or $beforeTime -ne $after.LastWriteTimeUtc) { throw 'Export changed during reading; retrying next poll.' }
        if ($rows.Count -gt $limit) { throw 'Source exceeds configured maxRows; no records were sent.' }
        return $rows
    }
    if ([string]::IsNullOrWhiteSpace($ConnectionString)) { throw 'ODBC mode requires an encrypted read-only connection string from Setup-Connector.ps1.' }
    $query = $Config.source.query.Trim()
    if ($query -notmatch '^SELECT\s' -or $query.Contains(';') -or $query -match '(?i)\b(insert|update|delete|drop|alter|create|merge|exec|execute|into|grant|revoke|truncate)\b') {
        throw 'Only one SELECT query is accepted. Also use a database account restricted to SELECT.'
    }
    Add-Type -AssemblyName System.Data
    $connection = New-Object System.Data.Odbc.OdbcConnection($ConnectionString)
    try {
        $connection.Open()
        $command = $connection.CreateCommand(); $command.CommandText = $query; $command.CommandTimeout = 30
        $reader = $command.ExecuteReader()
        try {
            $result = New-Object 'System.Collections.Generic.List[object]'
            while ($reader.Read()) {
                if ($result.Count -ge $limit) { throw 'Source exceeds maxRows; no records were sent.' }
                $row = [ordered]@{}
                for ($i = 0; $i -lt $reader.FieldCount; $i++) {
                    $columnName = $reader.GetName($i)
                    if ($row.Contains($columnName)) { throw 'ODBC query has duplicate column names; alias them uniquely.' }
                    $row[$columnName] = if ($reader.IsDBNull($i)) { $null } else { $reader.GetValue($i) }
                }
                $result.Add([pscustomobject]$row)
            }
            return $result.ToArray()
        } finally { $reader.Dispose(); $command.Dispose() }
    } finally { $connection.Dispose() }
}

function Convert-SourceItems($Rows, $Config) {
    $fields = @('externalId','barcode','qrCode','name','category','brand','modelNo','color','frameType','size','hsnCode','purchasePrice','mrp','salePrice','gstRate','stockQty','minStockAlert','location')
    $numeric = @('purchasePrice','mrp','salePrice','gstRate','stockQty','minStockAlert')
    $required = @('externalId','barcode','name','purchasePrice','mrp','salePrice','stockQty')
    $ids = New-Object 'System.Collections.Generic.HashSet[string]' ([StringComparer]::Ordinal)
    $codes = New-Object 'System.Collections.Generic.Dictionary[string,string]' ([StringComparer]::Ordinal)
    $items = New-Object 'System.Collections.Generic.List[object]'
    $line = 1
    foreach ($row in $Rows) {
        $line++
        $item = [ordered]@{}
        foreach ($field in $fields) {
            $column = Get-PropertyValue $Config.columns $field
            if ($column) {
                if ($null -eq $row.PSObject.Properties[$column]) { throw "Missing mapped column '$column' (row $line). Check config.columns." }
                $value = Get-PropertyValue $row $column
            } else { $value = Get-PropertyValue $Config.defaults $field }
            if ($field -in $required -and ($null -eq $value -or [string]::IsNullOrWhiteSpace([string]$value))) { throw "Missing $field at row $line. No upload attempted." }
            if ($field -in $numeric) {
                $number = [decimal]0
                if (-not [decimal]::TryParse([string]$value, [Globalization.NumberStyles]::Number, [Globalization.CultureInfo]::InvariantCulture, [ref]$number) -or $number -lt 0) { throw "Invalid $field at row $line." }
                if ($field -in @('stockQty','minStockAlert') -and [decimal]::Truncate($number) -ne $number) { throw "$field must be a whole number at row $line." }
                if ($field -eq 'gstRate' -and $number -gt 100) { throw "Invalid GST at row $line." }
                $item[$field] = $number
            } else {
                if ($field -in @('barcode','qrCode') -and $null -ne $value -and $value -isnot [string]) { throw "Code column '$column' must be TEXT, not numeric. Preserve leading zeroes in the source query." }
                $item[$field] = if ($null -eq $value) { '' } else { ([string]$value).Trim() }
            }
        }
        if (-not $ids.Add($item.externalId)) { throw "Duplicate source item ID at row $line. No upload attempted." }
        foreach ($code in @($item.barcode,$item.qrCode)) {
            if (-not $code) { continue }
            if ($codes.ContainsKey($code) -and $codes[$code] -ne $item.externalId) { throw "One barcode/QR maps to multiple source items (row $line). No upload attempted." }
            $codes[$code] = $item.externalId
        }
        $items.Add([pscustomobject]$item)
    }
    return $items.ToArray()
}

function Get-ContentFingerprint([string]$Text) {
    $algorithm = [Security.Cryptography.SHA256]::Create()
    try { return ([BitConverter]::ToString($algorithm.ComputeHash([Text.Encoding]::UTF8.GetBytes($Text)))).Replace('-', '').ToLowerInvariant() }
    finally { $algorithm.Dispose() }
}

function Write-EncryptedObject([string]$Path, $Object) {
    $json = ConvertTo-Json -InputObject $Object -Depth 20 -Compress
    $encrypted = ConvertFrom-SecureString (ConvertTo-SecureString $json -AsPlainText -Force)
    Set-Content -LiteralPath ($Path + '.tmp') -Value $encrypted -Encoding UTF8
    Move-Item -LiteralPath ($Path + '.tmp') -Destination $Path -Force
}

function Read-EncryptedObject([string]$Path) {
    $secure = ConvertTo-SecureString (Get-Content -LiteralPath $Path -Raw)
    $credential = New-Object System.Management.Automation.PSCredential('connector', $secure)
    return ($credential.GetNetworkCredential().Password | ConvertFrom-Json)
}

function Invoke-SupabaseRequest($Config, [string]$Path, $Body, [string]$Token = '') {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $headers = @{ apikey = $Config.publishableKey }
    if ($Token) { $headers.Authorization = 'Bearer ' + $Token }
    $json = ConvertTo-Json -InputObject $Body -Depth 20 -Compress
    # Restrict calls to the validated project, and never print request bodies or auth headers.
    return Invoke-RestMethod -Uri ($Config.supabaseUrl.TrimEnd('/') + $Path) -Method Post -Headers $headers -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($json)) -TimeoutSec 45
}

Export-ModuleMember -Function *
