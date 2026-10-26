param([string]$SqlServer = 'localhost', [int]$Port = 18081)
$ErrorActionPreference = 'Stop'
if (-not $env:TEST_DB_URL -or $env:TEST_DB_URL -notmatch 'databaseName=CINEMA_THAO_ETICKET_TEST(?:;|$)') { throw 'Load TEST_DB_* for the dedicated CINEMA_THAO_ETICKET_TEST database first.' }
$backendPath = (Resolve-Path (Join-Path $PSScriptRoot '../cenima')).Path
$jarPath = Join-Path $backendPath 'target/cenima-0.0.1-SNAPSHOT.jar'
$javaPath = Join-Path $env:JAVA_HOME 'bin/java.exe'
if (-not (Test-Path -LiteralPath $javaPath)) { throw 'JAVA_HOME must point to Java 21.' }
if (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) { throw 'Test port is occupied. Select another -Port; no existing process was stopped.' }
if (-not (Test-Path -LiteralPath $jarPath)) { throw 'Run mvn package first.' }
New-Item -ItemType Directory -Force (Join-Path $backendPath '.local') | Out-Null
Add-Type -AssemblyName System.Net.Http
$client = New-Object System.Net.Http.HttpClient
$client.Timeout = [TimeSpan]::FromSeconds(10)
$serverProcess = $null
$showtimeId = $null
$originalDbUrl = $env:DB_URL; $originalDbUser = $env:DB_USERNAME; $originalDbPassword = $env:DB_PASSWORD; $originalDebug = $env:DEBUG
function Sql([string]$Query) {
    $lines = & sqlcmd -b -S $SqlServer -E -C -d CINEMA_THAO_ETICKET_TEST -h -1 -W -Q $Query
    if ($LASTEXITCODE -ne 0) { throw 'SQL fixture operation failed.' }
    return $lines
}
function Api([string]$Method,[string]$Path,[int]$Actor=0,$Body=$null) {
    $request = New-Object System.Net.Http.HttpRequestMessage([System.Net.Http.HttpMethod]::new($Method), ('http://127.0.0.1:' + $Port + $Path))
    $request.Headers.Add('Accept','application/json')
    if ($Actor -gt 0) { $request.Headers.Add('X-User-Id',[string]$Actor) }
    if ($null -ne $Body) { $request.Content = New-Object System.Net.Http.StringContent(($Body | ConvertTo-Json -Depth 12 -Compress),[Text.Encoding]::UTF8,'application/json') }
    try {
        $response = $client.SendAsync($request).GetAwaiter().GetResult()
        try {
            $raw = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
            $data = $null
            if ($raw) { try { $data = $raw | ConvertFrom-Json } catch { } }
            return [pscustomobject]@{Status=[int]$response.StatusCode;Data=$data;Cache=[string]$response.Headers.CacheControl;Mime=[string]$response.Content.Headers.ContentType;Raw=$raw}
        } finally { $response.Dispose() }
    } finally { $request.Dispose() }
}
function Expect($Actual,$Expected,[string]$Label) { if ($Actual -ne $Expected) { throw ($Label + ': expected ' + $Expected + ', got ' + $Actual) } }
function Stop-Server {
    if ($null -ne $script:serverProcess -and -not $script:serverProcess.HasExited) {
        Stop-Process -Id $script:serverProcess.Id -Force
        $script:serverProcess.WaitForExit()
    }
    $script:serverProcess = $null
}
function Start-Server([int]$Version) {
    Stop-Server
    $script:serverProcess = Start-Process -FilePath $javaPath -WindowStyle Hidden -WorkingDirectory $backendPath -PassThru `
        -ArgumentList @('-jar',('"' + $jarPath + '"'),'--spring.profiles.active=demo',('--server.port=' + $Port),('--ticket.qr-max-version=' + $Version),'--ticket.demo-key-directory=.local/http-test-keys') `
        -RedirectStandardOutput (Join-Path $backendPath '.local/http-smoke-out.log') -RedirectStandardError (Join-Path $backendPath '.local/http-smoke-error.log')
    $deadline = [DateTime]::UtcNow.AddSeconds(45)
    do {
        if ($script:serverProcess.HasExited) { throw 'Test server exited; inspect .local/http-smoke-*.log.' }
        try { if ((Api GET '/api/tickets/algorithms').Status -eq 200) { return } } catch { }
        Start-Sleep -Milliseconds 300
    } while ([DateTime]::UtcNow -lt $deadline)
    throw 'Test server startup timed out.'
}
try {
    $env:DB_URL=$env:TEST_DB_URL; $env:DB_USERNAME=$env:TEST_DB_USERNAME; $env:DB_PASSWORD=$env:TEST_DB_PASSWORD; $env:DEBUG='false'
    Start-Server 25
    $accounts=(Api GET '/api/demo/accounts').Data
    $customer=[int]($accounts | Where-Object role -eq 'CUSTOMER' | Select-Object -First 1).userId
    $staff=[int]($accounts | Where-Object role -eq 'STAFF' | Select-Object -First 1).userId
    $showtimeId=[int]((Sql "SET NOCOUNT ON; INSERT Showtimes(MovieID,RoomID,StartTime,Price) SELECT TOP 1 s.MovieID,s.RoomID,DATEADD(DAY,3,CONVERT(datetime,SYSUTCDATETIME() AT TIME ZONE 'UTC' AT TIME ZONE 'SE Asia Standard Time')),75000 FROM Showtimes s JOIN Movies m ON m.MovieID=s.MovieID WHERE m.Status=1; SELECT CAST(SCOPE_IDENTITY() AS int);") | Where-Object { $_ -match '^\d+$' } | Select-Object -First 1)
    if ($showtimeId -le 0 -or $customer -le 0 -or $staff -le 0) { throw 'Missing seeded data.' }
    $movies=Api GET '/api/movies'; Expect $movies.Status 200 'Movie API'
    $seatMap=Api GET ('/api/showtimes/' + $showtimeId + '/seats'); Expect $seatMap.Status 200 'Seat API'
    $seatId=[int]($seatMap.Data | Where-Object status -eq 'AVAILABLE' | Select-Object -First 1).seatId
    $booking=Api POST '/api/bookings' $customer @{showtimeId=$showtimeId;seatIds=@($seatId)}
    Expect $booking.Status 201 'Booking API'; Expect $booking.Data.status 'PAID' 'Paid booking'
    $ticketId=[int]$booking.Data.tickets[0].ticketId
    Expect $booking.Data.tickets[0].ticketCode.Length 32 'TicketCode length'
    $path='/api/tickets/' + $ticketId
    Expect (Api GET $path).Status 401 'Anonymous ticket view'
    Expect (Api GET $path $staff).Status 403 'Other user ticket view'
    Expect (Api POST ($path + '/token') $customer @{algorithm='ES256'}).Status 503 'Missing provider'
    Expect (Api POST ($path + '/token') $customer @{algorithm='HS256'}).Status 400 'Forbidden algorithm'
    $issued=Api POST ($path + '/token') $customer @{algorithm='RS256'}
    Expect $issued.Status 200 'Issue'; Expect $issued.Data.qr.mode 'JWT' 'Direct QR'; Expect $issued.Cache 'no-store' 'No-store JWT response'
    Expect (Api POST '/api/tickets/verify' $customer @{value=$issued.Data.token}).Status 403 'Customer cannot verify'
    Expect (Api POST '/api/tickets/verify' $staff @{value=$issued.Data.token}).Data.checkedIn $false 'Verify does not consume'
    Expect (Api POST '/api/tickets/verify' $staff @{value=('a' * 32769)}).Status 400 'Size limit'
    $tampered=$issued.Data.token.Split('.'); $tampered[1]='eyJ0aWNrZXRJZCI6OTk5fQ'
    Expect (Api POST '/api/tickets/verify' $staff @{value=($tampered -join '.')}).Status 422 'Tampered JWT'
    Expect (Api GET '/demo/index.html').Status 200 'Ticket HTML'
    Expect (Api GET '/demo/check-in.html').Status 200 'Check-in HTML'
    Expect (Api GET '/demo/app.js').Status 200 'Frontend JS'
    Expect (Api GET '/demo/vendor/qr-scanner.min.js').Status 200 'Local scanner'
    Expect (Api GET '/demo/vendor/qr-scanner-worker.min.js').Status 200 'Local QR worker'
    Start-Server 5
    Expect (Api POST '/api/tickets/verify' $staff @{value=$issued.Data.token}).Status 200 'RSA key survives process restart'
    $reference=Api POST ($path + '/token') $customer @{algorithm='RS256'}
    Expect $reference.Status 200 'Issue reference'; Expect $reference.Data.qr.mode 'REFERENCE' 'Reference QR'
    Expect $reference.Data.expiresAt $issued.Data.expiresAt 'Reissue expiration'
    Start-Server 5
    Expect (Api POST '/api/tickets/verify' $staff @{value=$reference.Data.qr.content}).Status 200 'DB reference survives process restart'
    Expect (Api POST '/api/tickets/verify' $staff @{value=$reference.Data.qr.content}).Data.checkedIn $false 'Repeated reference verification'
    Expect (Api POST '/api/tickets/check-in' $staff @{value=$reference.Data.qr.content}).Data.checkedIn $true 'Check-in'
    Expect (Api POST '/api/tickets/check-in' $staff @{value=$issued.Data.token}).Status 409 'Replay with other JWT'
    Write-Output 'PASS: booking/movie APIs, ownership/roles, providers, JWT, both QR modes, no-store, two process restarts, verify, check-in, replay, static UI assets.'
} finally {
    Stop-Server
    if ($showtimeId -gt 0) {
        $null=Sql "SET QUOTED_IDENTIFIER ON; DELETE r FROM TicketQrReferences r JOIN Tickets t ON t.TicketID=r.TicketID WHERE t.ShowtimeID=$showtimeId; DELETE Tickets WHERE ShowtimeID=$showtimeId; DELETE d FROM BookingDetails d JOIN Bookings b ON b.BookingID=d.BookingID WHERE b.ShowtimeID=$showtimeId; DELETE Bookings WHERE ShowtimeID=$showtimeId; DELETE Showtimes WHERE ShowtimeID=$showtimeId;"
    }
    $client.Dispose()
    $env:DB_URL=$originalDbUrl; $env:DB_USERNAME=$originalDbUser; $env:DB_PASSWORD=$originalDbPassword; $env:DEBUG=$originalDebug
}
