package com.backend.cenima.Repository;

import com.backend.cenima.Entity.Ticket;
import com.backend.cenima.Entity.Ticket.TicketStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TicketRepository extends JpaRepository<Ticket, Integer> {

    Optional<Ticket> findByTicketCode(String ticketCode);

    List<Ticket> findByBooking_Id(Integer bookingId);

    List<Ticket> findByUser_Id(Integer userId);

    List<Ticket> findByShowtime_Id(Integer showtimeId);

    List<Ticket> findBySeat_Id(Integer seatId);

    List<Ticket> findByStatus(TicketStatus status);

    boolean existsByTicketCode(String ticketCode);
}
