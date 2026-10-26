param([string]$Server = 'localhost', [ValidateSet('CINEMA_THAO_ETICKET_DEMO','CINEMA_THAO_ETICKET_TEST')][string]$Database = 'CINEMA_THAO_ETICKET_DEMO')
$ErrorActionPreference = 'Stop'
$scripts = Join-Path $PSScriptRoot '../database/sqlserver'
& sqlcmd -b -S $Server -E -C -i (Join-Path $scripts '00-create-demo.sql')
if ($LASTEXITCODE -ne 0) { throw 'Database creation failed' }
$tableCount = & sqlcmd -b -S $Server -E -C -d $Database -h -1 -W -Q 'SET NOCOUNT ON; SELECT COUNT(*) FROM sys.tables;'
if ($LASTEXITCODE -ne 0) { throw 'Database inspection failed' }
if ([int]($tableCount | Where-Object { $_ -match '^\d+$' } | Select-Object -First 1) -ne 0) {
    throw 'Database is not empty. Use the upgrade scripts explicitly; existing data was preserved.'
}
foreach ($file in @('01-schema.sql','03-seed-demo.sql','04-ensure-indexes.sql','06-qr-references.sql','07-refresh-token-capacity.sql')) {
    & sqlcmd -b -S $Server -E -C -d $Database -f 65001 -i (Join-Path $scripts $file)
    if ($LASTEXITCODE -ne 0) { throw ('SQL script failed: ' + $file) }
}
