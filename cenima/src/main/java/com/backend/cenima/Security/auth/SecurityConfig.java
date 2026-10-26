package com.backend.cenima.Security.auth;

import com.backend.cenima.Security.traditional.*;
import java.nio.file.Path;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.*;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@Profile("integrated")
public class SecurityConfig {
    @Bean public KeyManager keyManager(@Value("${traditional.key-directory}") String directory) throws com.nimbusds.jose.JOSEException {
        return new KeyManager(Path.of(directory));
    }
    @Bean public Rs256JwtSigner rs256JwtSigner(KeyManager keys) { return new Rs256JwtSigner(keys); }
    @Bean public Es256JwtSigner es256JwtSigner(KeyManager keys) { return new Es256JwtSigner(keys); }
    @Bean public EdDsaJwtSigner edDsaJwtSigner(KeyManager keys) { return new EdDsaJwtSigner(keys); }
    @Bean public PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }
    @Bean public JwtAuthenticationFilter jwtAuthenticationFilter(Rs256JwtSigner signer,CustomUserDetailsService users) { return new JwtAuthenticationFilter(signer,users); }
    @Bean public FilterRegistrationBean<JwtAuthenticationFilter> filterRegistration(JwtAuthenticationFilter filter) {
        var registration=new FilterRegistrationBean<>(filter);registration.setEnabled(false);return registration;
    }
    @Bean public SecurityFilterChain securityFilterChain(HttpSecurity http,JwtAuthenticationFilter filter) throws Exception {
        return http.csrf(c->c.disable()).sessionManagement(s->s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .formLogin(f->f.disable()).httpBasic(b->b.disable()).logout(l->l.disable())
            .authorizeHttpRequests(a->a.requestMatchers("/api/demo/**").denyAll()
                .requestMatchers("/api/auth/**","/demo/**","/error").permitAll().anyRequest().authenticated())
            .exceptionHandling(e->e.authenticationEntryPoint((request,response,error)->{
                response.setStatus(401);response.setContentType("application/json;charset=UTF-8");
                response.getWriter().write(request.getRequestURI().startsWith(request.getContextPath()+"/api/tickets")
                    ? "{\"code\":\"UNAUTHENTICATED\",\"message\":\"Authentication required\"}" : "{\"error\":\"Unauthorized\"}");
            }).accessDeniedHandler((request,response,error)->{
                response.setStatus(403);response.setContentType("application/json;charset=UTF-8");
                response.getWriter().write("{\"code\":\"FORBIDDEN\",\"message\":\"Access denied\"}");
            }))
            .headers(h->h.contentSecurityPolicy(c->c.policyDirectives("default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'")))
            .addFilterBefore(filter,UsernamePasswordAuthenticationFilter.class).build();
    }
}
