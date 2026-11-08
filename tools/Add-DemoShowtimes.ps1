param(
    [string]$Server = 'localhost',
    [ValidateRange(1, 7)][int]$Days = 3
)
$ErrorActionPreference = 'Stop'
# Additive demo data only. Never reset dates, tickets, movies, rooms, or seats.
$sql = @"
SET NOCOUNT ON;
SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF DB_NAME() <> 'CINEMA_THAO_ETICKET_DEMO' THROW 51000,'Local demo database only',1;
DECLARE @RoomID INT=(SELECT TOP (1) r.RoomID FROM Rooms r WHERE EXISTS (SELECT 1 FROM Seats s WHERE s.RoomID=r.RoomID) ORDER BY r.RoomID);
IF @RoomID IS NULL THROW 51001,'A seeded room with seats is required',1;
DECLARE @Movies TABLE (Slot INT,MovieID INT,Duration INT);
INSERT @Movies SELECT TOP (3) ROW_NUMBER() OVER (ORDER BY MovieID)-1,MovieID,Duration
FROM Movies WHERE Status=1 AND Duration BETWEEN 1 AND 225 ORDER BY MovieID;
IF NOT EXISTS (SELECT 1 FROM @Movies) THROW 51002,'A currently showing movie with a valid duration is required',1;
DECLARE @Inserted TABLE (ShowtimeID INT);
DECLARE @BaseDate DATETIME2=CONVERT(DATE,SYSDATETIMEOFFSET() AT TIME ZONE 'SE Asia Standard Time');
DECLARE @Day INT=1;
WHILE @Day <= $Days
BEGIN
    INSERT Showtimes (MovieID,RoomID,StartTime,Price)
    OUTPUT inserted.ShowtimeID INTO @Inserted
    SELECT m.MovieID,@RoomID,c.StartTime,90000
    FROM @Movies m
    CROSS APPLY (SELECT DATEADD(HOUR,10+m.Slot*4,DATEADD(DAY,@Day,@BaseDate)) AS StartTime) c
    WHERE NOT EXISTS (
        SELECT 1 FROM Showtimes s JOIN Movies existing ON existing.MovieID=s.MovieID
        WHERE s.RoomID=@RoomID
        AND s.StartTime < DATEADD(MINUTE,m.Duration+15,c.StartTime)
        AND DATEADD(MINUTE,existing.Duration+15,s.StartTime) > c.StartTime
    );
    SET @Day=@Day+1;
END;
COMMIT;
SELECT COUNT(*) AS AddedShowtimes FROM @Inserted;
SELECT s.ShowtimeID,m.Title,r.RoomName,s.StartTime,s.Price
FROM @Inserted i JOIN Showtimes s ON s.ShowtimeID=i.ShowtimeID
JOIN Movies m ON m.MovieID=s.MovieID JOIN Rooms r ON r.RoomID=s.RoomID
ORDER BY s.StartTime;
"@
$sql | & sqlcmd -b -S $Server -E -C -d CINEMA_THAO_ETICKET_DEMO -f 65001
if ($LASTEXITCODE -ne 0) { throw 'Adding local demo showtimes failed.' }
