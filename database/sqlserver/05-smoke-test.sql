-- Dedicated test database only. All inserted/updated data is rolled back.
SET NOCOUNT ON;
SET XACT_ABORT OFF;
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET NUMERIC_ROUNDABORT OFF;
IF DB_NAME() <> N'CINEMA_THAO_ETICKET_TEST' THROW 51000, 'Use CINEMA_THAO_ETICKET_TEST only', 1;
IF COL_LENGTH('dbo.Tickets', 'TicketCode') <> 32 THROW 51001, 'TicketCode must be 32', 1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.Tickets') AND name='UX_Tickets_Showtime_Seat' AND has_filter=1 AND is_unique=1)
    THROW 51002, 'Missing filtered unique index', 1;
DECLARE @originalCount int = (SELECT COUNT(*) FROM dbo.Tickets);
BEGIN TRANSACTION;
BEGIN TRY
    DECLARE @ticket int = (SELECT TOP 1 TicketID FROM dbo.Tickets WHERE Status='UNUSED');
    IF @ticket IS NULL THROW 51003, 'Seed test data first', 1;
    DECLARE @blocked bit = 0;
    BEGIN TRY
        INSERT dbo.Tickets(TicketCode,BookingID,UserID,MovieID,ShowtimeID,SeatID,Price,Status)
        SELECT REPLACE(CONVERT(varchar(36),NEWID()),'-',''),BookingID,UserID,MovieID,ShowtimeID,SeatID,Price,'UNUSED'
        FROM dbo.Tickets WHERE TicketID=@ticket;
    END TRY
    BEGIN CATCH
        IF ERROR_NUMBER() NOT IN (2601,2627) THROW;
        SET @blocked = 1;
    END CATCH;
    IF @blocked = 0 THROW 51004, 'Duplicate live seat was allowed', 1;
    UPDATE dbo.Tickets SET Status='CANCELLED' WHERE TicketID=@ticket;
    INSERT dbo.Tickets(TicketCode,BookingID,UserID,MovieID,ShowtimeID,SeatID,Price,Status)
    SELECT REPLACE(CONVERT(varchar(36),NEWID()),'-',''),BookingID,UserID,MovieID,ShowtimeID,SeatID,Price,'UNUSED'
    FROM dbo.Tickets WHERE TicketID=@ticket;
    IF @@ROWCOUNT <> 1 THROW 51005, 'Cancelled seat was not released', 1;
    ROLLBACK;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK;
    THROW;
END CATCH;
IF (SELECT COUNT(*) FROM dbo.Tickets) <> @originalCount THROW 51006, 'Smoke test did not roll back', 1;
PRINT 'PASS: length=32, filtered uniqueness, duplicate rejection, cancelled seat reuse, rollback';
GO
