-- Fresh demo database only. SQLCMD mode required; run from repository root.
-- Existing databases: use database/sqlserver/08-upgrade-existing.sql with explicit -d instead.
:on error exit
IF DB_ID(N'CINEMA_THAO_ETICKET_DEMO') IS NULL CREATE DATABASE CINEMA_THAO_ETICKET_DEMO;
GO
USE CINEMA_THAO_ETICKET_DEMO;
GO
IF EXISTS (SELECT 1 FROM sys.tables) THROW 51000, 'Database is not empty; use the additive migration', 1;
GO
:r database/sqlserver/01-schema.sql
:r database/sqlserver/06-qr-references.sql
:r database/sqlserver/03-seed-demo.sql
