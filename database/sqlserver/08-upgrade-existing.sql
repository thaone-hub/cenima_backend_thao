-- SQLCMD entrypoint, run from repository root with -b -d <explicit target database>.
:on error exit
SET XACT_ABORT ON;
BEGIN TRANSACTION;
GO
:r database/sqlserver/02-upgrade-ticket-code.sql
:r database/sqlserver/04-ensure-indexes.sql
:r database/sqlserver/06-qr-references.sql
:r database/sqlserver/07-refresh-token-capacity.sql
COMMIT;
GO
