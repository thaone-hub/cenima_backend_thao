package com.backend.cenima.Repository;

import com.backend.cenima.Entity.Ticket;
import com.backend.cenima.Entity.Ticket.TicketStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface TicketRepository extends JpaRepository<Ticket, Integer> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.QueryHints(@jakarta.persistence.QueryHint(name="jakarta.persistence.lock.timeout",value="5000"))
    @Query("select t from Ticket t where t.id = :id")
    Optional<Ticket> findForCheckIn(@Param("id") Integer id);

    // MỚI: id các ghế đã có vé còn hiệu lực (status khác CANCELLED) trong một suất chiếu
    @Query("select t.seat.id from Ticket t where t.showtime.id = :showtimeId and t.status <> :status")
    Set<Integer> findSeatIdsByShowtimeAndStatusNot(@Param("showtimeId") Integer showtimeId,
                                                   @Param("status") TicketStatus status);

    Optional<Ticket> findByTicketCode(String ticketCode);

    List<Ticket> findByBooking_Id(Integer bookingId);

    List<Ticket> findByUser_Id(Integer userId);

    List<Ticket> findByShowtime_Id(Integer showtimeId);

    List<Ticket> findBySeat_Id(Integer seatId);

    List<Ticket> findByStatus(TicketStatus status);

    boolean existsByTicketCode(String ticketCode);
}
