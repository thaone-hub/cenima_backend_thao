package com.backend.cenima.Security.auth;

import com.backend.cenima.Security.traditional.Rs256JwtSigner;

import com.nimbusds.jwt.JWTClaimsSet;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;

import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

public class JwtAuthenticationFilter
        extends OncePerRequestFilter {

    private static final String ISSUER =
            "cenima-auth";

    private final Rs256JwtSigner jwtSigner;

    private final CustomUserDetailsService
            userDetailsService;

    public JwtAuthenticationFilter(
            Rs256JwtSigner jwtSigner,
            CustomUserDetailsService
                    userDetailsService) {

        this.jwtSigner =
                jwtSigner;

        this.userDetailsService =
                userDetailsService;
    }


    @Override
    protected boolean shouldNotFilter(
            HttpServletRequest request) {

        return request
                .getRequestURI()
                .startsWith(
                        "/api/auth/"
                );
    }


    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain)
            throws ServletException,
            IOException {

        String authorization =
                request.getHeader(
                        "Authorization"
                );

        if (authorization == null
                || !authorization
                .startsWith("Bearer ")) {

            filterChain.doFilter(
                    request,
                    response
            );

            return;
        }

        String token =
                authorization.substring(7);

        try {

            JWTClaimsSet claims =
                    jwtSigner.verify(token);

            // Kiểm tra issuer
            if (!ISSUER.equals(
                    claims.getIssuer())) {

                throw new SecurityException(
                        "Invalid issuer"
                );
            }

            // Chỉ ACCESS token mới được
            // dùng để truy cập API
            if (!"ACCESS".equals(
                    claims.getClaim(
                            "tokenType"
                    ))) {

                throw new SecurityException(
                        "Expected ACCESS token"
                );
            }

            String email =
                    claims.getSubject();

            if (email == null
                    || email.isBlank()) {

                throw new SecurityException(
                        "Missing subject"
                );
            }

            if (SecurityContextHolder
                    .getContext()
                    .getAuthentication()
                    == null) {

                UserDetails userDetails =
                        userDetailsService
                                .loadUserByUsername(
                                        email
                                );

                UsernamePasswordAuthenticationToken
                        authentication =
                        new UsernamePasswordAuthenticationToken(
                                userDetails,
                                null,
                                userDetails
                                        .getAuthorities()
                        );

                authentication.setDetails(
                        new WebAuthenticationDetailsSource()
                                .buildDetails(
                                        request
                                )
                );

                SecurityContextHolder
                        .getContext()
                        .setAuthentication(
                                authentication
                        );
            }

            filterChain.doFilter(
                    request,
                    response
            );

        } catch (Exception e) {

            SecurityContextHolder
                    .clearContext();

            response.setStatus(
                    HttpServletResponse
                            .SC_UNAUTHORIZED
            );

            response.setContentType(
                    "application/json;charset=UTF-8"
            );

            response.getWriter().write(
                    "{\"error\":\"Invalid or expired access token\"}"
            );
        }
    }
}