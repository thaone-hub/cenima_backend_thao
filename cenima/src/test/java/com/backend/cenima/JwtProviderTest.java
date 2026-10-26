package com.backend.cenima;
import com.backend.cenima.Security.adapter.JwtProviderRegistry;
import com.backend.cenima.Security.demo.*;
import com.backend.cenima.Service.TicketException;
import com.backend.cenima.config.TicketProperties;
import io.jsonwebtoken.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import java.nio.file.Path;
import java.time.*;
import java.time.Clock;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
class JwtProviderTest {
    @TempDir Path dir;
    final Clock clock = Clock.fixed(Instant.parse("2026-10-26T05:00:00Z"), ZoneOffset.UTC);
    TicketProperties properties(Path p) { return new TicketProperties("Asia/Ho_Chi_Minh",25,32768,p.toString()); }
    Map<String,Object> claims() { return Map.of("ticketId", 1, "iat", clock.instant().getEpochSecond(), "exp", clock.instant().plusSeconds(7200).getEpochSecond()); }
    @Test void realRs256AndKeysSurviveReload() {
        var first = new DemoRs256Provider(properties(dir), clock);
        var token = first.sign(claims());
        var reloaded = new DemoRs256Provider(properties(dir), clock);
        assertThat(reloaded.verify(token).algorithm()).isEqualTo("RS256");
        assertThat(reloaded.verify(token).type()).isEqualTo("eticket+jwt");
        assertThat(reloaded.verify(token).claims().get("ticketId")).isEqualTo(1);
    }
    @Test void rejectsWrongKeyTamperingAndExpiry() {
        var provider = new DemoRs256Provider(properties(dir),clock);
        var token = provider.sign(claims());
        var wrongKey = new DemoRs256Provider(properties(dir.resolve("other")),clock);
        assertThatThrownBy(() -> wrongKey.verify(token)).isInstanceOf(JwtException.class);
        String[] parts = token.split("\\.");
        parts[1] = Base64.getUrlEncoder().withoutPadding().encodeToString("{\"ticketId\":2}".getBytes(java.nio.charset.StandardCharsets.UTF_8));
        assertThatThrownBy(() -> provider.verify(String.join(".",parts))).isInstanceOf(JwtException.class);
        var expired = provider.sign(Map.of("exp",clock.instant().minusSeconds(1).getEpochSecond()));
        assertThatThrownBy(() -> provider.verify(expired)).isInstanceOf(ExpiredJwtException.class);
    }
    @Test void refusesAccessTokenTypeAndWrongAlgorithm() {
        var keys = DemoRsaKeys.load(dir);
        var provider = new DemoRs256Provider(properties(dir),clock);
        String access = Jwts.builder().header().type("JWT").keyId("demo-rs256-local-v1").and().claims(claims())
            .signWith(keys.getPrivate(),Jwts.SIG.RS256).compact();
        String wrongAlg = Jwts.builder().header().type("eticket+jwt").keyId("demo-rs256-local-v1").and().claims(claims())
            .signWith(keys.getPrivate(),Jwts.SIG.RS512).compact();
        assertThatThrownBy(() -> provider.verify(access)).isInstanceOf(JwtException.class);
        assertThatThrownBy(() -> provider.verify(wrongAlg)).isInstanceOf(JwtException.class);
    }
    @Test void registryNeverFakesUnavailableAlgorithms() {
        var provider = new DemoRs256Provider(properties(dir),clock);
        var registry = new JwtProviderRegistry(List.of(provider),List.of(provider));
        assertThat(registry.algorithms().stream().filter(JwtProviderRegistry.Availability::available).count()).isEqualTo(1);
        assertThatThrownBy(() -> registry.signer("ML-DSA-44")).isInstanceOfSatisfying(TicketException.class, e -> assertThat(e.status()).isEqualTo(503));
        assertThatThrownBy(() -> registry.verifier("none")).isInstanceOfSatisfying(TicketException.class, e -> assertThat(e.status()).isEqualTo(400));
        assertThatThrownBy(() -> new JwtProviderRegistry(List.of(provider,provider),List.of(provider))).isInstanceOf(IllegalStateException.class);
    }
}
