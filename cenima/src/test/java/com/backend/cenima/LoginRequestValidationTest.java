package com.backend.cenima;

import com.backend.cenima.DTO.auth.LoginRequest;
import jakarta.validation.Validation;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class LoginRequestValidationTest {
    @Test
    void acceptsLoginNamesAndEmailsButRejectsBlankOrOversizedAccounts() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var validator = factory.getValidator();
            var request = new LoginRequest();
            request.setPassword("test-password");
            for (String account : new String[]{"admin123@", "customer@cinema.test"}) {
                request.setEmail(account);
                assertThat(validator.validate(request)).isEmpty();
            }
            for (String account : new String[]{" ", "a".repeat(101)}) {
                request.setEmail(account);
                assertThat(validator.validate(request)).isNotEmpty();
            }
        }
    }
}
