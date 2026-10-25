package com.backend.cenima.Repository;

import com.backend.cenima.Entity.Booking;
import com.backend.cenima.Entity.Booking.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BookingRepository extends JpaRepository<Booking, Integer> {

    List<Booking> findByUser_IdOrderByBookingTimeDesc(Integer userId);

    List<Booking> findByShowtime_Id(Integer showtimeId);

    List<Booking> findByStatus(BookingStatus status);

    List<Booking> findByUser_IdAndStatus(Integer userId, BookingStatus status);
}
