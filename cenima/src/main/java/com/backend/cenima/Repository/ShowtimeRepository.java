package com.backend.cenima.Repository;

import com.backend.cenima.Entity.Showtime;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface ShowtimeRepository extends JpaRepository<Showtime, Integer> {

    // MỚI: suất chiếu chưa bắt đầu của một phim (dùng cho bước 2)
    List<Showtime> findByMovie_IdAndStartTimeAfterOrderByStartTimeAsc(Integer movieId, LocalDateTime now);

    List<Showtime> findByMovie_IdAndStartTimeBetweenOrderByStartTimeAsc(
            Integer movieId,
            LocalDateTime start,
            LocalDateTime end
    );

    List<Showtime> findByRoom_IdAndStartTimeBetweenOrderByStartTimeAsc(
            Integer roomId,
            LocalDateTime start,
            LocalDateTime end
    );

    List<Showtime> findByStartTimeBetweenOrderByStartTimeAsc(
            LocalDateTime start,
            LocalDateTime end
    );
}