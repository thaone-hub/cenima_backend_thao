package com.backend.cenima.DTO;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record CreateBookingRequest(
        @NotNull Integer showtimeId,
        @NotEmpty List<Integer> seatIds   // chỉ nhận id ghế, giá do server tính
) {}