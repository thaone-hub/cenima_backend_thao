param([string]$Server='localhost')
$ErrorActionPreference='Stop'
$repo=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$localDir=Join-Path $repo 'cenima/.local'
New-Item -ItemType Directory -Force $localDir | Out-Null
$stamp=[DateTimeOffset]::UtcNow.ToOffset([TimeSpan]::FromHours(7)).ToString('yyyyMMdd_HHmmss')
$Database='CINEMA_THAO_ETICKET_MIGRATION_TEST_'+$stamp+'_'+[Guid]::NewGuid().ToString('N').Substring(0,6)
function Query([string]$Sql,[string]$Db=$Database) {
    $lines=& sqlcmd -b -S $Server -E -C -d $Db -h -1 -W -Q $Sql
    if ($LASTEXITCODE -ne 0) { throw 'SQL migration assertion failed. The test copy is preserved for inspection.' }
    return ($lines | ForEach-Object { $_.Trim() } | Where-Object { $_ })
}
function File([string]$Path) {
    & sqlcmd -b -S $Server -E -C -I -d $Database -f 65001 -i $Path
    if ($LASTEXITCODE -ne 0) { throw ('Migration SQL failed: '+[IO.Path]::GetFileName($Path)) }
}
function Snapshot {
    $tables=@{Roles='RoleID';Users='UserID';RefreshTokens='TokenID';Movies='MovieID';Rooms='RoomID';Seats='SeatID';Showtimes='ShowtimeID';Bookings='BookingID';BookingDetails='BookingDetailID';Tickets='TicketID'}
    $hashes=@()
    foreach ($table in ($tables.Keys | Sort-Object)) {
        $pk=$tables[$table]
        $hashes+=Query "SET NOCOUNT ON; SELECT '${table}:'+CONVERT(varchar(64),HASHBYTES('SHA2_256',(SELECT * FROM dbo.[$table] ORDER BY [$pk] FOR JSON PATH)),2);"
    }
    $hashes+=Query "SET NOCOUNT ON; SELECT 'UniqueIndexes:'+CONVERT(varchar(64),HASHBYTES('SHA2_256',(SELECT OBJECT_NAME(i.object_id) AS tableName,i.name,i.is_unique,i.has_filter,i.filter_definition,STUFF((SELECT ','+c.name FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0 ORDER BY ic.key_ordinal FOR XML PATH('')),1,1,'') AS keyColumns FROM sys.indexes i WHERE i.object_id IN (OBJECT_ID('dbo.Tickets'),OBJECT_ID('dbo.RefreshTokens')) AND i.is_unique=1 ORDER BY tableName,i.name FOR JSON PATH)),2);"
    return ($hashes -join "`n")
}

# Copy the OLD repository DDL + seed from Git. Never execute its hardcoded CREATE/USE CINEMA.
$old=(& git -C $repo show origin/main:Cinema_DataBase.sql) -join "`n"
if ($LASTEXITCODE -ne 0) { throw 'Cannot read legacy schema from origin/main.' }
$schemaStart=$old.IndexOf('-- 1.')
$schemaEnd=$old.IndexOf('USE CINEMA;',$schemaStart)
$seedStart=$old.IndexOf('SET NOCOUNT ON;')
if ($schemaStart -lt 0 -or $schemaEnd -lt 0 -or $seedStart -lt 0) { throw 'Legacy SQL format changed; inspect before running.' }
$schema=$old.Substring($schemaStart,$schemaEnd-$schemaStart)
$seed=$old.Substring($seedStart);$seed=$seed.Substring(0,$seed.IndexOf('-- 8.'))
$legacyPath=Join-Path $localDir 'legacy-schema-copy.sql'
$prefix="SET QUOTED_IDENTIFIER ON; SET ANSI_NULLS ON; SET ANSI_PADDING ON; SET ANSI_WARNINGS ON; SET ARITHABORT ON; SET CONCAT_NULL_YIELDS_NULL ON; SET NUMERIC_ROUNDABORT OFF;`n"
($prefix+$schema+"`n"+$seed+"`nGO`nINSERT RefreshTokens(UserID,Token,ExpiresAt,IsRevoked) SELECT TOP 1 UserID,'legacy-refresh-record-to-preserve',DATEADD(DAY,7,GETUTCDATE()),0 FROM Users ORDER BY UserID;`n") | Set-Content -LiteralPath $legacyPath -Encoding UTF8
if ($schema -notmatch 'TicketCode\s+VARCHAR\(30\)' -or $schema -notmatch 'Token VARCHAR\(500\)') { throw 'Expected legacy widths 30/500.' }
$null=Query "IF DB_ID(N'$Database') IS NOT NULL THROW 51000,'Test database already exists',1; CREATE DATABASE [$Database];" 'master'
File $legacyPath
$null=Query "IF COL_LENGTH('dbo.Tickets','TicketCode')<>30 OR COL_LENGTH('dbo.RefreshTokens','Token')<>500 THROW 51001,'Not the old schema',1;"
$before=Snapshot
Push-Location $repo
try {
    File (Join-Path $repo 'database/sqlserver/08-upgrade-existing.sql')
    $after=Snapshot
    if ($before -cne $after) { throw 'Existing row data or unique constraints/indexes changed during migration.' }
    $null=Query "IF COL_LENGTH('dbo.Tickets','TicketCode')<>32 OR COL_LENGTH('dbo.RefreshTokens','Token')<>1000 OR COL_LENGTH('dbo.TicketQrReferences','Token')<>-1 THROW 51002,'Wrong migrated widths',1; IF TYPE_NAME((SELECT user_type_id FROM sys.columns WHERE object_id=OBJECT_ID('dbo.TicketQrReferences') AND name='Token'))<>'nvarchar' THROW 51003,'QR token must be NVARCHAR(MAX)',1;"
    File (Join-Path $repo 'database/sqlserver/08-upgrade-existing.sql')
    if ($before -cne (Snapshot)) { throw 'Migration is not idempotent.' }
    $smokePath=Join-Path $localDir 'legacy-constraints-smoke.sql'
    (Get-Content -Raw -Encoding UTF8 (Join-Path $repo 'database/sqlserver/05-smoke-test.sql')).Replace("N'CINEMA_THAO_ETICKET_TEST'","N'$Database'") | Set-Content -LiteralPath $smokePath -Encoding UTF8
    File $smokePath
    if ($before -cne (Snapshot)) { throw 'Constraint smoke did not preserve legacy rows.' }
    [pscustomobject]@{Database=$Database;Source='origin/main:Cinema_DataBase.sql';OldWidths='30/500';NewWidths='32/1000';DataAndUniqueIndexesPreserved=$true;Idempotent=$true;ConstraintSmoke='PASS';Snapshot=$before} | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $localDir 'migration-report.json') -Encoding UTF8
    Write-Output ('PASS: legacy schema copy '+$Database+' migrated 30/500 -> 32/1000; all legacy data/indexes preserved; QR table added; rerun and seat-constraint tests passed.')
} finally { Pop-Location }
