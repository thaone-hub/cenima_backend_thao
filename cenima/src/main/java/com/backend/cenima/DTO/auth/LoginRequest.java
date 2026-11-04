package com.backend.cenima.DTO.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class LoginRequest {

    @NotBlank(message = "Login account is required")
    @Size(max = 100, message = "Login account must not exceed 100 characters")
    private String email;

    @NotBlank(message = "Password is required")
    private String password;
}
