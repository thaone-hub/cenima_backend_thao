
-- ==========================================================
-- DONG BO PHIM NCC VA TAO SUAT CHIEU DEMO
-- Database: CINEMA_THAO_ETICKET_DEMO
-- Du lieu NCC: 04/11/2026
-- Lich chieu la gia lap, KHONG PHAI lich chieu NCC
-- ==========================================================

USE [CINEMA_THAO_ETICKET_DEMO];
GO

SET NOCOUNT ON;
SET XACT_ABORT ON;

-- Kiem tra database
IF DB_NAME() <> N'CINEMA_THAO_ETICKET_DEMO'
BEGIN
    ;THROW 51001,
        'Sai database: chi duoc chay tren CINEMA_THAO_ETICKET_DEMO.',
        1;
END;

-- 1 = chi xem truoc, tu dong ROLLBACK
-- 0 = luu thay doi vao database
DECLARE @PreviewOnly bit = 0;

-- 1 = an 5 phim mau cu khoi danh sach mo ban
-- 0 = giu nguyen trang thai phim cu
DECLARE @ArchiveOldSeedMovies bit = 1;

BEGIN TRY
    BEGIN TRANSACTION;

    -- ======================================================
    -- 1. TAO DANH MUC PHIM NCC
    -- ======================================================

    DECLARE @Catalog TABLE (
        SourceID int PRIMARY KEY,
        Title nvarchar(200) NOT NULL,
        Description nvarchar(max) NULL,
        Duration int NOT NULL,
        ReleaseDate date NOT NULL,
        Director nvarchar(100) NULL,
        PosterURL varchar(500) NOT NULL,
        Status int NOT NULL
    );

    INSERT INTO @Catalog (
        SourceID,
        Title,
        Description,
        Duration,
        ReleaseDate,
        Director,
        PosterURL,
        Status
    )
    VALUES
    (
        11248,
        N'CLAYFACE-T18',
        N'Bộ phim kinh dị đầu tiên của DC Studios, Clayface do đạo diễn James Watkins thực hiện, với sự tham gia của Tom Rhys Harries trong vai chính. Một câu chuyện khám phá sự mất mát bản sắc và nhân tính, tình yêu độc hại và mặt tối của tham vọng khoa học.',
        108,
        '2026-10-30',
        N'James Watkins',
        '/assets/ncc-11248.jpg',
        1
    ),
    (
        11347,
        N'TRẠI BUÔN NGƯỜI-T18',
        N'Vì cứu em gái sa bẫy buôn người ở biên giới miền Tây, Ny cùng bạn thân bị bắt làm nô dịch trong sào huyệt lừa đảo tàn bạo. Họ cùng các trinh sát nằm vùng và các nạn nhân âm thầm lập kế hoạch trốn thoát.',
        135,
        '2026-09-25',
        N'Toni Dương Bảo Anh',
        '/assets/ncc-11347.jpg',
        1
    ),
    (
        11279,
        N'TRÁI TIM QUÁI THÚ-T13',
        N'Sau một vụ tai nạn máy bay, sĩ quan James Belmont và chú chó chiến đấu Odin bị mắc kẹt giữa vùng hoang dã Alaska. Họ phải cùng nhau bước vào cuộc chiến sinh tồn khốc liệt.',
        101,
        '2026-10-02',
        N'David Ayer',
        '/assets/ncc-11279.jpg',
        1
    ),
    (
        11366,
        N'NGƯỜI MẸ KHÁC-T18',
        N'Bộ phim kinh dị của đạo diễn Rob Savage, kể về cô bé Bela và mối liên kết kỳ lạ với một thực thể bí ẩn mang vẻ ngoài giống hệt mẹ mình.',
        93,
        '2026-10-09',
        N'Rob Savage',
        '/assets/ncc-11366.jpg',
        1
    ),
    (
        11195,
        N'PHIM STREET FIGHTER-T16',
        N'Lấy bối cảnh năm 1993, Ryu và Ken được Chun-Li chiêu mộ tham gia giải Chiến Binh Thế Giới, nhưng đằng sau giải đấu là một âm mưu chết chóc.',
        119,
        '2026-10-16',
        N'Kitao Sakurai',
        '/assets/ncc-11195.jpg',
        1
    ),
    (
        11294,
        N'ÁN MẠNG KARAOKE-T16',
        N'Một người hàng xóm mê hát karaoke bất ngờ bị sát hại trong căn homestay thiền biệt lập trên núi, khiến chuyến hành hương của một xóm nhỏ trở thành cuộc điều tra bất đắc dĩ.',
        96,
        '2026-10-30',
        N'Hoàng Lê',
        '/assets/ncc-11294.jpg',
        1
    ),
    (
        11314,
        N'CHỊ CHỊ EM EM 3-T18',
        N'Thị Mầu bước vào một thế giới với những rung động bị che giấu, các mối quan hệ chồng chéo và những lựa chọn trái với khuôn phép.',
        122,
        '2026-10-30',
        N'Nguyễn Hữu Hoàng',
        '/assets/ncc-11314.jpg',
        1
    ),
    (
        11384,
        N'NGỰ MIÊU PHÁ ÁN-K (LỒNG TIẾNG)',
        N'Tại thành cổ Kim Lăng, Triển Ngao cùng Bao Chửng, Cẩm Mao Thử và Khấu Châu hợp sức điều tra những vụ án bí ẩn.',
        98,
        '2026-10-30',
        N'Jennifer Alyx, Liang Cao',
        '/assets/ncc-11384.jpg',
        1
    ),
    (
        11390,
        N'PHIM ĐIỆN ẢNH VỀ BỘ ĐÔI ANH HÙNG 2026: Kamen Rider ZEZTZ & Siêu Cảnh sát Vũ trụ GAVAN INFINITY - K',
        N'Kamen Rider ZEZTZ và GAVAN INFINITY đối mặt với những kẻ thù nguy hiểm trong cuộc chiến đa vũ trụ.',
        96,
        '2026-10-30',
        N'Kazuya Kamihoriuchi, Hirofumi Fukuzawa',
        '/assets/ncc-11390.jpg',
        1
    );

    -- ======================================================
    -- 2. THEM PHIM NCC CHUA TON TAI
    -- ======================================================

    INSERT INTO dbo.Movies (
        Title,
        Description,
        Duration,
        ReleaseDate,
        Director,
        PosterURL,
        Status
    )
    SELECT
        c.Title,
        c.Description,
        c.Duration,
        c.ReleaseDate,
        c.Director,
        c.PosterURL,
        c.Status
    FROM @Catalog AS c
    WHERE NOT EXISTS (
        SELECT 1
        FROM dbo.Movies AS m
        WHERE m.PosterURL = c.PosterURL
           OR m.Title = c.Title
    );

    -- ======================================================
    -- 3. CAP NHAT THONG TIN PHIM NCC
    -- ======================================================

    UPDATE m
    SET
        m.Title = c.Title,
        m.Description = c.Description,
        m.Duration = c.Duration,
        m.ReleaseDate = c.ReleaseDate,
        m.Director = c.Director,
        m.PosterURL = c.PosterURL,
        m.Status = c.Status
    FROM dbo.Movies AS m
    INNER JOIN @Catalog AS c
        ON m.PosterURL = c.PosterURL
        OR m.Title = c.Title;

    -- ======================================================
    -- 4. AN PHIM MAU CU (KHONG XOA)
    -- ======================================================

    IF @ArchiveOldSeedMovies = 1
    BEGIN
        UPDATE dbo.Movies
        SET Status = 0
        WHERE Title IN (
            N'Đào, Phở và Piano',
            N'Mắt Biếc',
            N'Lật Mặt',
            N'Bầu Trời Tương Lai',
            N'Hành Trình Bí Ẩn'
        )
        AND PosterURL IS NULL;
    END;

    -- ======================================================
    -- 5. LAY DANH SACH PHONG CO GHE
    -- ======================================================

    DECLARE @Rooms TABLE (
        RowNum int PRIMARY KEY,
        RoomID int NOT NULL UNIQUE
    );

    INSERT INTO @Rooms (RowNum, RoomID)
    SELECT
        ROW_NUMBER() OVER (ORDER BY q.RoomID),
        q.RoomID
    FROM (
        SELECT TOP (3) r.RoomID
        FROM dbo.Rooms AS r
        INNER JOIN dbo.Seats AS seat
            ON seat.RoomID = r.RoomID
        GROUP BY r.RoomID
        HAVING COUNT(*) > 0
        ORDER BY r.RoomID
    ) AS q;

    IF (SELECT COUNT(*) FROM @Rooms) < 3
    BEGIN
        ;THROW 51002,
            'Can it nhat 3 phong co ghe trong Rooms va Seats.',
            1;
    END;

    -- ======================================================
    -- 6. TAO SUAT CHIEU DEMO CHO NGAY MAI
    -- Moi phim 1 suat, 3 phong, 3 khung gio
    -- 10:00 / 14:00 / 18:00
    -- ======================================================

    DECLARE @Tomorrow datetime =
        DATEADD(
            DAY,
            1,
            CONVERT(datetime, CONVERT(date, GETDATE()))
        );

    ;WITH OrderedMovies AS (
        SELECT
            m.MovieID,
            m.Duration,
            ROW_NUMBER() OVER (
                ORDER BY c.SourceID
            ) AS rn
        FROM @Catalog AS c
        INNER JOIN dbo.Movies AS m
            ON m.PosterURL = c.PosterURL
    )
    INSERT INTO dbo.Showtimes (
        MovieID,
        RoomID,
        StartTime,
        Price
    )
    SELECT
        o.MovieID,
        r.RoomID,
        t.NewStart,
        CASE r.RowNum
            WHEN 1 THEN 75000.00
            WHEN 2 THEN 85000.00
            ELSE 100000.00
        END
    FROM OrderedMovies AS o
    INNER JOIN @Rooms AS r
        ON r.RowNum = ((o.rn - 1) % 3) + 1

    CROSS APPLY (
        SELECT DATEADD(
            HOUR,
            10 + (((o.rn - 1) / 3) * 4),
            @Tomorrow
        ) AS NewStart
    ) AS t

    -- Khong tao trung lich cung phim
    WHERE NOT EXISTS (
        SELECT 1
        FROM dbo.Showtimes AS prior
        WHERE prior.MovieID = o.MovieID
          AND prior.RoomID = r.RoomID
          AND prior.StartTime = t.NewStart
    )

    -- Khong trung lich cua phong
    AND NOT EXISTS (
        SELECT 1
        FROM dbo.Showtimes AS prior

        INNER JOIN dbo.Movies AS priorMovie
            ON priorMovie.MovieID = prior.MovieID

        WHERE prior.RoomID = r.RoomID

          AND prior.StartTime <
              DATEADD(
                  MINUTE,
                  o.Duration + 30,
                  t.NewStart
              )

          AND DATEADD(
                  MINUTE,
                  priorMovie.Duration + 30,
                  prior.StartTime
              ) > t.NewStart
    );

    -- ======================================================
    -- 7. HIEN THI DANH SACH PHIM NCC
    -- ======================================================

    SELECT
        m.MovieID,
        m.Title,
        m.Status,
        m.PosterURL
    FROM dbo.Movies AS m
    INNER JOIN @Catalog AS c
        ON c.PosterURL = m.PosterURL
    ORDER BY c.SourceID;

    -- ======================================================
    -- 8. HIEN THI SUAT CHIEU TUONG LAI
    -- ======================================================

    SELECT
        m.Title,
        s.ShowtimeID,
        r.RoomName,
        s.StartTime,
        s.Price
    FROM dbo.Showtimes AS s

    INNER JOIN dbo.Movies AS m
        ON m.MovieID = s.MovieID

    INNER JOIN dbo.Rooms AS r
        ON r.RoomID = s.RoomID

    INNER JOIN @Catalog AS c
        ON c.PosterURL = m.PosterURL

    WHERE s.StartTime >= @Tomorrow

    ORDER BY
        s.StartTime,
        r.RoomName;

    -- ======================================================
    -- 9. PREVIEW HOAC LUU THAY DOI
    -- ======================================================

    IF @PreviewOnly = 1
    BEGIN
        ROLLBACK TRANSACTION;

        PRINT N'PREVIEW ONLY: Da ROLLBACK. Database chua thay doi.';
    END
    ELSE
    BEGIN
        COMMIT TRANSACTION;

        PRINT N'COMMIT SUCCESS: Da luu phim NCC va lich chieu demo.';
    END;

END TRY

BEGIN CATCH

    IF @@TRANCOUNT > 0
    BEGIN
        ROLLBACK TRANSACTION;
    END;

    ;THROW;

END CATCH;
