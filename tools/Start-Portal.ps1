param([switch]$Build, [switch]$Restart, [ValidateRange(1024,65535)][int]$Port=8080)
$ErrorActionPreference='Stop'
$repo=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$jar=Join-Path $repo 'cenima/target/cenima-0.0.1-SNAPSHOT.jar'
$url="http://127.0.0.1:$Port/"

function Test-PortalPortBusy {
    $listener=[System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback,$Port)
    $listener.Server.ExclusiveAddressUse=$true
    try { $listener.Start(); return $false }
    catch [System.Net.Sockets.SocketException] { return $true }
    finally { $listener.Stop() }
}

# Match the exact workspace JAR, including Java launcher/child processes.
# Never stop all Java processes or an unrelated service occupying this port.
$portalProcesses=@()
if ($env:OS -eq 'Windows_NT') {
    $jarPattern='(?i)(?:^|\s)-jar\s+"?'+[regex]::Escape($jar.Replace('\','/'))+'"?(?:\s|$)'
    $portalProcesses=@(Get-CimInstance Win32_Process -Filter "Name = 'java.exe' OR Name = 'javaw.exe'" |
        Where-Object { $_.CommandLine -and $_.CommandLine.Replace('\','/') -match $jarPattern })
}
$portPattern='(?:^|\s)--server\.port(?:=|\s+)'+$Port+'(?:\s|$)'
$onRequestedPort=@($portalProcesses | Where-Object {
    $_.CommandLine -match $portPattern -or ($Port -eq 8080 -and $_.CommandLine -notmatch '--server\.port')
})
$toStop=if ($Build) { $portalProcesses } else { $onRequestedPort }
if ($Restart) {
    foreach ($portalProcess in $toStop) {
        Write-Output "Stopping Star Cinema PID $($portalProcess.ProcessId)..."
        Stop-Process -Id $portalProcess.ProcessId -ErrorAction SilentlyContinue
    }
    foreach ($portalProcess in $toStop) {
        if (Get-Process -Id $portalProcess.ProcessId -ErrorAction SilentlyContinue) {
            Wait-Process -Id $portalProcess.ProcessId -Timeout 15 -ErrorAction Stop
        }
    }
} elseif ($Build -and $portalProcesses.Count) {
    throw 'Star Cinema is running and may lock the JAR. Use: ./tools/Start-Portal.ps1 -Build -Restart'
} elseif ($onRequestedPort.Count) {
    Write-Output "Star Cinema is already running or starting: $url"
    Write-Output 'To restart: ./tools/Start-Portal.ps1 -Restart'
    return
}
if (Test-PortalPortBusy) {
    throw "Port $Port is occupied by another process. No unrelated process was stopped. Choose a free port with -Port."
}

$localEnv=Join-Path $repo 'cenima/.local/env.ps1'
if (Test-Path -LiteralPath $localEnv) { . $localEnv }
if (!$env:DB_USERNAME -or !$env:DB_PASSWORD) { throw 'Configure DB_URL, DB_USERNAME and DB_PASSWORD, or load cenima/.local/env.ps1.' }
if ($Build) {
    & (Join-Path $repo 'cenima/mvnw.cmd') -B -f (Join-Path $repo 'cenima/pom.xml') package -DskipTests
    if ($LASTEXITCODE -ne 0) { throw 'Build failed.' }
}
if (!(Test-Path -LiteralPath $jar)) { throw 'Build the application first: ./tools/Start-Portal.ps1 -Build' }
Push-Location (Join-Path $repo 'cenima')
try {
    Write-Output "Star Cinema: $url (Ctrl+C to stop)"
    & java -jar $jar --spring.profiles.active=integrated --server.address=127.0.0.1 "--server.port=$Port"
    if ($LASTEXITCODE -ne 0) { throw "Star Cinema exited with code $LASTEXITCODE. Check the startup error above." }
} finally { Pop-Location }
