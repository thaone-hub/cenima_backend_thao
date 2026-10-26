package com.backend.cenima;

import com.backend.cenima.DTO.CreateBookingRequest;
import com.backend.cenima.Entity.Ticket.TicketStatus;
import com.backend.cenima.Repository.*;
import com.backend.cenima.Service.BookingService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import static org.assertj.core.api.Assertions.*;

@SpringBootTest
@org.springframework.test.context.ActiveProfiles("demo")
@Transactional
@EnabledIfEnvironmentVariable(named = "TEST_DB_URL", matches = ".*databaseName=CINEMA_THAO_ETICKET_TEST(?:;.*)?")
class BookingSqlServerTest {
    @DynamicPropertySource
    static void database(DynamicPropertyRegistry r) {
        r.add("spring.datasource.url", () -> System.getenv("TEST_DB_URL"));
        r.add("spring.datasource.username", () -> System.getenv("TEST_DB_USERNAME"));
        r.add("spring.datasource.password", () -> System.getenv("TEST_DB_PASSWORD"));
    }
    @Autowired BookingService service;
    @Autowired UserRepository users;
    @Autowired ShowtimeRepository showtimes;
    @Autowired SeatRepository seats;
    @Autowired TicketRepository tickets;

    @Test void bookingCreatesPaidBookingAnd32CharacterUnusedTicket() {
        var user = users.findByEmail("customer@cinema.test").orElseThrow();
        var show = showtimes.findAll().stream().filter(s -> s.getStartTime().isAfter(java.time.LocalDateTime.now())).findFirst().orElseThrow();
        var taken = tickets.findSeatIdsByShowtimeAndStatusNot(show.getId(), TicketStatus.CANCELLED);
        var seat = seats.findByRoom_IdOrderByRowNameAscSeatNumberAsc(show.getRoom().getId()).stream()
                .filter(s -> !taken.contains(s.getId())).findFirst().orElseThrow();
        var result = service.createBooking(user.getId(), new CreateBookingRequest(show.getId(), List.of(seat.getId())));
        assertThat(result.status()).isEqualTo("PAID");
        assertThat(result.tickets()).hasSize(1);
        var info = result.tickets().getFirst();
        assertThat(info.ticketCode()).hasSize(32);
        assertThat(info.status()).isEqualTo("UNUSED");
        assertThat(tickets.findById(info.ticketId())).isPresent();
        assertThat(service.getSeatMap(show.getId())).anySatisfy(s -> {
            assertThat(s.seatId()).isEqualTo(seat.getId());
            assertThat(s.status()).isEqualTo("BOOKED");
        });
    }
}
