package com.backend.cenima.DTO.ticket;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
public record TicketTokenRequest(@NotBlank @Size(max=32) String algorithm) {}
