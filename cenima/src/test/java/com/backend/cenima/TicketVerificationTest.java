package com.backend.cenima;
import com.backend.cenima.Entity.*;
import com.backend.cenima.Repository.*;
import com.backend.cenima.Security.adapter.JwtProviderRegistry;
import com.backend.cenima.Security.contract.*;
import com.backend.cenima.Security.demo.*;
import com.backend.cenima.Service.*;
import com.backend.cenima.config.TicketProperties;
import io.jsonwebtoken.Jwts;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import java.nio.file.Path;
import java.util.*;
import java.time.Instant;
import static org.mockito.Mockito.*;
import static org.assertj.core.api.Assertions.*;
class TicketVerificationTest {
    @TempDir Path dir;
    TicketFixture.MutableClock clock; Ticket ticket; TicketProperties p; DemoRs256Provider provider;
    TicketPolicy policy; TicketJwtValidation validation; TicketVerificationService service; TicketActor actor;
    @BeforeEach void setup() {
        clock=new TicketFixture.MutableClock();ticket=TicketFixture.ticket();p=new TicketProperties("Asia/Ho_Chi_Minh",25,32768,dir.toString());
        provider=new DemoRs256Provider(p,clock);policy=new TicketPolicy(clock,p);
        validation=new TicketJwtValidation(new JwtProviderRegistry(List.of(provider),List.of(provider)),p,clock,policy,new QrCodeService(mock(TicketQrReferenceRepository.class),p,clock));
        var repo=mock(TicketRepository.class);when(repo.findById(123)).thenReturn(Optional.of(ticket));when(repo.findForCheckIn(123)).thenReturn(Optional.of(ticket));
        actor=new TicketActor(2,Set.of("STAFF"));service=new TicketVerificationService(()->actor,validation,repo,policy,clock,p);
    }
    String token() { return provider.sign(policy.payload(ticket).claims()); }
    void rejected(String token) { assertThatThrownBy(()->service.verify(token)).isInstanceOfSatisfying(TicketException.class,e->assertThat(e.status()).isEqualTo(422)); }
    @Test void verifyNeverConsumesAndAllReissuesShareDbState() {
        String first=token();clock.now=clock.now.plusSeconds(2);String second=token();
        assertThat(service.verify(first).checkedIn()).isFalse();assertThat(service.verify(first).status()).isEqualTo("UNUSED");
        assertThat(ticket.getUsedAt()).isNull();
        assertThat(service.checkIn(second).checkedIn()).isTrue();assertThat(ticket.getUsedAt()).isNotNull();
        assertThatThrownBy(()->service.checkIn(first)).isInstanceOfSatisfying(TicketException.class,e->assertThat(e.code()).isEqualTo("TICKET_USED"));
    }
    @Test void signatureValidButWrongDbClaimsAndIssuerAudienceAreRejected() {
        for (var change : Map.<String,Object>of("movieId",11,"showtimeId",51,"seatCode","B2","iss","login","aud","cinema-web","exp",policy.expiration(ticket)+3600).entrySet()) {
            var claims=new HashMap<>(policy.payload(ticket).claims());claims.put(change.getKey(),change.getValue());rejected(provider.sign(claims));
        }
    }
    @Test void missingAndWrongTypesNeverCoerceStringsOrDecimalsToIds() {
        for (String field : List.of("ticketId","movieId","showtimeId","seatCode","iat","exp","iss","aud")) {
            var claims=new HashMap<>(policy.payload(ticket).claims());claims.remove(field);rejected(provider.sign(claims));
        }
        for (Object wrong : List.of("123",123.0,-1,Long.MAX_VALUE)) {
            var claims=new HashMap<>(policy.payload(ticket).claims());claims.put("ticketId",wrong);rejected(provider.sign(claims));
        }
        var future=new HashMap<>(policy.payload(ticket).claims());future.put("iat",clock.now.plusSeconds(60).getEpochSecond());rejected(provider.sign(future));
    }
    @Test void exactExpiryAndStatusAndRoles() {
        String token=token();clock.now=Instant.ofEpochSecond(policy.expiration(ticket)-1);assertThat(service.verify(token).valid()).isTrue();
        clock.now=clock.now.plusSeconds(1);rejected(token);
        clock.now=Instant.parse("2026-10-26T05:00:00Z");ticket.setStatus(Ticket.TicketStatus.CANCELLED);
        assertThatThrownBy(()->service.verify(token)).isInstanceOfSatisfying(TicketException.class,e->assertThat(e.status()).isEqualTo(409));
        actor=new TicketActor(1,Set.of("CUSTOMER"));
        assertThatThrownBy(()->service.verify(token)).isInstanceOfSatisfying(TicketException.class,e->assertThat(e.status()).isEqualTo(403));
    }
    @Test void rejectsAccessJwtUntrustedHeaderAndOversizedInput() {
        var keys=DemoRsaKeys.load(dir);
        String access=Jwts.builder().header().type("JWT").keyId("demo-rs256-local-v1").and().claims(policy.payload(ticket).claims()).signWith(keys.getPrivate(),Jwts.SIG.RS256).compact();
        rejected(access);
        String untrusted=Jwts.builder().header().type("eticket+jwt").keyId("demo-rs256-local-v1").add("jku","https://untrusted.invalid/key").and().claims(policy.payload(ticket).claims()).signWith(keys.getPrivate(),Jwts.SIG.RS256).compact();
        rejected(untrusted);rejected("eyJhbGciOiJub25lIn0.e30.c2ln");
        assertThatThrownBy(()->service.verify("a".repeat(32769))).isInstanceOfSatisfying(TicketException.class,e->assertThat(e.status()).isEqualTo(400));
    }
    @Test void rejectsWrongNumericTypesInOriginalSignedJsonIncludingStandardDates() {
        var keys=DemoRsaKeys.load(dir);
        var json=tools.jackson.databind.json.JsonMapper.builder().build();
        for (String field : List.of("iat","exp","ticketId","movieId","showtimeId")) {
            for (Object wrong : List.of(String.valueOf(policy.payload(ticket).claims().get(field)),123.5,true)) {
                var claims=new HashMap<>(policy.payload(ticket).claims());claims.put(field,wrong);
                String signed=Jwts.builder().header().type("eticket+jwt").keyId("demo-rs256-local-v1").and()
                    .content(json.writeValueAsBytes(claims)).signWith(keys.getPrivate(),Jwts.SIG.RS256).compact();
                rejected(signed);
            }
        }
    }
}
