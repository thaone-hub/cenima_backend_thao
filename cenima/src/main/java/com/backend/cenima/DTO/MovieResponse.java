package com.backend.cenima.DTO;

import java.time.LocalDate;

public record MovieResponse(
        Integer id,
        String title,
        String description,
        Integer duration,
        LocalDate releaseDate,
        String director,
        String posterUrl,
        Integer status
) {}