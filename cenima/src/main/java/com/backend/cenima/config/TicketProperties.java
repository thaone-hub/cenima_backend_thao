package com.backend.cenima.config;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;
import jakarta.validation.constraints.*;
@Validated
@ConfigurationProperties("ticket")
public record TicketProperties(
    @NotBlank String zone,
    @Min(5) @Max(40) int qrMaxVersion,
    @Min(1024) @Max(131072) int maxInputBytes,
    @NotBlank String demoKeyDirectory) {}
