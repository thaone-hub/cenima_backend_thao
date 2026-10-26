param([string]$Server='localhost')
$ErrorActionPreference='Stop'
$repo=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$localDir=Join-Path $repo 'cenima/.local'
New-Item -ItemType Directory -Force $localDir | Out-Null
$credentials=Join-Path $localDir 'demo-auth.ps1'
if (Test-Path -LiteralPath $credentials) { throw 'Demo credentials already exist. Reuse .local/demo-auth.ps1; no password was changed.' }
$bytes=New-Object byte[] 32
$rng=[System.Security.Cryptography.RandomNumberGenerator]::Create();$rng.GetBytes($bytes);$rng.Dispose()
$localPassword=[Convert]::ToBase64String($bytes)+'!a1'
$priorPassword=$env:CINEMA_PASSWORD_TO_HASH
$classpathFile=Join-Path $localDir 'tool-classpath.txt'
$sqlPath=Join-Path $localDir 'bootstrap-demo.sql'
try {
    & (Join-Path $repo 'cenima/mvnw.cmd') -q -f (Join-Path $repo 'cenima/pom.xml') dependency:build-classpath ('-Dmdep.outputFile='+$classpathFile)
    if ($LASTEXITCODE -ne 0) { throw 'Cannot build library classpath.' }
    $env:CINEMA_PASSWORD_TO_HASH=$localPassword
    $hash=& (Join-Path $env:JAVA_HOME 'bin/java.exe') --class-path (Get-Content -Raw -LiteralPath $classpathFile).Trim() (Join-Path $PSScriptRoot 'HashPassword.java')
    if ($LASTEXITCODE -ne 0 -or $hash -notmatch '^\$2[aby]\$\d\d\$[./A-Za-z0-9]{53}$') { throw 'BCrypt generation failed.' }
    @"
SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF DB_NAME() <> 'CINEMA_THAO_ETICKET_DEMO' THROW 51000,'Demo database only',1;
IF (SELECT COUNT(*) FROM Users WHERE Email IN ('customer@cinema.test','staff@cinema.test','admin@cinema.test') AND PasswordHash LIKE 'DEMO_HASH_%')<>3
    THROW 51001,'Existing passwords are not seed placeholders; nothing was changed',1;
UPDATE Users SET PasswordHash='$hash' WHERE Email IN ('customer@cinema.test','staff@cinema.test','admin@cinema.test') AND PasswordHash LIKE 'DEMO_HASH_%';
COMMIT;
"@ | Set-Content -LiteralPath $sqlPath -Encoding UTF8
    & sqlcmd -b -S $Server -E -C -d CINEMA_THAO_ETICKET_DEMO -i $sqlPath
    if ($LASTEXITCODE -ne 0) { throw 'Demo password setup failed.' }
    ("`$env:CINEMA_DEMO_PASSWORD = '"+$localPassword+"'") | Set-Content -LiteralPath $credentials -Encoding UTF8
    Write-Output 'Real BCrypt passwords configured for the three demo accounts. Load cenima/.local/demo-auth.ps1; no password was printed.'
} finally {
    $env:CINEMA_PASSWORD_TO_HASH=$priorPassword
    if (Test-Path -LiteralPath $sqlPath) { Remove-Item -LiteralPath $sqlPath -Force }
}
