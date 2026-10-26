package com.backend.cenima;
import com.backend.cenima.Repository.*;
import com.backend.cenima.Service.QrCodeService;
import com.backend.cenima.config.TicketProperties;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;
import java.time.Clock;
import static org.assertj.core.api.Assertions.*;
@org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable(named="TEST_DB_URL",matches=".*databaseName=CINEMA_THAO_ETICKET_TEST(?:;.*)?")
class QrSqlServerTest extends SqlServerTestSupport {
    @Autowired TicketRepository tickets;
    @Autowired TicketQrReferenceRepository references;
    @Autowired QrCodeService qr;
    @Autowired TicketProperties properties;
    @Autowired Clock clock;
    @Test @Transactional void persistsLongUnicodeTokenAndResolvesAfterServiceReload() {
        var ticket=tickets.findAll().getFirst();
        String token="long-test-token-"+"a".repeat(8000);
        var response=qr.create(token,ticket,clock.instant().plusSeconds(3600).getEpochSecond());
        references.flush();
        assertThat(response.mode()).isEqualTo("REFERENCE");
        assertThat(new QrCodeService(references,properties,clock).resolve(response.content())).isEqualTo(token);
        assertThat(references.findById(QrCodeService.hash(response.content())).orElseThrow().getTicket().getId()).isEqualTo(ticket.getId());
    }
}
