package com.backend.cenima.DTO;

public record SeatStatusResponse(
        Integer seatId,
        String rowName,
        Integer seatNumber,
        String seatType,
        String status   // AVAILABLE | BOOKED
) {}