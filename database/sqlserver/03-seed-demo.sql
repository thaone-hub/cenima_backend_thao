-- Demo/test databases only. Existing rows are never updated.
SET XACT_ABORT ON;
SET QUOTED_IDENTIFIER ON;
SET NOCOUNT ON;

--------------------------------------------------
-- 1. ROLES
--------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM Roles WHERE RoleName = 'CUSTOMER')
    INSERT INTO Roles (RoleName) VALUES ('CUSTOMER');

IF NOT EXISTS (SELECT 1 FROM Roles WHERE RoleName = 'STAFF')
    INSERT INTO Roles (RoleName) VALUES ('STAFF');

IF NOT EXISTS (SELECT 1 FROM Roles WHERE RoleName = 'ADMIN')
    INSERT INTO Roles (RoleName) VALUES ('ADMIN');


--------------------------------------------------
-- 2. USERS
-- PasswordHash bên dưới chỉ là dữ liệu demo.
-- Chưa dùng được để đăng nhập bằng BCrypt.
--------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM Users WHERE Email = 'customer@cinema.test')
    INSERT INTO Users
        (FullName, Email, PasswordHash, PhoneNumber, RoleID)
    VALUES
        (N'Nguyễn Văn An', 'customer@cinema.test',
         'DEMO_HASH_CUSTOMER', '0901000001',
         (SELECT RoleID FROM Roles WHERE RoleName = 'CUSTOMER'));

IF NOT EXISTS (SELECT 1 FROM Users WHERE Email = 'staff@cinema.test')
    INSERT INTO Users
        (FullName, Email, PasswordHash, PhoneNumber, RoleID)
    VALUES
        (N'Trần Thị Bình', 'staff@cinema.test',
         'DEMO_HASH_STAFF', '0901000002',
         (SELECT RoleID FROM Roles WHERE RoleName = 'STAFF'));

IF NOT EXISTS (SELECT 1 FROM Users WHERE Email = 'admin@cinema.test')
    INSERT INTO Users
        (FullName, Email, PasswordHash, PhoneNumber, RoleID)
    VALUES
        (N'Lê Minh Hoàng', 'admin@cinema.test',
         'DEMO_HASH_ADMIN', '0901000003',
         (SELECT RoleID FROM Roles WHERE RoleName = 'ADMIN'));


--------------------------------------------------
-- 3. MOVIES
-- Status: 1 = Đang chiếu, 2 = Sắp chiếu
--------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM Movies WHERE Title = N'Đào, Phở và Piano')
    INSERT INTO Movies
        (Title, Description, Duration, ReleaseDate, Director, PosterURL, Status)
    VALUES
        (N'Đào, Phở và Piano',
         N'Phim lịch sử Việt Nam dùng cho dữ liệu kiểm thử.',
         100, '2024-02-10', N'Phi Tiến Sơn', NULL, 1);

IF NOT EXISTS (SELECT 1 FROM Movies WHERE Title = N'Mắt Biếc')
    INSERT INTO Movies
        (Title, Description, Duration, ReleaseDate, Director, PosterURL, Status)
    VALUES
        (N'Mắt Biếc',
         N'Câu chuyện tình cảm và tuổi trẻ.',
         117, '2019-12-20', N'Victor Vũ', NULL, 1);

IF NOT EXISTS (SELECT 1 FROM Movies WHERE Title = N'Lật Mặt')
    INSERT INTO Movies
        (Title, Description, Duration, ReleaseDate, Director, PosterURL, Status)
    VALUES
        (N'Lật Mặt',
         N'Phim giải trí Việt Nam dùng để thử API.',
         110, '2024-04-26', N'Lý Hải', NULL, 1);

IF NOT EXISTS (SELECT 1 FROM Movies WHERE Title = N'Bầu Trời Tương Lai')
    INSERT INTO Movies
        (Title, Description, Duration, ReleaseDate, Director, PosterURL, Status)
    VALUES
        (N'Bầu Trời Tương Lai',
         N'Phim khoa học viễn tưởng mẫu.',
         125, '2027-01-15', N'Nguyễn Minh', NULL, 2);

IF NOT EXISTS (SELECT 1 FROM Movies WHERE Title = N'Hành Trình Bí Ẩn')
    INSERT INTO Movies
        (Title, Description, Duration, ReleaseDate, Director, PosterURL, Status)
    VALUES
        (N'Hành Trình Bí Ẩn',
         N'Phim phiêu lưu mẫu dùng cho kiểm thử.',
         105, '2027-02-20', N'Trần Nam', NULL, 2);


--------------------------------------------------
-- 4. ROOMS
--------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM Rooms WHERE RoomName = N'Phòng 01')
    INSERT INTO Rooms (RoomName, TotalSeats) VALUES (N'Phòng 01', 30);

IF NOT EXISTS (SELECT 1 FROM Rooms WHERE RoomName = N'Phòng 02')
    INSERT INTO Rooms (RoomName, TotalSeats) VALUES (N'Phòng 02', 30);

IF NOT EXISTS (SELECT 1 FROM Rooms WHERE RoomName = N'Phòng VIP')
    INSERT INTO Rooms (RoomName, TotalSeats) VALUES (N'Phòng VIP', 30);


--------------------------------------------------
-- 5. SEATS
-- Mỗi phòng: 5 hàng A-E, mỗi hàng 6 ghế.
-- Ghế hàng E là VIP.
--------------------------------------------------
DECLARE @RoomID INT;
DECLARE @RowNumber INT;
DECLARE @SeatNumber INT;
DECLARE @RowName VARCHAR(5);

DECLARE RoomCursor CURSOR LOCAL FAST_FORWARD FOR
    SELECT RoomID
    FROM Rooms
    WHERE RoomName IN (N'Phòng 01', N'Phòng 02', N'Phòng VIP');

OPEN RoomCursor;
FETCH NEXT FROM RoomCursor INTO @RoomID;

WHILE @@FETCH_STATUS = 0
BEGIN
    SET @RowNumber = 0;

    WHILE @RowNumber < 5
    BEGIN
        SET @RowName = CHAR(65 + @RowNumber);
        SET @SeatNumber = 1;

        WHILE @SeatNumber <= 6
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM Seats
                WHERE RoomID = @RoomID
                  AND RowName = @RowName
                  AND SeatNumber = @SeatNumber
            )
            BEGIN
                INSERT INTO Seats
                    (RoomID, RowName, SeatNumber, SeatType)
                VALUES
                    (@RoomID, @RowName, @SeatNumber,
                     CASE
                         WHEN @RowNumber = 4 THEN 'VIP'
                         ELSE 'STANDARD'
                     END);
            END;

            SET @SeatNumber = @SeatNumber + 1;
        END;

        SET @RowNumber = @RowNumber + 1;
    END;

    FETCH NEXT FROM RoomCursor INTO @RoomID;
END;

CLOSE RoomCursor;
DEALLOCATE RoomCursor;


--------------------------------------------------
-- 6. SHOWTIMES
-- Tạo lịch chiếu trong tương lai tương đối với ngày chạy.
--------------------------------------------------
DECLARE @Movie1 INT = (SELECT TOP 1 MovieID FROM Movies WHERE Title = N'Đào, Phở và Piano');
DECLARE @Movie2 INT = (SELECT TOP 1 MovieID FROM Movies WHERE Title = N'Mắt Biếc');
DECLARE @Movie3 INT = (SELECT TOP 1 MovieID FROM Movies WHERE Title = N'Lật Mặt');
DECLARE @Room1 INT = (SELECT TOP 1 RoomID FROM Rooms WHERE RoomName = N'Phòng 01');
DECLARE @Room2 INT = (SELECT TOP 1 RoomID FROM Rooms WHERE RoomName = N'Phòng 02');
DECLARE @RoomVIP INT = (SELECT TOP 1 RoomID FROM Rooms WHERE RoomName = N'Phòng VIP');

IF NOT EXISTS (
    SELECT 1 FROM Showtimes
    WHERE MovieID = @Movie1 AND RoomID = @Room1
      AND StartTime = DATEADD(HOUR, 2, DATEADD(DAY, 2, CONVERT(datetime, CONVERT(date, SYSUTCDATETIME() AT TIME ZONE 'UTC' AT TIME ZONE 'SE Asia Standard Time'))))
)
    INSERT INTO Showtimes (MovieID, RoomID, StartTime, Price)
    VALUES (@Movie1, @Room1,
            DATEADD(HOUR, 2, DATEADD(DAY, 2, CONVERT(datetime, CONVERT(date, SYSUTCDATETIME() AT TIME ZONE 'UTC' AT TIME ZONE 'SE Asia Standard Time')))),
            75000);

IF NOT EXISTS (
    SELECT 1 FROM Showtimes
    WHERE MovieID = @Movie2 AND RoomID = @Room2
      AND StartTime = DATEADD(HOUR, 5, DATEADD(DAY, 2, CONVERT(datetime, CONVERT(date, SYSUTCDATETIME() AT TIME ZONE 'UTC' AT TIME ZONE 'SE Asia Standard Time'))))
)
    INSERT INTO Showtimes (MovieID, RoomID, StartTime, Price)
    VALUES (@Movie2, @Room2,
            DATEADD(HOUR, 5, DATEADD(DAY, 2, CONVERT(datetime, CONVERT(date, SYSUTCDATETIME() AT TIME ZONE 'UTC' AT TIME ZONE 'SE Asia Standard Time')))),
            85000);

IF NOT EXISTS (
    SELECT 1 FROM Showtimes
    WHERE MovieID = @Movie3 AND RoomID = @RoomVIP
      AND StartTime = DATEADD(DAY, 1, DATEADD(HOUR, 3, DATEADD(DAY, 2, CONVERT(datetime, CONVERT(date, SYSUTCDATETIME() AT TIME ZONE 'UTC' AT TIME ZONE 'SE Asia Standard Time')))))
)
    INSERT INTO Showtimes (MovieID, RoomID, StartTime, Price)
    VALUES (@Movie3, @RoomVIP,
            DATEADD(DAY, 1, DATEADD(HOUR, 3, DATEADD(DAY, 2, CONVERT(datetime, CONVERT(date, SYSUTCDATETIME() AT TIME ZONE 'UTC' AT TIME ZONE 'SE Asia Standard Time'))))),
            100000);


--------------------------------------------------
-- 7. BOOKINGS, BOOKING DETAILS, TICKETS
-- Tạo một đơn đặt vé mẫu cho CUSTOMER.
--------------------------------------------------
DECLARE @UserID INT =
    (SELECT TOP 1 UserID FROM Users WHERE Email = 'customer@cinema.test');

DECLARE @ShowtimeID INT =
    (SELECT TOP 1 ShowtimeID FROM Showtimes
     WHERE MovieID = @Movie1 AND RoomID = @Room1
     AND StartTime > CONVERT(datetime, SYSUTCDATETIME() AT TIME ZONE 'UTC' AT TIME ZONE 'SE Asia Standard Time')
     ORDER BY StartTime DESC);

DECLARE @SeatID INT =
    (SELECT TOP 1 SeatID FROM Seats
     WHERE RoomID = @Room1 AND RowName = 'A' AND SeatNumber = 1);

DECLARE @TicketPrice DECIMAL(18,2) =
    (SELECT Price FROM Showtimes WHERE ShowtimeID = @ShowtimeID);

IF @UserID IS NOT NULL
   AND @ShowtimeID IS NOT NULL
   AND @SeatID IS NOT NULL
   AND NOT EXISTS (
       SELECT 1 FROM Tickets
       WHERE ShowtimeID = @ShowtimeID
         AND SeatID = @SeatID
         AND Status <> 'CANCELLED'
   )
BEGIN
    DECLARE @BookingID INT;

    INSERT INTO Bookings (UserID, ShowtimeID, TotalPrice, Status)
    VALUES (@UserID, @ShowtimeID, @TicketPrice, 'PAID');

    SET @BookingID = SCOPE_IDENTITY();

    INSERT INTO BookingDetails (BookingID, SeatID, Price)
    VALUES (@BookingID, @SeatID, @TicketPrice);

    INSERT INTO Tickets
        (TicketCode, BookingID, UserID, MovieID, ShowtimeID, SeatID, Price, Status)
    VALUES
        (REPLACE(CONVERT(varchar(36), NEWID()), '-', ''),
         @BookingID, @UserID, @Movie1, @ShowtimeID, @SeatID,
         @TicketPrice, 'UNUSED');
END;


--------------------------------------------------
-- Inspect IDs without credentials.
SELECT UserID, Email FROM Users;
SELECT TicketID, TicketCode, Status FROM Tickets;
SELECT ShowtimeID, StartTime FROM Showtimes;
GO
