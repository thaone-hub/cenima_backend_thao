
package com.backend.cenima.Security.auth;

import com.backend.cenima.Security.traditional.*;

import java.nio.file.Path;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.*;

import org.springframework.http.HttpMethod;

import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@Profile("integrated")
public class SecurityConfig {

    // Quan ly khoa JWT truyen thong
    @Bean
    public KeyManager keyManager(
            @Value("${traditional.key-directory}") String directory
    ) throws com.nimbusds.jose.JOSEException {

        return new KeyManager(Path.of(directory));
    }

    // Cac thuat toan JWT hien co
    @Bean
    public Rs256JwtSigner rs256JwtSigner(KeyManager keys) {
        return new Rs256JwtSigner(keys);
    }

    @Bean
    public Es256JwtSigner es256JwtSigner(KeyManager keys) {
        return new Es256JwtSigner(keys);
    }

    @Bean
    public EdDsaJwtSigner edDsaJwtSigner(KeyManager keys) {
        return new EdDsaJwtSigner(keys);
    }

    // Ma hoa mat khau
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    // JWT Authentication Filter
    @Bean
    public JwtAuthenticationFilter jwtAuthenticationFilter(
            Rs256JwtSigner signer,
            CustomUserDetailsService users
    ) {
        return new JwtAuthenticationFilter(signer, users);
    }

    @Bean
    public FilterRegistrationBean<JwtAuthenticationFilter>
            filterRegistration(JwtAuthenticationFilter filter) {

        var registration = new FilterRegistrationBean<>(filter);

        registration.setEnabled(false);

        return registration;
    }

    // Cau hinh Spring Security
    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            JwtAuthenticationFilter filter
    ) throws Exception {

        return http

            .csrf(c -> c.disable())

            .sessionManagement(s ->
                s.sessionCreationPolicy(
                    SessionCreationPolicy.STATELESS
                )
            )

            .formLogin(f -> f.disable())
            .httpBasic(b -> b.disable())
            .logout(l -> l.disable())

            // PHAN QUYEN API VA FRONTEND
            .authorizeHttpRequests(a -> a

                // Chan API demo identity
                .requestMatchers(
                    "/api/demo/**"
                ).denyAll()

                // Cho phep truy cap giao dien
                // va API dang nhap
                .requestMatchers(
                    "/api/auth/**",
                    "/demo/**",
                    "/cinema/**",
                    "/error"
                ).permitAll()

                // Cho phep xem phim va suat chieu
                // khong can dang nhap
                .requestMatchers(
                    HttpMethod.GET,
                    "/api/movies",
                    "/api/movies/**"
                ).permitAll()

                // Cho phep xem so do ghe
                // khong can dang nhap
                .requestMatchers(
                    HttpMethod.GET,
                    "/api/showtimes/*/seats"
                ).permitAll()

                // Cac API con lai phai dang nhap
                .anyRequest().authenticated()
            )

            // XU LY LOI 401 / 403
            .exceptionHandling(e -> e

                .authenticationEntryPoint(
                    (request, response, error) -> {

                        response.setStatus(401);
                        response.setContentType(
                            "application/json;charset=UTF-8"
                        );

                        boolean ticketApi =
                            request.getRequestURI().startsWith(
                                request.getContextPath()
                                    + "/api/tickets"
                            );

                        String body = ticketApi
                            ? "{\"code\":\"UNAUTHENTICATED\","
                              + "\"message\":\"Authentication required\"}"
                            : "{\"error\":\"Unauthorized\"}";

                        response.getWriter().write(body);
                    }
                )

                .accessDeniedHandler(
                    (request, response, error) -> {

                        response.setStatus(403);
                        response.setContentType(
                            "application/json;charset=UTF-8"
                        );

                        response.getWriter().write(
                            "{\"code\":\"FORBIDDEN\","
                            + "\"message\":\"Access denied\"}"
                        );
                    }
                )
            )

            // CONTENT SECURITY POLICY
            .headers(h ->
                h.contentSecurityPolicy(c ->
                    c.policyDirectives(
                        "default-src 'self'; "
                        + "script-src 'self'; "
                        + "style-src 'self'; "
                        + "img-src 'self' data: https:; "
                        + "connect-src 'self'; "
                        + "worker-src 'self' blob:; "
                        + "object-src 'none'; "
                        + "base-uri 'none'; "
                        + "frame-ancestors 'none'"
                    )
                )
            )

            // Giu nguyen JWT Authentication Filter
            .addFilterBefore(
                filter,
                UsernamePasswordAuthenticationFilter.class
            )

            .build();
    }
}
