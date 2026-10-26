package com.backend.cenima.Controller;

import com.backend.cenima.DTO.auth.LoginRequest;
import com.backend.cenima.DTO.auth.LoginResponse;
import com.backend.cenima.DTO.auth.RefreshTokenRequest;

import com.backend.cenima.Service.AuthService;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@org.springframework.context.annotation.Profile("integrated")
public class AuthController {

    private final AuthService authService;


    @PostMapping("/login")
    public ResponseEntity<LoginResponse>
    login(
            @Valid
            @RequestBody
            LoginRequest request) {

        return ResponseEntity.ok(
                authService.login(
                        request
                )
        );
    }


    @PostMapping("/refresh")
    public ResponseEntity<LoginResponse>
    refresh(
            @Valid
            @RequestBody
            RefreshTokenRequest request) {

        return ResponseEntity.ok(
                authService.refresh(
                        request
                )
        );
    }


    @PostMapping("/logout")
    public ResponseEntity<Void>
    logout(
            @Valid
            @RequestBody
            RefreshTokenRequest request) {

        authService.logout(
                request
        );

        return ResponseEntity
                .noContent()
                .build();
    }
}