package com.backend.cenima.DTO;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record ShowtimeResponse(
        Integer id,
        Integer movieId,
        Integer roomId,
        String roomName,
        LocalDateTime startTime,
        BigDecimal price
) {}