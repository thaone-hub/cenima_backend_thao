package com.backend.cenima.Service;

import com.backend.cenima.DTO.BookingResponse;
import com.backend.cenima.DTO.BookingResponse.TicketInfo;
import com.backend.cenima.DTO.CreateBookingRequest;
import com.backend.cenima.DTO.SeatStatusResponse;
import com.backend.cenima.Entity.*;
import com.backend.cenima.Entity.Booking.BookingStatus;
import com.backend.cenima.Entity.Ticket.TicketStatus;
import com.backend.cenima.Repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class BookingService {

    private final ShowtimeRepository showtimeRepo;
    private final SeatRepository seatRepo;
    private final BookingRepository bookingRepo;
    private final TicketRepository ticketRepo;
    private final UserRepository userRepo;

    // ---------- Sơ đồ ghế của một suất chiếu ----------
    @Transactional(readOnly = true)
    public List<SeatStatusResponse> getSeatMap(Integer showtimeId) {
        Showtime showtime = showtimeRepo.findById(showtimeId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Suất chiếu không tồn tại"));
        Set<Integer> taken = ticketRepo.findSeatIdsByShowtimeAndStatusNot(showtimeId, TicketStatus.CANCELLED);

        return seatRepo.findByRoom_IdOrderByRowNameAscSeatNumberAsc(showtime.getRoom().getId())
                .stream()
                .map(s -> new SeatStatusResponse(
                        s.getId(), s.getRowName(), s.getSeatNumber(), s.getSeatType().name(),
                        taken.contains(s.getId()) ? "BOOKED" : "AVAILABLE"))
                .toList();
    }

    // ---------- Đặt vé: tạo Booking + mỗi ghế một Ticket có mã duy nhất ----------
    // Không có thanh toán thật nên đặt thành công là Booking PAID, vé UNUSED.
    @Transactional
    public BookingResponse createBooking(Integer userId, CreateBookingRequest req) {
        Showtime showtime = showtimeRepo.findById(req.showtimeId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Suất chiếu không tồn tại"));
        if (!showtime.getStartTime().isAfter(LocalDateTime.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Suất chiếu đã bắt đầu");
        }

        User user = userRepo.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Người dùng không tồn tại"));

        Set<Integer> seatIds = new HashSet<>(req.seatIds());
        List<Seat> seats = seatRepo.findAllById(seatIds);
        if (seats.size() != seatIds.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Có ghế không tồn tại");
        }
        Integer roomId = showtime.getRoom().getId();
        if (seats.stream().anyMatch(s -> !s.getRoom().getId().equals(roomId))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ghế không thuộc phòng chiếu của suất này");
        }

        // Kiểm tra sớm để báo lỗi rõ ràng
        Set<Integer> taken = ticketRepo.findSeatIdsByShowtimeAndStatusNot(showtime.getId(), TicketStatus.CANCELLED);
        if (seats.stream().anyMatch(s -> taken.contains(s.getId()))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Có ghế đã được người khác đặt");
        }

        Booking booking = new Booking();
        booking.setUser(user);
        booking.setShowtime(showtime);
        booking.setStatus(BookingStatus.PAID);

        List<Ticket> tickets = new ArrayList<>();
        Set<String> usedCodes = new HashSet<>();
        BigDecimal total = BigDecimal.ZERO;

        for (Seat seat : seats) {
            BigDecimal price = priceOf(showtime.getPrice(), seat.getSeatType());

            BookingDetail detail = new BookingDetail();
            detail.setSeat(seat);
            detail.setPrice(price);
            booking.addDetail(detail);

            Ticket ticket = new Ticket();
            ticket.setTicketCode(uniqueCode(usedCodes));
            ticket.setBooking(booking);
            ticket.setUser(user);
            ticket.setMovie(showtime.getMovie());   // lấy phim từ suất chiếu để không bị lệch
            ticket.setShowtime(showtime);
            ticket.setSeat(seat);
            ticket.setPrice(price);
            ticket.setStatus(TicketStatus.UNUSED);
            tickets.add(ticket);

            total = total.add(price);
        }
        booking.setTotalPrice(total);

        try {
            bookingRepo.save(booking);
            ticketRepo.saveAllAndFlush(tickets);
        } catch (DataIntegrityViolationException e) {
            // Hai người đặt cùng ghế cùng lúc: unique index UX_Tickets_Showtime_Seat từ chối người đến sau
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ghế vừa được người khác đặt, vui lòng chọn lại");
        }

        return toResponse(booking, tickets);
    }

    // ---------- helper ----------
    private String uniqueCode(Set<String> usedInThisBooking) {
        String code;
        do {
            code = UUID.randomUUID().toString().replace("-", "");
        } while (usedInThisBooking.contains(code) || ticketRepo.existsByTicketCode(code));
        usedInThisBooking.add(code);
        return code;
    }

    // Giá server tự tính: giá cơ bản x hệ số loại ghế
    private BigDecimal priceOf(BigDecimal base, Seat.SeatType type) {
        BigDecimal factor = switch (type) {
            case STANDARD -> BigDecimal.ONE;
            case VIP -> new BigDecimal("1.5");
            case COUPLE -> new BigDecimal("2.0");
        };
        return base.multiply(factor);
    }

    private BookingResponse toResponse(Booking b, List<Ticket> tickets) {
        List<TicketInfo> infos = tickets.stream()
                .map(t -> new TicketInfo(t.getId(), t.getTicketCode(),
                        t.getSeat().getRowName() + t.getSeat().getSeatNumber(),
                        t.getPrice(), t.getStatus().name()))
                .sorted(Comparator.comparing(TicketInfo::seat))
                .toList();
        return new BookingResponse(b.getId(), b.getShowtime().getId(), b.getStatus().name(),
                b.getTotalPrice(), infos);
    }
}