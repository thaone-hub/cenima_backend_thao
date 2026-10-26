package com.backend.cenima;
import com.backend.cenima.Entity.TicketQrReference;
import com.backend.cenima.Repository.TicketQrReferenceRepository;
import com.backend.cenima.Service.*;
import com.backend.cenima.config.TicketProperties;
import com.google.zxing.*;
import com.google.zxing.client.j2se.BufferedImageLuminanceSource;
import com.google.zxing.common.HybridBinarizer;
import org.junit.jupiter.api.*;
import java.util.*;
import java.io.ByteArrayInputStream;
import javax.imageio.ImageIO;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.assertj.core.api.Assertions.*;
class QrCodeTest {
    TicketFixture.MutableClock clock; TicketQrReferenceRepository repository; Map<String,TicketQrReference> store; TicketProperties p;
    @BeforeEach void setup() {
        clock=new TicketFixture.MutableClock(); repository=mock(TicketQrReferenceRepository.class); store=new HashMap<>();
        p=new TicketProperties("Asia/Ho_Chi_Minh",25,32768,"unused-in-this-test");
        when(repository.save(any())).thenAnswer(i->{TicketQrReference r=i.getArgument(0);store.put(r.getReferenceHash(),r);return r;});
        when(repository.findById(anyString())).thenAnswer(i->Optional.ofNullable(store.get(i.getArgument(0))));
    }
    @Test void directAndReferencePngRoundTripAndReload() throws Exception {
        var service=new QrCodeService(repository,p,clock);
        String shortToken="header."+"a".repeat(500)+".signature";
        var direct=service.create(shortToken,TicketFixture.ticket(),clock.now.plusSeconds(3600).getEpochSecond());
        assertThat(direct.mode()).isEqualTo("JWT"); assertThat(decode(direct.pngBase64())).isEqualTo(shortToken); assertThat(store).isEmpty();
        String largeToken="a".repeat(8000); // Capacity test only, never a production signer.
        var reference=service.create(largeToken,TicketFixture.ticket(),clock.now.plusSeconds(3600).getEpochSecond());
        assertThat(reference.mode()).isEqualTo("REFERENCE"); assertThat(decode(reference.pngBase64())).isEqualTo(reference.content());
        assertThat(reference.content()).matches("etkt:[A-Za-z0-9_-]{43}");
        assertThat(store).containsKey(QrCodeService.hash(reference.content())).doesNotContainKey(reference.content());
        var reloaded=new QrCodeService(repository,p,clock); assertThat(reloaded.resolve(reference.content())).isEqualTo(largeToken);
        assertThat(reloaded.resolve(reference.content())).isEqualTo(largeToken); // Verify does not consume references.
        clock.now=clock.now.plusSeconds(3600);
        assertThatThrownBy(()->reloaded.resolve(reference.content())).isInstanceOfSatisfying(TicketException.class,e->assertThat(e.code()).isEqualTo("REFERENCE_EXPIRED"));
    }
    @Test void missingMalformedReferencesAreRejected() {
        var service=new QrCodeService(repository,p,clock);
        assertThatThrownBy(()->service.resolve("etkt:"+"a".repeat(43))).isInstanceOfSatisfying(TicketException.class,e->assertThat(e.status()).isEqualTo(404));
        assertThatThrownBy(()->service.resolve("etkt:123")).isInstanceOfSatisfying(TicketException.class,e->assertThat(e.status()).isEqualTo(400));
    }
    private String decode(String png) throws Exception {
        var image=ImageIO.read(new ByteArrayInputStream(Base64.getDecoder().decode(png)));
        return new MultiFormatReader().decode(new BinaryBitmap(new HybridBinarizer(new BufferedImageLuminanceSource(image)))).getText();
    }
}
