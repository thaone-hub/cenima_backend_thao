package com.backend.cenima.DTO.auth;

import jakarta.validation.constraints.*;

public record RegisterRequest(
    @NotBlank @Size(max = 100) String fullName,
    @NotBlank @Email @Size(max = 100) String email,
    @NotBlank @Size(min = 8, max = 72) String password,
    @Pattern(regexp = "[0-9+() .-]{0,15}") String phoneNumber
) {}
