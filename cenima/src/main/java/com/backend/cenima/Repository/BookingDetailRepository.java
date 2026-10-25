package com.backend.cenima.Repository;

import com.backend.cenima.Entity.BookingDetail;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BookingDetailRepository extends JpaRepository<BookingDetail, Integer> {

    List<BookingDetail> findByBooking_Id(Integer bookingId);

    List<BookingDetail> findBySeat_Id(Integer seatId);

    boolean existsByBooking_IdAndSeat_Id(Integer bookingId, Integer seatId);
}
