package com.backend.cenima.Service;

import com.backend.cenima.DTO.auth.LoginRequest;
import com.backend.cenima.DTO.auth.LoginResponse;
import com.backend.cenima.DTO.auth.RefreshTokenRequest;

import com.backend.cenima.Entity.RefreshToken;
import com.backend.cenima.Entity.User;

import com.backend.cenima.Repository.RefreshTokenRepository;
import com.backend.cenima.Repository.UserRepository;

import com.backend.cenima.Security.traditional.Rs256JwtSigner;

import com.nimbusds.jwt.JWTClaimsSet;

import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Date;

@Service
@RequiredArgsConstructor
@Transactional
public class AuthService {

    private static final String ISSUER =
            "cenima-auth";

    // Access token sống 15 phút
    private static final long ACCESS_TOKEN_SECONDS =
            15 * 60;

    // Refresh token sống 7 ngày
    private static final long REFRESH_TOKEN_SECONDS =
            7 * 24 * 60 * 60;

    private final UserRepository userRepository;

    private final RefreshTokenRepository
            refreshTokenRepository;

    private final PasswordEncoder passwordEncoder;

    private final Rs256JwtSigner jwtSigner;


    // =========================
    // LOGIN
    // =========================

    public LoginResponse login(
            LoginRequest request) {

        User user = userRepository
                .findByEmail(request.getEmail())
                .orElseThrow(
                        () -> unauthorized(
                                "Email or password is incorrect"
                        )
                );

        if (!Boolean.TRUE.equals(
                user.getIsActive())) {

            throw unauthorized(
                    "Account is disabled"
            );
        }

        boolean passwordCorrect =
                passwordEncoder.matches(
                        request.getPassword(),
                        user.getPasswordHash()
                );

        if (!passwordCorrect) {

            throw unauthorized(
                    "Email or password is incorrect"
            );
        }

        Instant now = Instant.now();

        Instant accessExpiration =
                now.plusSeconds(
                        ACCESS_TOKEN_SECONDS
                );

        Instant refreshExpiration =
                now.plusSeconds(
                        REFRESH_TOKEN_SECONDS
                );

        String accessToken =
                createToken(
                        user,
                        "ACCESS",
                        now,
                        accessExpiration
                );

        String refreshToken =
                createToken(
                        user,
                        "REFRESH",
                        now,
                        refreshExpiration
                );

        // Lưu refresh token vào DB
        RefreshToken savedToken =
                new RefreshToken();

        savedToken.setUser(user);

        savedToken.setToken(
                refreshToken
        );

        savedToken.setExpiresAt(
                LocalDateTime.ofInstant(
                        refreshExpiration,
                        ZoneOffset.UTC
                )
        );

        savedToken.setIsRevoked(false);

        refreshTokenRepository.save(
                savedToken
        );

        return new LoginResponse(
                accessToken,
                refreshToken,
                "Bearer",
                ACCESS_TOKEN_SECONDS
        );
    }


    // =========================
    // REFRESH TOKEN
    // =========================

    public LoginResponse refresh(
            RefreshTokenRequest request) {

        String token =
                request.getRefreshToken();

        JWTClaimsSet claims =
                verifyAuthToken(
                        token,
                        "REFRESH"
                );

        RefreshToken storedToken =
                refreshTokenRepository
                        .findByToken(token)
                        .orElseThrow(
                                () -> unauthorized(
                                        "Refresh token not found"
                                )
                        );

        if (Boolean.TRUE.equals(
                storedToken.getIsRevoked())) {

            throw unauthorized(
                    "Refresh token has been revoked"
            );
        }

        LocalDateTime nowUtc =
                LocalDateTime.now(
                        ZoneOffset.UTC
                );

        if (storedToken
                .getExpiresAt()
                .isBefore(nowUtc)) {

            throw unauthorized(
                    "Refresh token expired"
            );
        }

        User user =
                storedToken.getUser();

        if (!Boolean.TRUE.equals(
                user.getIsActive())) {

            throw unauthorized(
                    "Account is disabled"
            );
        }

        // Token trong DB phải đúng user
        if (!user.getEmail()
                .equals(
                        claims.getSubject()
                )) {

            throw unauthorized(
                    "Invalid refresh token"
            );
        }

        Instant now = Instant.now();

        Instant accessExpiration =
                now.plusSeconds(
                        ACCESS_TOKEN_SECONDS
                );

        String newAccessToken =
                createToken(
                        user,
                        "ACCESS",
                        now,
                        accessExpiration
                );

        // Refresh token cũ vẫn được sử dụng
        // cho đến khi hết hạn hoặc logout
        return new LoginResponse(
                newAccessToken,
                token,
                "Bearer",
                ACCESS_TOKEN_SECONDS
        );
    }


    // =========================
    // LOGOUT
    // =========================

    public void logout(
            RefreshTokenRequest request) {

        refreshTokenRepository
                .findByToken(
                        request.getRefreshToken()
                )
                .ifPresent(
                        token -> {

                            token.setIsRevoked(true);

                            refreshTokenRepository
                                    .save(token);
                        }
                );
    }


    // =========================
    // CREATE JWT
    // =========================

    private String createToken(
            User user,
            String tokenType,
            Instant issuedAt,
            Instant expiration) {

        JWTClaimsSet claims =
                new JWTClaimsSet.Builder()

                        .issuer(ISSUER)

                        // sub = email
                        .subject(
                                user.getEmail()
                        )

                        .claim(
                                "userId",
                                user.getId()
                        )

                        .claim(
                                "role",
                                user.getRole()
                                        .getRoleName()
                        )

                        // phân biệt ACCESS / REFRESH
                        .claim(
                                "tokenType",
                                tokenType
                        )

                        .issueTime(
                                Date.from(
                                        issuedAt
                                )
                        )

                        .expirationTime(
                                Date.from(
                                        expiration
                                )
                        )

                        .build();

        try {

            return jwtSigner.sign(
                    claims
            );

        } catch (Exception e) {

            throw new IllegalStateException(
                    "Cannot sign JWT",
                    e
            );
        }
    }


    // =========================
    // VERIFY AUTH JWT
    // =========================

    private JWTClaimsSet verifyAuthToken(
            String token,
            String expectedType) {

        try {

            JWTClaimsSet claims =
                    jwtSigner.verify(token);

            if (!ISSUER.equals(
                    claims.getIssuer())) {

                throw new SecurityException(
                        "Invalid issuer"
                );
            }

            if (!expectedType.equals(
                    claims.getClaim(
                            "tokenType"
                    ))) {

                throw new SecurityException(
                        "Invalid token type"
                );
            }

            if (claims.getSubject() == null
                    || claims.getSubject()
                    .isBlank()) {

                throw new SecurityException(
                        "Missing subject"
                );
            }

            return claims;

        } catch (Exception e) {

            throw unauthorized(
                    "Invalid or expired token"
            );
        }
    }


    private ResponseStatusException
    unauthorized(String message) {

        return new ResponseStatusException(
                HttpStatus.UNAUTHORIZED,
                message
        );
    }
}