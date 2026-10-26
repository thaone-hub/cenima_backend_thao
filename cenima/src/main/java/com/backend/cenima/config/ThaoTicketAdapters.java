package com.backend.cenima.config;
import com.backend.cenima.Security.adapter.ThaoTicketJwtAdapter;
import com.backend.cenima.Security.traditional.*;
import org.springframework.context.annotation.*;
@Configuration
@Profile("integrated")
public class ThaoTicketAdapters {
    @Bean ThaoTicketJwtAdapter rs256Tickets(Rs256JwtSigner provider) { return new ThaoTicketJwtAdapter("RS256",provider::sign,provider); }
    @Bean ThaoTicketJwtAdapter es256Tickets(Es256JwtSigner provider) { return new ThaoTicketJwtAdapter("ES256",provider::sign,provider); }
    @Bean ThaoTicketJwtAdapter edDsaTickets(EdDsaJwtSigner provider) { return new ThaoTicketJwtAdapter("EdDSA",provider::sign,provider); }
}
