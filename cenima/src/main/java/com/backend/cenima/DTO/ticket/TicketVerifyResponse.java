package com.backend.cenima.DTO.ticket;
import java.time.LocalDateTime;
public record TicketVerifyResponse(boolean valid, boolean checkedIn, TicketView ticket, String status, LocalDateTime usedAt) {}
