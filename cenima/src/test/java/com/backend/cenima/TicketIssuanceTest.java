package com.backend.cenima;
import com.backend.cenima.Entity.*;
import com.backend.cenima.Repository.TicketRepository;
import com.backend.cenima.Security.adapter.JwtProviderRegistry;
import com.backend.cenima.Security.contract.*;
import com.backend.cenima.Security.demo.DemoRs256Provider;
import com.backend.cenima.Service.*;
import com.backend.cenima.config.TicketProperties;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import java.nio.file.Path;
import java.time.*;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.assertj.core.api.Assertions.*;
class TicketIssuanceTest {
    @TempDir Path dir;
    Ticket ticket; TicketFixture.MutableClock clock; TicketTokenService service; TicketActor actor;
    @BeforeEach void setup() {
        ticket=TicketFixture.ticket(); clock=new TicketFixture.MutableClock(); actor=new TicketActor(1,Set.of("CUSTOMER"));
        var properties=new TicketProperties("Asia/Ho_Chi_Minh",25,32768,dir.toString());
        var provider=new DemoRs256Provider(properties,clock);
        var repo=mock(TicketRepository.class); when(repo.findById(123)).thenReturn(Optional.of(ticket));
        service=new TicketTokenService(repo,()->actor,new TicketPolicy(clock,properties),new JwtProviderRegistry(List.of(provider),List.of(provider)),
            new QrCodeService(mock(com.backend.cenima.Repository.TicketQrReferenceRepository.class),properties,clock));
    }
    @Test void advanceBookingAndReissueUseSameShowEndInVietnamTime() {
        var first=service.issue(123,"RS256");
        assertThat(first.expiresAt()).isEqualTo(Instant.parse("2026-10-28T06:40:00Z"));
        clock.now=clock.now.plusSeconds(3600);
        var second=service.issue(123,"RS256");
        assertThat(second.expiresAt()).isEqualTo(first.expiresAt());
        assertThat(second.issuedAt()).isAfter(first.issuedAt());
        assertThat(second.ticket().seatCode()).isEqualTo("A1");
    }
    @Test void validOneSecondBeforeEndButExpiredExactlyAtEnd() {
        clock.now=Instant.parse("2026-10-28T06:39:59Z");
        assertThatCode(()->service.issue(123,"RS256")).doesNotThrowAnyException();
        clock.now=clock.now.plusSeconds(1);
        error(422,"TICKET_EXPIRED");
    }
    @Test void ownershipAndAdminRules() {
        actor=new TicketActor(2,Set.of("STAFF")); error(403,"FORBIDDEN");
        actor=new TicketActor(2,Set.of("ADMIN")); assertThatCode(()->service.issue(123,"RS256")).doesNotThrowAnyException();
    }
    @Test void refusesUsedCancelledUnpaidAndInvalidDuration() {
        ticket.setStatus(Ticket.TicketStatus.USED); error(409,"TICKET_USED");
        ticket.setStatus(Ticket.TicketStatus.CANCELLED); error(409,"TICKET_CANCELLED");
        ticket.setStatus(Ticket.TicketStatus.UNUSED); ticket.getBooking().setStatus(Booking.BookingStatus.PENDING); error(409,"BOOKING_NOT_PAID");
        ticket.getBooking().setStatus(Booking.BookingStatus.PAID); ticket.getMovie().setDuration(null); error(422,"TICKET_DATA_INVALID");
        ticket.getMovie().setDuration(0); error(422,"TICKET_DATA_INVALID");
    }
    void error(int status,String code) {
        assertThatThrownBy(()->service.issue(123,"RS256")).isInstanceOfSatisfying(TicketException.class,e->{assertThat(e.status()).isEqualTo(status);assertThat(e.code()).isEqualTo(code);});
    }
}
