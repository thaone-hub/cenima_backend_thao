package com.backend.cenima.Service;
import com.backend.cenima.Security.adapter.JwtProviderRegistry;
import com.backend.cenima.Security.contract.*;
import com.backend.cenima.config.TicketProperties;
import com.backend.cenima.Entity.Ticket;
import java.time.Clock;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.math.BigInteger;
import io.jsonwebtoken.JwtException;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.core.StreamReadFeature;
/** Only an untrusted algorithm hint is read before a provider verifies the JWS. */
@Component
public class TicketJwtValidation {
    private final JwtProviderRegistry registry;
    private final TicketProperties properties;
    private final Clock clock;
    private final TicketPolicy policy;
    private final QrCodeService qrCodes;
    private final JsonMapper mapper=JsonMapper.builder().enable(StreamReadFeature.STRICT_DUPLICATE_DETECTION).build();
    public TicketJwtValidation(JwtProviderRegistry registry,TicketProperties properties,Clock clock,TicketPolicy policy,QrCodeService qrCodes) {
        this.registry=registry;this.properties=properties;this.clock=clock;this.policy=policy;this.qrCodes=qrCodes;
    }
    public ValidatedToken validate(String input) {
        String token=normalize(qrCodes.resolve(normalize(input)));
        String alg=algorithm(token);
        if (!JwtProviderRegistry.ALGORITHMS.contains(alg)) throw invalid("Thuật toán JWT không được phép");
        VerifiedJwt jwt;
        try { jwt=registry.verifier(alg).verify(token); }
        catch (JwtException | IllegalArgumentException e) { throw invalid("JWT sai chữ ký, header hoặc đã hết hạn"); }
        if (jwt==null || !alg.equals(jwt.algorithm()) || !"eticket+jwt".equals(jwt.type()) || jwt.keyId()==null || jwt.keyId().isBlank() || jwt.claims()==null)
            throw invalid("Header JWT vé không hợp lệ");
        var c=jwt.claims();
        if (!"cinema-ticket".equals(c.get("iss")) || !validAudience(c.get("aud"))) throw invalid("Issuer/audience của JWT không hợp lệ");
        long iat=integer(c,"iat"),exp=integer(c,"exp"),now=clock.instant().getEpochSecond();
        if (iat<0 || exp<=iat || iat>now || now>=exp) throw invalid("Thời gian JWT không hợp lệ hoặc đã hết hạn");
        long ticketId=integer(c,"ticketId"),movieId=integer(c,"movieId"),showtimeId=integer(c,"showtimeId");
        if (ticketId<=0 || ticketId>Integer.MAX_VALUE || movieId<=0 || movieId>Integer.MAX_VALUE || showtimeId<=0 || showtimeId>Integer.MAX_VALUE)
            throw invalid("ID trong JWT không hợp lệ");
        if (!(c.get("seatCode") instanceof String seat) || seat.isBlank() || seat.length()>32) throw invalid("Thiếu mã ghế hợp lệ");
        return new ValidatedToken((int)ticketId,(int)movieId,(int)showtimeId,seat,exp);
    }
    public void match(ValidatedToken c,Ticket t) {
        if (!t.getId().equals(c.ticketId()) || !t.getMovie().getId().equals(c.movieId()) || !t.getShowtime().getId().equals(c.showtimeId())
            || !(t.getSeat().getRowName()+t.getSeat().getSeatNumber()).equals(c.seatCode()) || policy.expiration(t)!=c.exp())
            throw invalid("JWT không khớp dữ liệu vé hiện tại");
    }
    private String normalize(String value) {
        if (value==null || value.length()>properties.maxInputBytes() || value.getBytes(StandardCharsets.UTF_8).length>properties.maxInputBytes())
            throw new TicketException(400,"INPUT_INVALID","Dữ liệu vượt giới hạn cho phép");
        value=value.strip();
        if (value.isEmpty()) throw new TicketException(400,"INPUT_INVALID","Cần JWT hoặc mã tham chiếu");
        return value;
    }
    private String algorithm(String token) {
        String[] parts=token.split("\\.",-1);
        if (parts.length!=3 || parts[0].length()>4096 || Arrays.stream(parts).anyMatch(p->!p.matches("[A-Za-z0-9_-]+"))) throw invalid("Cần compact JWS hợp lệ");
        try {
            var header=mapper.readTree(Base64.getUrlDecoder().decode(parts[0]));
            if (!header.isObject() || !header.has("alg") || !header.get("alg").isString() || header.has("jku") || header.has("jwk")
                || header.has("x5u") || header.has("crit") || header.has("b64") || header.has("zip")) throw invalid("JWS header không được hỗ trợ");
            return header.get("alg").asString();
        } catch (TicketException e) { throw e; }
        catch (RuntimeException e) { throw invalid("Header JWT không hợp lệ"); }
    }
    private boolean validAudience(Object value) {
        return "cinema-checkin".equals(value) || (value instanceof Collection<?> a && a.size()==1 && a.contains("cinema-checkin"));
    }
    private long integer(Map<String,Object> c,String name) {
        Object n=c.get(name);
        if (n instanceof Byte || n instanceof Short || n instanceof Integer || n instanceof Long) return ((Number)n).longValue();
        if (n instanceof BigInteger b) { try { return b.longValueExact(); } catch (ArithmeticException e) { throw invalid("Claim số vượt giới hạn"); } }
        throw invalid("Claim "+name+" phải là số nguyên");
    }
    private TicketException invalid(String message) { return new TicketException(422,"TOKEN_INVALID",message); }
    public record ValidatedToken(Integer ticketId,Integer movieId,Integer showtimeId,String seatCode,long exp) {}
}
