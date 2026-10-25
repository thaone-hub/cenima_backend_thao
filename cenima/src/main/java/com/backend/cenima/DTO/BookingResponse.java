package com.backend.cenima.DTO;

import java.math.BigDecimal;
import java.util.List;

public record BookingResponse(
        Integer id,
        Integer showtimeId,
        String status,
        BigDecimal totalPrice,
        List<TicketInfo> tickets
) {
    public record TicketInfo(
            Integer ticketId,
            String ticketCode,
            String seat,        // ví dụ "A1"
            BigDecimal price,
            String status       // UNUSED | USED | CANCELLED
    ) {}
}