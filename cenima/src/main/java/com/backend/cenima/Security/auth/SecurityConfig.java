
package com.backend.cenima.Security.auth;

import com.backend.cenima.Security.traditional.*;

import java.nio.file.Path;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

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

    // JWT RS256
    @Bean
    public Rs256JwtSigner rs256JwtSigner(KeyManager keys) {
        return new Rs256JwtSigner(keys);
    }

    // JWT ES256 - tu trang_new
    @Bean
    public Es256JwtSigner es256JwtSigner(KeyManager keys) {
        return new Es256JwtSigner(keys);
    }

    // JWT EdDSA - tu trang_new
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

    // Tranh dang ky JWT Filter hai lan
    @Bean
    public FilterRegistrationBean<JwtAuthenticationFilter>
            filterRegistration(JwtAuthenticationFilter filter) {

        FilterRegistrationBean<JwtAuthenticationFilter> registration =
                new FilterRegistrationBean<>(filter);

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

            // Phan quyen API va frontend
            .authorizeHttpRequests(a -> a

                // Cam API demo identity
                .requestMatchers("/api/demo/**").denyAll()

                // API admin chi danh cho ADMIN
                .requestMatchers("/api/admin/**").hasRole("ADMIN")

                // API authentication cong khai
                .requestMatchers(
                    "/api/auth/login",
                    "/api/auth/register",
                    "/api/auth/refresh",
                    "/api/auth/logout"
                ).permitAll()

                // Frontend public
                .requestMatchers(
                    "/",
                    "/index.html",
                    "/movies.html",
                    "/login.html",
                    "/register.html",
                    "/admin.html",
                    "/check-in.html",
                    "/assets/**",
                    "/demo/**",
                    "/cinema/**",
                    "/error",
                    "/favicon.svg"
                ).permitAll()

                // Xem danh sach phim
                .requestMatchers(
                    HttpMethod.GET,
                    "/api/movies",
                    "/api/movies/**"
                ).permitAll()

                // Xem so do ghe
                .requestMatchers(
                    HttpMethod.GET,
                    "/api/showtimes/*/seats"
                ).permitAll()

                // Cac API con lai yeu cau dang nhap
                .anyRequest().authenticated()
            )

            // Xu ly loi 401 va 403
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

            // Content Security Policy
            .headers(h ->
                h.contentSecurityPolicy(c ->
                    c.policyDirectives(
                        "default-src 'self'; "
                        + "script-src 'self'; "
                        + "style-src 'self'; "
                        + "img-src 'self' data:; "
                        + "connect-src 'self'; "
                        + "worker-src 'self' blob:; "
                        + "object-src 'none'; "
                        + "base-uri 'none'; "
                        + "frame-ancestors 'none'"
                    )
                )
            )

            // JWT Authentication Filter
            .addFilterBefore(
                filter,
                UsernamePasswordAuthenticationFilter.class
            )

            .build();
    }
}
