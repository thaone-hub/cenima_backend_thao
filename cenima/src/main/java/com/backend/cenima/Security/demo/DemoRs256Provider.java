package com.backend.cenima.Security.demo;
import com.backend.cenima.Security.contract.*;
import com.backend.cenima.config.TicketProperties;
import io.jsonwebtoken.*;
import java.nio.file.Path;
import java.security.KeyPair;
import java.time.Clock;
import java.util.*;
import org.springframework.stereotype.Component;
import org.springframework.context.annotation.Profile;
@Component
@Profile("demo & !integrated")
public class DemoRs256Provider implements JwtSigner, JwtVerifier {
    private static final String KID = "demo-rs256-local-v1";
    private final KeyPair keys;
    private final Clock clock;
    private final tools.jackson.databind.json.JsonMapper json=tools.jackson.databind.json.JsonMapper.builder()
        .enable(tools.jackson.core.StreamReadFeature.STRICT_DUPLICATE_DETECTION).build();
    public DemoRs256Provider(TicketProperties p, Clock clock) { this.keys = DemoRsaKeys.load(Path.of(p.demoKeyDirectory())); this.clock = clock; }
    public String algorithm() { return "RS256"; }
    public String sign(Map<String, Object> claims) {
        return Jwts.builder().header().type("eticket+jwt").keyId(KID).and()
                .claims(claims).signWith(keys.getPrivate(), Jwts.SIG.RS256).compact();
    }
    public VerifiedJwt verify(String compactJwt) {
        var builder = Jwts.parser().verifyWith(keys.getPublic()).clock(() -> Date.from(clock.instant()));
        var allowed = builder.sig();
        Jwts.SIG.get().values().stream().filter(a -> !"RS256".equals(a.getId())).forEach(allowed::remove);
        var parsed = allowed.and().build().parseSignedClaims(compactJwt);
        var h = parsed.getHeader();
        if (!"RS256".equals(h.getAlgorithm()) || !KID.equals(h.getKeyId()) || !"eticket+jwt".equals(h.getType())
                || h.containsKey("jku") || h.containsKey("jwk") || h.containsKey("x5u") || h.containsKey("crit"))
            throw new UnsupportedJwtException("Unexpected ticket JWS header");
        // JJWT normalizes registered date claims. Read original JSON only AFTER its signature is verified,
        // so the business layer can reject strings/fractions rather than accepting coercions.
        try {
            @SuppressWarnings("unchecked") Map<String,Object> original=json.readValue(Base64.getUrlDecoder().decode(compactJwt.split("\\.")[1]),Map.class);
            return new VerifiedJwt(h.getAlgorithm(), h.getKeyId(), h.getType(), original);
        } catch (RuntimeException e) { throw new MalformedJwtException("Invalid ticket JSON",e); }
    }
}
