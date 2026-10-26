param([string]$Server = 'localhost')
$ErrorActionPreference = 'Stop'
$localDir = Join-Path $PSScriptRoot '../cenima/.local'
New-Item -ItemType Directory -Force $localDir | Out-Null
$envPath = Join-Path $localDir 'env.ps1'
if (Test-Path -LiteralPath $envPath) { throw 'Local credentials already exist. Reuse .local/env.ps1; no account was changed.' }
$bytes = New-Object byte[] 32
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
$rng.Dispose()
$dbPassword = [Convert]::ToBase64String($bytes) + '!a1'
$loginName = 'cinema_ngoc_' + [Guid]::NewGuid().ToString('N').Substring(0,12)
$sqlPath = Join-Path $localDir 'provision.sql'
@"
USE master;
CREATE LOGIN [$loginName] WITH PASSWORD=N'$dbPassword', CHECK_POLICY=ON;
USE CINEMA_THAO_ETICKET_DEMO;
CREATE USER [$loginName] FOR LOGIN [$loginName];
ALTER ROLE db_datareader ADD MEMBER [$loginName];
ALTER ROLE db_datawriter ADD MEMBER [$loginName];
USE CINEMA_THAO_ETICKET_TEST;
CREATE USER [$loginName] FOR LOGIN [$loginName];
ALTER ROLE db_datareader ADD MEMBER [$loginName];
ALTER ROLE db_datawriter ADD MEMBER [$loginName];
"@ | Set-Content -LiteralPath $sqlPath -Encoding UTF8
try {
    & sqlcmd -b -S $Server -E -C -i $sqlPath
    if ($LASTEXITCODE -ne 0) { throw 'Provisioning SQL failed.' }
    @"
`$env:DB_URL = 'jdbc:sqlserver://localhost:1433;databaseName=CINEMA_THAO_ETICKET_DEMO;encrypt=true;trustServerCertificate=true'
`$env:DB_USERNAME = '$loginName'
`$env:DB_PASSWORD = '$dbPassword'
`$env:TEST_DB_URL = 'jdbc:sqlserver://localhost:1433;databaseName=CINEMA_THAO_ETICKET_TEST;encrypt=true;trustServerCertificate=true'
`$env:TEST_DB_USERNAME = '$loginName'
`$env:TEST_DB_PASSWORD = '$dbPassword'
"@ | Set-Content -LiteralPath $envPath -Encoding UTF8
    Write-Output 'Created scoped local login. Credentials are in ignored cenima/.local/env.ps1.'
} finally {
    Remove-Item -LiteralPath $sqlPath -Force
}
