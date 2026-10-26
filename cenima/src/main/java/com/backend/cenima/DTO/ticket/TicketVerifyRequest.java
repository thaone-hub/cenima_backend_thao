package com.backend.cenima.DTO.ticket;
import jakarta.validation.constraints.NotBlank;
public record TicketVerifyRequest(@NotBlank String value) {}
