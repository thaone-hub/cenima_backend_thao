package com.backend.cenima.Security.demo;
import org.springframework.context.annotation.*;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
@Configuration
@Profile("demo & !integrated")
public class DemoSecurityConfig {
    @Bean SecurityFilterChain demoSecurity(HttpSecurity http) throws Exception {
        // Demo identity is checked by services against the database. No access-token login is simulated.
        return http.csrf(c -> c.disable()).sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(a -> a.requestMatchers("/api/**", "/demo/**", "/error").permitAll().anyRequest().denyAll())
            .headers(h -> h.contentSecurityPolicy(c -> c.policyDirectives("default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'")))
            .build();
    }
}
