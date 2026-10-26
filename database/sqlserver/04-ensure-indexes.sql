SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET ARITHABORT ON;
SET NUMERIC_ROUNDABORT OFF;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.Tickets') AND name='UX_Tickets_Showtime_Seat')
CREATE UNIQUE INDEX UX_Tickets_Showtime_Seat ON dbo.Tickets(ShowtimeID, SeatID) WHERE Status <> 'CANCELLED';
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.Tickets') AND name='IX_Tickets_UserID')
CREATE INDEX IX_Tickets_UserID ON dbo.Tickets(UserID);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.Tickets') AND name='IX_Tickets_BookingID')
CREATE INDEX IX_Tickets_BookingID ON dbo.Tickets(BookingID);
GO
