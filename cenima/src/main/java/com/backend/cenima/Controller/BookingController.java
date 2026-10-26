package com.backend.cenima.Controller;

import com.backend.cenima.DTO.BookingResponse;
import com.backend.cenima.DTO.CreateBookingRequest;
import com.backend.cenima.DTO.SeatStatusResponse;
import com.backend.cenima.Service.BookingService;
import com.backend.cenima.Security.contract.TicketActorProvider;
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
    private final TicketActorProvider actors;

    // GET /api/showtimes/{id}/seats
    @GetMapping("/showtimes/{showtimeId}/seats")
    public List<SeatStatusResponse> seatMap(@PathVariable Integer showtimeId) {
        return bookingService.getSeatMap(showtimeId);
    }

    // POST /api/bookings
    // Demo retains X-User-Id. Integrated obtains the authenticated database actor.
    @PostMapping("/bookings")
    @ResponseStatus(HttpStatus.CREATED)
    public BookingResponse create(@Valid @RequestBody CreateBookingRequest req) {
        return bookingService.createBooking(actors.currentActor().userId(), req);
    }
}
