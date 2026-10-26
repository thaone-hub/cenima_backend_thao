package com.backend.cenima;

import com.backend.cenima.Security.adapter.ThaoTicketJwtAdapter;
import com.backend.cenima.Security.traditional.*;
import com.nimbusds.jose.*;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jwt.*;
import io.jsonwebtoken.JwtException;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import java.nio.file.*;
import java.time.Instant;
import java.util.*;
import static org.assertj.core.api.Assertions.*;

class ThaoTicketAdapterTest {
    @TempDir Path dir;
    static List<ThaoTicketJwtAdapter> adapters(KeyManager keys) {
        var rsa=new Rs256JwtSigner(keys);var ec=new Es256JwtSigner(keys);var ed=new EdDsaJwtSigner(keys);
        return List.of(new ThaoTicketJwtAdapter("RS256",rsa::sign,rsa),new ThaoTicketJwtAdapter("ES256",ec::sign,ec),new ThaoTicketJwtAdapter("EdDSA",ed::sign,ed));
    }
    Map<String,Object> claims() { long now=Instant.now().getEpochSecond();return Map.of("iss","cinema-ticket","aud","cinema-checkin","iat",now,"exp",now+86400,"ticketId",1,"movieId",1,"showtimeId",1,"seatCode","A1"); }
    @Test void threeActualProvidersKeepEticketPurposeAndReloadPersistedKeys() throws Exception {
        var first=adapters(new KeyManager(dir));var reloaded=adapters(new KeyManager(dir));
        for (int i=0;i<first.size();i++) {
            var token=first.get(i).sign(claims());var verified=reloaded.get(i).verify(token);
            assertThat(verified.type()).isEqualTo("eticket+jwt");assertThat(verified.algorithm()).isEqualTo(first.get(i).algorithm());
            assertThat(verified.claims().get("iat")).isInstanceOf(Number.class);assertThat(verified.claims().get("ticketId")).isEqualTo(1);
        }
    }
    @Test void authInterfaceStillSignsJwtAndTicketAdapterRejectsIt() throws Exception {
        var keys=new KeyManager(dir);var provider=new Rs256JwtSigner(keys);
        String auth=provider.sign(JWTClaimsSet.parse(claims()));
        assertThat(SignedJWT.parse(auth).getHeader().getType()).isEqualTo(JOSEObjectType.JWT);
        assertThatThrownBy(()->adapters(keys).getFirst().verify(auth)).isInstanceOf(JwtException.class);
    }
    @Test void rejectsWrongKeyKidAndPreservesOriginalNumericJsonType() throws Exception {
        var keys=new KeyManager(dir);var adapter=adapters(keys).getFirst();var other=adapters(new KeyManager(dir.resolve("other"))).getFirst();
        var token=adapter.sign(claims());assertThatThrownBy(()->other.verify(token)).isInstanceOf(JwtException.class);
        var header=new JWSHeader.Builder(JWSAlgorithm.RS256).type(new JOSEObjectType("eticket+jwt")).keyID("unknown").build();
        var jwt=new SignedJWT(header,JWTClaimsSet.parse(claims()));jwt.sign(new RSASSASigner(keys.getRsaPrivateKey()));
        assertThatThrownBy(()->adapter.verify(jwt.serialize())).isInstanceOf(JwtException.class);
        var invalid=new HashMap<>(claims());invalid.put("ticketId","1");
        var raw=new JWSObject(new JWSHeader.Builder(JWSAlgorithm.RS256).type(new JOSEObjectType("eticket+jwt")).keyID("rsa-key-1").build(),new Payload(invalid));
        raw.sign(new RSASSASigner(keys.getRsaPrivateKey()));
        assertThat(adapter.verify(raw.serialize()).claims().get("ticketId")).isEqualTo("1");
        // Business validation must reject this string; adapter must not silently coerce it.
    }
    @Test void corruptedPersistentKeyFileFailsWithoutReplacingIt() throws Exception {
        new KeyManager(dir);var path=dir.resolve("traditional.jwk");Files.writeString(path,"corrupt");
        assertThatThrownBy(()->new KeyManager(dir)).isInstanceOf(JOSEException.class);
        assertThat(Files.readString(path)).isEqualTo("corrupt");
    }
}
