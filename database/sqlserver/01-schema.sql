-- NEW empty database only. Never drops existing objects.
SET XACT_ABORT ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET NUMERIC_ROUNDABORT OFF;
BEGIN TRANSACTION;
-- 1. Bảng Vai trò (Roles)
CREATE TABLE Roles (
    RoleID INT IDENTITY(1,1) PRIMARY KEY,
    RoleName NVARCHAR(50) NOT NULL UNIQUE -- 'CUSTOMER', 'STAFF', 'ADMIN'
);

-- 2. Bảng Người dùng (Users)
CREATE TABLE Users (
    UserID INT IDENTITY(1,1) PRIMARY KEY,
    FullName NVARCHAR(100) NOT NULL,
    Email VARCHAR(100) NOT NULL UNIQUE,
    PasswordHash VARCHAR(255) NOT NULL, -- Mật khẩu đã được mã hóa bằng bcrypt/argon2
    PhoneNumber VARCHAR(15) NULL,
    RoleID INT NOT NULL DEFAULT 1, -- Mặc định là CUSTOMER
    CreatedAt DATETIME DEFAULT GETDATE(),
    IsActive BIT DEFAULT 1,
    CONSTRAINT FK_Users_Roles FOREIGN KEY (RoleID) REFERENCES Roles(RoleID)
);

-- 3. Bảng Refresh Tokens (Dùng để quản lý phiên đăng nhập lâu dài cho JWT)
CREATE TABLE RefreshTokens (
    TokenID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NOT NULL,
    Token VARCHAR(1000) NOT NULL UNIQUE,
    ExpiresAt DATETIME NOT NULL,
    IsRevoked BIT DEFAULT 0, -- Set = 1 khi người dùng Logout
    CreatedAt DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_RefreshTokens_Users FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE
);

-- Thêm sẵn dữ liệu mặc định cho bảng Roles



-- 4. Bảng Phim (Movies)
CREATE TABLE Movies (
    MovieID INT IDENTITY(1,1) PRIMARY KEY,
    Title NVARCHAR(200) NOT NULL,
    Description NVARCHAR(MAX) NULL,
    Duration INT NOT NULL, -- Thời lượng tính bằng phút
    ReleaseDate DATE NOT NULL,
    Director NVARCHAR(100) NULL,
    PosterURL VARCHAR(500) NULL,
    Status INT DEFAULT 1 -- 1: Đang chiếu, 2: Sắp chiếu, 0: Ngừng chiếu
);

-- 5. Bảng Phòng chiếu (Rooms)
CREATE TABLE Rooms (
    RoomID INT IDENTITY(1,1) PRIMARY KEY,
    RoomName NVARCHAR(50) NOT NULL, -- Ví dụ: Phòng 01, Phòng IMAX
    TotalSeats INT NOT NULL
);

-- 6. Bảng Ghế ngồi (Seats)
CREATE TABLE Seats (
    SeatID INT IDENTITY(1,1) PRIMARY KEY,
    RoomID INT NOT NULL,
    RowName VARCHAR(5) NOT NULL, -- Ví dụ: A, B, C...
    SeatNumber INT NOT NULL, -- Ví dụ: 1, 2, 3...
    SeatType VARCHAR(20) DEFAULT 'STANDARD', -- 'STANDARD', 'VIP', 'COUPLE'
    CONSTRAINT FK_Seats_Rooms FOREIGN KEY (RoomID) REFERENCES Rooms(RoomID) ON DELETE CASCADE
);

-- 7. Bảng Lịch chiếu (Showtimes)
CREATE TABLE Showtimes (
    ShowtimeID INT IDENTITY(1,1) PRIMARY KEY,
    MovieID INT NOT NULL,
    RoomID INT NOT NULL,
    StartTime DATETIME NOT NULL,
    Price DECIMAL(18, 2) NOT NULL, -- Giá vé cơ bản
    CONSTRAINT FK_Showtimes_Movies FOREIGN KEY (MovieID) REFERENCES Movies(MovieID),
    CONSTRAINT FK_Showtimes_Rooms FOREIGN KEY (RoomID) REFERENCES Rooms(RoomID)
);

-- 8. Bảng Đặt vé (Bookings)
CREATE TABLE Bookings (
    BookingID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NOT NULL, -- Liên kết với bảng Users (khách hàng đặt vé)
    ShowtimeID INT NOT NULL,
    BookingTime DATETIME DEFAULT GETDATE(),
    TotalPrice DECIMAL(18, 2) NOT NULL,
    Status VARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'PAID', 'CANCELLED'
    CONSTRAINT FK_Bookings_Users FOREIGN KEY (UserID) REFERENCES Users(UserID),
    CONSTRAINT FK_Bookings_Showtimes FOREIGN KEY (ShowtimeID) REFERENCES Showtimes(ShowtimeID)
);

-- 9. Bảng Chi tiết ghế đặt (BookingDetails)
CREATE TABLE BookingDetails (
    BookingDetailID INT IDENTITY(1,1) PRIMARY KEY,
    BookingID INT NOT NULL,
    SeatID INT NOT NULL,
    Price DECIMAL(18, 2) NOT NULL, -- Giá tiền của ghế tại thời điểm đặt
    CONSTRAINT FK_BookingDetails_Bookings FOREIGN KEY (BookingID) REFERENCES Bookings(BookingID) ON DELETE CASCADE,
    CONSTRAINT FK_BookingDetails_Seats FOREIGN KEY (SeatID) REFERENCES Seats(SeatID)
);



CREATE TABLE Tickets (
    TicketID    INT IDENTITY(1,1) PRIMARY KEY,
    TicketCode  VARCHAR(32)   NOT NULL UNIQUE,           -- mã vé duy nhất, vd: TK-20261025-8F3A2C1B
    BookingID   INT           NOT NULL,                  -- vé thuộc đơn đặt nào
    UserID      INT           NOT NULL,                  -- người mua
    MovieID     INT           NOT NULL,                  -- phim
    ShowtimeID  INT           NOT NULL,                  -- suất chiếu
    SeatID      INT           NOT NULL,                  -- ghế
    Price       DECIMAL(18,2) NOT NULL,                  -- giá vé tại thời điểm mua
    Status      VARCHAR(20)   NOT NULL DEFAULT 'UNUSED', -- UNUSED: chưa dùng, USED: đã dùng, CANCELLED: bị hủy
    UsedAt      DATETIME      NULL,                      -- thời điểm quét vé thành công
    CreatedAt   DATETIME      NOT NULL DEFAULT GETDATE(),
    CONSTRAINT CK_Tickets_Status    CHECK (Status IN ('UNUSED', 'USED', 'CANCELLED')),
    CONSTRAINT FK_Tickets_Bookings  FOREIGN KEY (BookingID)  REFERENCES Bookings(BookingID),
    CONSTRAINT FK_Tickets_Users     FOREIGN KEY (UserID)     REFERENCES Users(UserID),
    CONSTRAINT FK_Tickets_Movies    FOREIGN KEY (MovieID)    REFERENCES Movies(MovieID),
    CONSTRAINT FK_Tickets_Showtimes FOREIGN KEY (ShowtimeID) REFERENCES Showtimes(ShowtimeID),
    CONSTRAINT FK_Tickets_Seats     FOREIGN KEY (SeatID)     REFERENCES Seats(SeatID)
);
GO

-- Chặn đặt trùng ghế: 1 ghế trong 1 suất chiếu chỉ có 1 vé còn hiệu lực
-- (vé đã CANCELLED thì ghế được đặt lại)
CREATE UNIQUE INDEX UX_Tickets_Showtime_Seat
    ON Tickets (ShowtimeID, SeatID)
    WHERE Status <> 'CANCELLED';
GO

CREATE INDEX IX_Tickets_UserID    ON Tickets (UserID);
CREATE INDEX IX_Tickets_BookingID ON Tickets (BookingID);
GO
COMMIT;
GO


