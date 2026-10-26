package com.backend.cenima.config;
import com.backend.cenima.Security.adapter.JwtProviderRegistry;
import org.springframework.context.annotation.*;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.security.web.SecurityFilterChain;
import java.util.List;
@Configuration
@Profile("integrated")
public class IntegratedTicketRequirements {
    @Bean InitializingBean requireIntegratedProviders(JwtProviderRegistry registry, List<SecurityFilterChain> chains) {
        return () -> {
            if (registry.algorithms().stream().noneMatch(JwtProviderRegistry.Availability::available))
                throw new IllegalStateException("Integrated profile requires actual JwtSigner/JwtVerifier adapters");
            if (chains.isEmpty()) throw new IllegalStateException("Integrated profile requires Thao's SecurityFilterChain");
        };
    }
}
