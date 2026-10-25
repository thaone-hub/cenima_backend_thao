package com.backend.cenima.Repository;

import com.backend.cenima.Entity.Seat;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SeatRepository extends JpaRepository<Seat, Integer> {

    List<Seat> findByRoom_IdOrderByRowNameAscSeatNumberAsc(Integer roomId);

    Optional<Seat> findByRoom_IdAndRowNameAndSeatNumber(
            Integer roomId,
            String rowName,
            Integer seatNumber
    );

    boolean existsByRoom_IdAndRowNameAndSeatNumber(
            Integer roomId,
            String rowName,
            Integer seatNumber
    );
}
