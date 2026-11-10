package com.backend.cenima;

import com.backend.cenima.Entity.TicketQrReference;
import com.backend.cenima.Repository.*;
import com.backend.cenima.Security.adapter.JwtProviderRegistry;
import com.backend.cenima.Security.contract.TicketActor;
import com.backend.cenima.Security.demo.DemoRs256Provider;
import com.backend.cenima.Security.pq.*;
import com.backend.cenima.Service.*;
import com.backend.cenima.config.TicketProperties;
import com.google.zxing.*;
import com.google.zxing.client.j2se.BufferedImageLuminanceSource;
import com.google.zxing.common.HybridBinarizer;
import java.io.ByteArrayInputStream;
import java.nio.file.Path;
import java.time.Instant;
import java.util.*;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class MlDsaTicketFlowTest {
    @TempDir Path directory;

    @Test void realMlDsaReferenceAndRsaShareExpiryOwnershipAndSingleUseTicketState() throws Exception {
        var clock = new TicketFixture.MutableClock();
        var ticket = TicketFixture.ticket();
        var properties = new TicketProperties("Asia/Ho_Chi_Minh",25,32768,directory.resolve("rsa").toString());
        var rsa = new DemoRs256Provider(properties,clock);
        var keys = new MlDsaKeyManager(directory.resolve("mldsa"));
        var registry = new JwtProviderRegistry(List.of(rsa,new MlDsaJwtSigner(keys)), List.of(rsa,new MlDsaJwtVerifier(keys)));
        var ticketRepo = mock(TicketRepository.class);
        when(ticketRepo.findById(123)).thenReturn(Optional.of(ticket));
        when(ticketRepo.findForCheckIn(123)).thenReturn(Optional.of(ticket));
        var refRepo = mock(TicketQrReferenceRepository.class);
        var stored = new HashMap<String,TicketQrReference>();
        when(refRepo.save(any())).thenAnswer(inv -> {
            TicketQrReference ref = inv.getArgument(0); stored.put(ref.getReferenceHash(),ref); return ref;
        });
        when(refRepo.findById(anyString())).thenAnswer(inv -> Optional.ofNullable(stored.get(inv.getArgument(0))));
        var qr = new QrCodeService(refRepo,properties,clock);
        var policy = new TicketPolicy(clock,properties);
        var actor = new TicketActor[]{new TicketActor(1,Set.of("CUSTOMER"))};
        var issuance = new TicketTokenService(ticketRepo,()->actor[0],policy,registry,qr);
        var validation = new TicketJwtValidation(registry,properties,clock,policy,qr);
        var check = new TicketVerificationService(()->new TicketActor(2,Set.of("STAFF")),validation,ticketRepo,policy,clock,properties);

        var first = issuance.issue(123,"ML-DSA-44");
        assertThat(first.qr().mode()).isEqualTo("REFERENCE");
        assertThat(first.qr().content()).startsWith("etkt:");
        var image = ImageIO.read(new ByteArrayInputStream(Base64.getDecoder().decode(first.qr().pngBase64())));
        assertThat(new MultiFormatReader().decode(new BinaryBitmap(new HybridBinarizer(new BufferedImageLuminanceSource(image)))).getText())
            .isEqualTo(first.qr().content());
        assertThat(check.verify(first.qr().content()).valid()).isTrue();
        assertThat(check.verify(first.token()).checkedIn()).isFalse();
        clock.now = clock.now.plusSeconds(60);
        var second = issuance.issue(123,"ML-DSA-44");
        var traditional = issuance.issue(123,"RS256");
        assertThat(second.expiresAt()).isEqualTo(first.expiresAt()).isEqualTo(traditional.expiresAt());
        assertThat(second.issuedAt()).isAfter(first.issuedAt());

        actor[0] = new TicketActor(9,Set.of("CUSTOMER"));
        assertThatThrownBy(() -> issuance.issue(123,"ML-DSA-44"))
            .isInstanceOfSatisfying(TicketException.class,e->assertThat(e.status()).isEqualTo(403));
        actor[0] = new TicketActor(9,Set.of("ADMIN"));
        assertThat(issuance.issue(123,"ML-DSA-44").algorithm()).isEqualTo("ML-DSA-44");
        assertThat(check.checkIn(first.qr().content()).checkedIn()).isTrue();
        for (String value : List.of(second.qr().content(),traditional.token())) {
            assertThatThrownBy(() -> check.checkIn(value))
                .isInstanceOfSatisfying(TicketException.class,e->assertThat(e.code()).isEqualTo("TICKET_USED"));
        }
        clock.now = first.expiresAt();
        assertThatThrownBy(() -> check.verify(first.token()))
            .isInstanceOfSatisfying(TicketException.class,e->assertThat(e.status()).isEqualTo(422));
        assertThatThrownBy(() -> check.verify(first.qr().content()))
            .isInstanceOfSatisfying(TicketException.class,e->assertThat(e.code()).isEqualTo("REFERENCE_EXPIRED"));
    }
}
