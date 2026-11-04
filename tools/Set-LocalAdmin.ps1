param(
    [string]$Server = 'localhost',
    [ValidatePattern('^[A-Za-z0-9@._+-]{1,100}$')][string]$Account = 'admin123@'
)
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$localDir = Join-Path $repo 'cenima/.local'
New-Item -ItemType Directory -Force $localDir | Out-Null
$classpathFile = Join-Path $localDir 'admin-tool-classpath.txt'
$sqlPath = Join-Path $localDir ('admin-setup-' + [Guid]::NewGuid().ToString('N') + '.sql')
$priorPassword = $env:CINEMA_PASSWORD_TO_HASH
$securePassword = Read-Host 'Local admin password (12+ characters, at most 72 UTF-8 bytes)' -AsSecureString
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
try {
    $localPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
    if ($localPassword.Length -lt 12 -or [Text.Encoding]::UTF8.GetByteCount($localPassword) -gt 72) {
        throw 'Password must have at least 12 characters and at most 72 UTF-8 bytes.'
    }
    & (Join-Path $repo 'cenima/mvnw.cmd') -q -f (Join-Path $repo 'cenima/pom.xml') dependency:build-classpath ('-Dmdep.outputFile=' + $classpathFile)
    if ($LASTEXITCODE -ne 0) { throw 'Cannot build password tool classpath.' }
    $javaCommand = if ($env:JAVA_HOME) { Join-Path $env:JAVA_HOME 'bin/java.exe' } else { 'java' }
    $env:CINEMA_PASSWORD_TO_HASH = $localPassword
    $hash = & $javaCommand --class-path (Get-Content -Raw -LiteralPath $classpathFile).Trim() (Join-Path $PSScriptRoot 'HashPassword.java')
    if ($LASTEXITCODE -ne 0 -or $hash -notmatch '^\$2[aby]\$\d\d\$[./A-Za-z0-9]{53}$') { throw 'BCrypt generation failed.' }
    @"
SET NOCOUNT ON;
SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF DB_NAME() <> 'CINEMA_THAO_ETICKET_DEMO' THROW 51000,'Local demo database only',1;
IF (SELECT COUNT(*) FROM Users u JOIN Roles r ON r.RoleID=u.RoleID WHERE u.Email IN ('admin@cinema.test','$Account') AND r.RoleName='ADMIN') <> 1
    THROW 51001,'Expected exactly one existing seed or configured admin; nothing changed',1;
DECLARE @AdminID INT=(SELECT u.UserID FROM Users u JOIN Roles r ON r.RoleID=u.RoleID WHERE u.Email IN ('admin@cinema.test','$Account') AND r.RoleName='ADMIN');
UPDATE Users SET Email='$Account',PasswordHash='$hash' WHERE UserID=@AdminID;
UPDATE RefreshTokens SET IsRevoked=1 WHERE UserID=@AdminID;
COMMIT;
"@ | Set-Content -LiteralPath $sqlPath -Encoding UTF8
    & sqlcmd -b -S $Server -E -C -d CINEMA_THAO_ETICKET_DEMO -i $sqlPath
    if ($LASTEXITCODE -ne 0) { throw 'Local admin setup failed.' }
    $escapedPassword = $localPassword.Replace("'", "''")
    @"
`$env:CINEMA_ADMIN_EMAIL = '$Account'
`$env:CINEMA_ADMIN_PASSWORD = '$escapedPassword'
"@ | Set-Content -LiteralPath (Join-Path $localDir 'admin-auth.ps1') -Encoding UTF8
    Write-Output "Local admin configured: $Account. Credentials saved in ignored cenima/.local/admin-auth.ps1."
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
    $securePassword.Dispose()
    $localPassword = $null
    $escapedPassword = $null
    $env:CINEMA_PASSWORD_TO_HASH = $priorPassword
    if (Test-Path -LiteralPath $sqlPath) { Remove-Item -LiteralPath $sqlPath -Force }
}
