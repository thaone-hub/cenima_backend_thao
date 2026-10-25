package com.backend.cenima.Controller;

import com.backend.cenima.DTO.BookingResponse;
import com.backend.cenima.DTO.CreateBookingRequest;
import com.backend.cenima.DTO.SeatStatusResponse;
import com.backend.cenima.Service.BookingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;

    // GET /api/showtimes/{id}/seats
    @GetMapping("/showtimes/{showtimeId}/seats")
    public List<SeatStatusResponse> seatMap(@PathVariable Integer showtimeId) {
        return bookingService.getSeatMap(showtimeId);
    }

    // POST /api/bookings
    // TẠM THỜI: userId lấy từ header X-User-Id để test bằng Postman.
    // Khi nối với đăng nhập, bỏ header này và lấy userId từ JWT/Authentication.
    @PostMapping("/bookings")
    @ResponseStatus(HttpStatus.CREATED)
    public BookingResponse create(@RequestHeader("X-User-Id") Integer userId,
                                  @Valid @RequestBody CreateBookingRequest req) {
        return bookingService.createBooking(userId, req);
    }
}