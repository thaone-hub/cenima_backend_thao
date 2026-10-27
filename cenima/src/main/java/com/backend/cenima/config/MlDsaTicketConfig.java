
package com.backend.cenima.config;

import com.backend.cenima.Security.pq.*;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.*;

import java.nio.file.Path;

@Configuration
@Profile("integrated")
@ConditionalOnProperty(
    name = "cinema.mldsa.enabled",
    havingValue = "true"
)
public class MlDsaTicketConfig {

    @Bean
    MlDsaKeyManager mlDsaKeyManager(
        @Value(
            "${cinema.mldsa.key-dir:${user.home}/.cinema/mldsa44}"
        )
        String directory
    ) {
        return new MlDsaKeyManager(
            Path.of(directory)
        );
    }

    @Bean
    MlDsaJwtSigner mlDsaJwtSigner(
        MlDsaKeyManager keys
    ) {
        return new MlDsaJwtSigner(keys);
    }

    @Bean
    MlDsaJwtVerifier mlDsaJwtVerifier(
        MlDsaKeyManager keys
    ) {
        return new MlDsaJwtVerifier(keys);
    }

    @Bean
    MlDsaJwtService mlDsaJwtService(
        MlDsaJwtSigner signer,
        MlDsaJwtVerifier verifier
    ) {
        return new MlDsaJwtService(
            signer,
            verifier
        );
    }
}
