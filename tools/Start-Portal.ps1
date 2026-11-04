param([switch]$Build, [ValidateRange(1024,65535)][int]$Port=8080)
$ErrorActionPreference='Stop'
$repo=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$localEnv=Join-Path $repo 'cenima/.local/env.ps1'
if (Test-Path -LiteralPath $localEnv) { . $localEnv }
if (!$env:DB_USERNAME -or !$env:DB_PASSWORD) { throw 'Configure DB_URL, DB_USERNAME and DB_PASSWORD, or load cenima/.local/env.ps1.' }
if ($Build) {
    & (Join-Path $repo 'cenima/mvnw.cmd') -B -f (Join-Path $repo 'cenima/pom.xml') package -DskipTests
    if ($LASTEXITCODE -ne 0) { throw 'Build failed.' }
}
$jar=Join-Path $repo 'cenima/target/cenima-0.0.1-SNAPSHOT.jar'
if (!(Test-Path -LiteralPath $jar)) { throw 'Build the application first: ./tools/Start-Portal.ps1 -Build' }
Push-Location (Join-Path $repo 'cenima')
try {
    Write-Output "Cinema Space: http://127.0.0.1:$Port/ (Ctrl+C to stop)"
    & java -jar $jar --spring.profiles.active=integrated --server.address=127.0.0.1 "--server.port=$Port"
} finally { Pop-Location }
