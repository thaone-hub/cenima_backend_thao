package com.backend.cenima;

import com.backend.cenima.Security.adapter.JwtProviderRegistry;
import com.backend.cenima.Security.pq.*;
import com.backend.cenima.Service.TicketException;
import com.backend.cenima.config.MlDsaTicketConfig;
import java.nio.file.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import static org.assertj.core.api.Assertions.*;

class MlDsaProfileTest {
    @TempDir Path directory;
    ApplicationContextRunner runner() {
        return new ApplicationContextRunner()
            .withPropertyValues("cinema.mldsa.key-dir="+directory)
            .withUserConfiguration(MlDsaTicketConfig.class, JwtProviderRegistry.class);
    }
    @Test void integratedEnablesMlDsaByDefault() {
        runner().withPropertyValues("spring.profiles.active=integrated").run(ctx -> {
            assertThat(ctx).hasNotFailed().hasSingleBean(MlDsaJwtSigner.class).hasSingleBean(MlDsaJwtVerifier.class);
            assertThatCode(() -> ctx.getBean(JwtProviderRegistry.class).requireAvailable("ML-DSA-44"))
                .doesNotThrowAnyException();
        });
    }
    @Test void explicitlyDisabledOrDemoProfileDoesNotCreateKeysOrAdvertiseAvailability() {
        for (String[] properties : new String[][]{
                {"spring.profiles.active=integrated", "cinema.mldsa.enabled=false"},
                {"spring.profiles.active=demo", "cinema.mldsa.enabled=true"}}) {
            runner().withPropertyValues(properties).run(ctx -> {
                assertThat(ctx).hasNotFailed().doesNotHaveBean(MlDsaKeyManager.class);
                assertThatThrownBy(() -> ctx.getBean(JwtProviderRegistry.class).requireAvailable("ML-DSA-44"))
                    .isInstanceOfSatisfying(TicketException.class, e -> assertThat(e.status()).isEqualTo(503));
            });
        }
        assertThat(Files.exists(directory.resolve("private.pk8"))).isFalse();
    }
}
