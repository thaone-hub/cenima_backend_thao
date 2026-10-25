package com.backend.cenima.Repository;

import com.backend.cenima.Entity.Showtime;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface ShowtimeRepository extends JpaRepository<Showtime, Integer> {

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
