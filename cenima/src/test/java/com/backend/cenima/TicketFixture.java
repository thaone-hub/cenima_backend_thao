package com.backend.cenima;
import com.backend.cenima.Entity.*;
import java.time.*;
import java.math.BigDecimal;
final class TicketFixture {
    static Ticket ticket() {
        var role=new Role(); role.setId(1); role.setRoleName("CUSTOMER");
        var user=new User(); user.setId(1); user.setRole(role); user.setIsActive(true);
        var movie=new Movie(); movie.setId(10); movie.setTitle("Demo movie"); movie.setDuration(100);
        var room=new Room(); room.setId(1); room.setRoomName("Room 1");
        var seat=new Seat(); seat.setId(1); seat.setRoom(room); seat.setRowName("A"); seat.setSeatNumber(1);
        var show=new Showtime(); show.setId(50); show.setMovie(movie); show.setRoom(room); show.setStartTime(LocalDateTime.of(2026,10,28,12,0));
        var booking=new Booking(); booking.setId(1); booking.setUser(user); booking.setShowtime(show); booking.setStatus(Booking.BookingStatus.PAID);
        var ticket=new Ticket(); ticket.setId(123); ticket.setTicketCode("0123456789abcdef0123456789abcdef"); ticket.setBooking(booking);
        ticket.setUser(user); ticket.setMovie(movie); ticket.setShowtime(show); ticket.setSeat(seat); ticket.setPrice(BigDecimal.valueOf(75000));
        return ticket;
    }
    static class MutableClock extends Clock {
        Instant now=Instant.parse("2026-10-26T05:00:00Z");
        public ZoneId getZone() { return ZoneId.of("Asia/Ho_Chi_Minh"); }
        public Clock withZone(ZoneId zone) { return Clock.fixed(now,zone); }
        public Instant instant() { return now; }
    }
}
