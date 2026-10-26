package com.backend.cenima.Security.auth;

import com.backend.cenima.Security.traditional.KeyManager;
import com.backend.cenima.Security.traditional.Rs256JwtSigner;

import com.nimbusds.jose.JOSEException;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import org.springframework.security.config.annotation.web.builders.HttpSecurity;

import org.springframework.security.config.http.SessionCreationPolicy;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import org.springframework.security.web.SecurityFilterChain;

import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
public class SecurityConfig {


    // =========================
    // JWT CRYPTO BEANS
    // =========================

    @Bean
    public KeyManager keyManager()
            throws JOSEException {

        return new KeyManager();
    }


    @Bean
    public Rs256JwtSigner
    rs256JwtSigner(
            KeyManager keyManager) {

        return new Rs256JwtSigner(
                keyManager
        );
    }


    // =========================
    // PASSWORD
    // =========================

    @Bean
    public PasswordEncoder
    passwordEncoder() {

        return new BCryptPasswordEncoder();
    }


    // =========================
    // JWT FILTER
    // =========================

    @Bean
    public JwtAuthenticationFilter
    jwtAuthenticationFilter(
            Rs256JwtSigner jwtSigner,
            CustomUserDetailsService
                    userDetailsService) {

        return new JwtAuthenticationFilter(
                jwtSigner,
                userDetailsService
        );
    }


    // =========================
    // SPRING SECURITY
    // =========================

    @Bean
    public SecurityFilterChain
    securityFilterChain(
            HttpSecurity http,
            JwtAuthenticationFilter
                    jwtAuthenticationFilter)
            throws Exception {

        http

                // REST API + Bearer JWT
                .csrf(
                        csrf ->
                                csrf.disable()
                )

                // Không dùng session
                .sessionManagement(
                        session ->
                                session
                                        .sessionCreationPolicy(
                                                SessionCreationPolicy
                                                        .STATELESS
                                        )
                )

                // Không dùng form login
                .formLogin(
                        form ->
                                form.disable()
                )

                // Không dùng Basic Auth
                .httpBasic(
                        basic ->
                                basic.disable()
                )

                // Không dùng logout mặc định
                .logout(
                        logout ->
                                logout.disable()
                )

                .authorizeHttpRequests(
                        auth ->
                                auth

                                        // Login / refresh /
                                        // logout public
                                        .requestMatchers(
                                                "/api/auth/**",
                                                "/error"
                                        )
                                        .permitAll()

                                        // API khác cần JWT
                                        .anyRequest()
                                        .authenticated()
                )

                .exceptionHandling(
                        exception ->
                                exception
                                        .authenticationEntryPoint(
                                                (
                                                        request,
                                                        response,
                                                        authException
                                                ) -> {

                                                    response.setStatus(
                                                            HttpServletResponse
                                                                    .SC_UNAUTHORIZED
                                                    );

                                                    response.setContentType(
                                                            "application/json;charset=UTF-8"
                                                    );

                                                    response
                                                            .getWriter()
                                                            .write(
                                                                    "{\"error\":\"Unauthorized\"}"
                                                            );
                                                }
                                        )
                )

                .addFilterBefore(
                        jwtAuthenticationFilter,
                        UsernamePasswordAuthenticationFilter
                                .class
                );

        return http.build();
    }
}