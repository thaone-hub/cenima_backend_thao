package com.backend.cenima.DTO.ticket;
import java.time.Instant;
public record TicketTokenResponse(TicketView ticket, String token, String algorithm, Instant issuedAt, Instant expiresAt, QrResponse qr) {}
