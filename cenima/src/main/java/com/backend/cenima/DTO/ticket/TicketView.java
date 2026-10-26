package com.backend.cenima.DTO.ticket;
import com.backend.cenima.Entity.Ticket;
import java.time.LocalDateTime;
public record TicketView(Integer ticketId, String ticketCode, Integer movieId, String movieTitle,
    Integer showtimeId, LocalDateTime startTime, String roomName, String seatCode, String status, LocalDateTime usedAt) {
    public static TicketView of(Ticket t) {
        return new TicketView(t.getId(),t.getTicketCode(),t.getMovie().getId(),t.getMovie().getTitle(),
            t.getShowtime().getId(),t.getShowtime().getStartTime(),t.getShowtime().getRoom().getRoomName(),
            t.getSeat().getRowName()+t.getSeat().getSeatNumber(),t.getStatus().name(),t.getUsedAt());
    }
}
