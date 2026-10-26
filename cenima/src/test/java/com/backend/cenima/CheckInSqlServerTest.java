package com.backend.cenima;
import com.backend.cenima.Entity.*;
import com.backend.cenima.DTO.CreateBookingRequest;
import com.backend.cenima.Repository.*;
import com.backend.cenima.Security.contract.*;
import com.backend.cenima.Service.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.*;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.jdbc.core.JdbcTemplate;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import java.math.BigDecimal;
import static org.assertj.core.api.Assertions.*;
@ContextConfiguration(classes=CheckInSqlServerTest.Actors.class)
@org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable(named="TEST_DB_URL",matches=".*databaseName=CINEMA_THAO_ETICKET_TEST(?:;.*)?")
class CheckInSqlServerTest extends SqlServerTestSupport {
    @TestConfiguration static class Actors {
        @Bean @Primary TicketActorProvider testActorProvider() { return ()->new TicketActor(1,Set.of("ADMIN")); }
    }
    @Autowired TicketTokenService tokens;
    @Autowired TicketVerificationService verify;
    @Autowired QrCodeService qr;
    @Autowired TicketRepository tickets;
    @Autowired UserRepository users;
    @Autowired ShowtimeRepository showtimes;
    @Autowired SeatRepository seats;
    @Autowired BookingService bookings;
    @Autowired PlatformTransactionManager tx;
    @Autowired JdbcTemplate jdbc;
    @Autowired List<JwtSigner> signers;
    @Autowired List<JwtVerifier> verifiers;
    Integer ticketId,bookingId,showtimeId;
    @BeforeEach void fixture() {
        new TransactionTemplate(tx).executeWithoutResult(s->{
            var original=showtimes.findAll().getFirst();
            var show=new Showtime();show.setRoom(original.getRoom());show.setMovie(original.getMovie());
            show.setStartTime(LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh")).plusDays(3));show.setPrice(BigDecimal.valueOf(75000));
            showtimes.saveAndFlush(show);showtimeId=show.getId();
            var seat=seats.findByRoom_IdOrderByRowNameAscSeatNumberAsc(show.getRoom().getId()).getFirst();
            var user=users.findByEmail("customer@cinema.test").orElseThrow();
            var booking=bookings.createBooking(user.getId(),new CreateBookingRequest(show.getId(),List.of(seat.getId())));
            bookingId=booking.id();ticketId=booking.tickets().getFirst().ticketId();
        });
    }
    @AfterEach void cleanupOnlyOwnFixtures() {
        if (ticketId==null) return;
        new TransactionTemplate(tx).executeWithoutResult(s->{
            jdbc.update("DELETE FROM TicketQrReferences WHERE TicketID=?",ticketId);
            jdbc.update("DELETE FROM Tickets WHERE TicketID=?",ticketId);
            jdbc.update("DELETE FROM BookingDetails WHERE BookingID=?",bookingId);
            jdbc.update("DELETE FROM Bookings WHERE BookingID=?",bookingId);
            jdbc.update("DELETE FROM Showtimes WHERE ShowtimeID=?",showtimeId);
        });
    }
    @Test void twoTransactionsWithTwoJwtsProduceExactlyOneSuccess() throws Exception {
        var first=tokens.issue(ticketId,"RS256");
        var claims=new HashMap<>(verifiers.getFirst().verify(first.token()).claims());
        claims.put("jti",UUID.randomUUID().toString());
        String second=signers.getFirst().sign(claims);
        assertThat(second).isNotEqualTo(first.token());
        assertThat(verify.verify(first.token()).checkedIn()).isFalse();assertThat(verify.verify(second).checkedIn()).isFalse();
        var ready=new CountDownLatch(2);var start=new CountDownLatch(1);var pool=Executors.newFixedThreadPool(2);
        try {
            var futures=new ArrayList<Future<Integer>>();
            for (String value : List.of(first.token(),second)) futures.add(pool.submit(()->{
                ready.countDown();if (!start.await(5,TimeUnit.SECONDS)) throw new IllegalStateException("Barrier timeout");
                try { return verify.checkIn(value).checkedIn()?200:500; } catch (TicketException e) { return e.status(); }
            }));
            assertThat(ready.await(5,TimeUnit.SECONDS)).isTrue();start.countDown();
            assertThat(List.of(futures.get(0).get(20,TimeUnit.SECONDS),futures.get(1).get(20,TimeUnit.SECONDS))).containsExactlyInAnyOrder(200,409);
            new TransactionTemplate(tx).executeWithoutResult(s->{var t=tickets.findById(ticketId).orElseThrow();assertThat(t.getStatus()).isEqualTo(Ticket.TicketStatus.USED);assertThat(t.getUsedAt()).isNotNull();});
        } finally { pool.shutdownNow(); }
    }
    @Test void referenceAndJwtShareVerificationAndUsedState() {
        var issued=tokens.issue(ticketId,"RS256");
        // Force a reference by signing normally and configuring a smaller QR version in a test service.
        String reference=new TransactionTemplate(tx).execute(s->{
            var t=tickets.findById(ticketId).orElseThrow();
            var p=new com.backend.cenima.config.TicketProperties("Asia/Ho_Chi_Minh",5,32768,"unused");
            return new QrCodeService(references(),p,Clock.systemUTC()).create(issued.token(),t,issued.expiresAt().getEpochSecond()).content();
        });
        assertThat(reference).startsWith("etkt:");
        assertThat(verify.verify(reference).checkedIn()).isFalse();assertThat(verify.verify(reference).checkedIn()).isFalse();
        assertThat(verify.checkIn(reference).checkedIn()).isTrue();
        assertThatThrownBy(()->verify.checkIn(issued.token())).isInstanceOfSatisfying(TicketException.class,e->assertThat(e.status()).isEqualTo(409));
    }
    @Test void cancelledTicketRejectsPreviouslyIssuedReference() {
        var issued=tokens.issue(ticketId,"RS256");
        String reference=new TransactionTemplate(tx).execute(s->{
            var t=tickets.findForCheckIn(ticketId).orElseThrow();
            var p=new com.backend.cenima.config.TicketProperties("Asia/Ho_Chi_Minh",5,32768,"unused");
            String content=new QrCodeService(referenceRepository,p,Clock.systemUTC()).create(issued.token(),t,issued.expiresAt().getEpochSecond()).content();
            t.setStatus(Ticket.TicketStatus.CANCELLED);tickets.flush();return content;
        });
        assertThatThrownBy(()->verify.verify(reference)).isInstanceOfSatisfying(TicketException.class,e->assertThat(e.code()).isEqualTo("TICKET_CANCELLED"));
    }
    @Autowired TicketQrReferenceRepository referenceRepository;
    private TicketQrReferenceRepository references() { return referenceRepository; }
}
