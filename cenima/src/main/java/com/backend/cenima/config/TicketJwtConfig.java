package com.backend.cenima.config;
import java.time.*;
import org.springframework.context.annotation.*;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
@Configuration
@EnableConfigurationProperties(TicketProperties.class)
public class TicketJwtConfig {
    @Bean public Clock ticketClock(TicketProperties p) { return Clock.system(ZoneId.of(p.zone())); }
}
