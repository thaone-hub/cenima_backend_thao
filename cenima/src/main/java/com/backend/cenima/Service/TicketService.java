package com.backend.cenima.Service;

import com.backend.cenima.Entity.Ticket;
import com.backend.cenima.Entity.Ticket.TicketStatus;
import com.backend.cenima.Repository.TicketRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class TicketService {

    private final TicketRepository ticketRepository;

    public TicketService(TicketRepository ticketRepository) {
        this.ticketRepository = ticketRepository;
    }

    public List<Ticket> findAll() {
        return ticketRepository.findAll();
    }

    public Optional<Ticket> findById(Integer id) {
        return ticketRepository.findById(id);
    }

    public Optional<Ticket> findByTicketCode(String ticketCode) {
        return ticketRepository.findByTicketCode(ticketCode);
    }

    public List<Ticket> findByBookingId(Integer bookingId) {
        return ticketRepository.findByBooking_Id(bookingId);
    }

    public List<Ticket> findByUserId(Integer userId) {
        return ticketRepository.findByUser_Id(userId);
    }

    public List<Ticket> findByShowtimeId(Integer showtimeId) {
        return ticketRepository.findByShowtime_Id(showtimeId);
    }

    public List<Ticket> findBySeatId(Integer seatId) {
        return ticketRepository.findBySeat_Id(seatId);
    }

    public List<Ticket> findByStatus(TicketStatus status) {
        return ticketRepository.findByStatus(status);
    }

    public Ticket save(Ticket ticket) {
        return ticketRepository.save(ticket);
    }

    public void deleteById(Integer id) {
        ticketRepository.deleteById(id);
    }
}
