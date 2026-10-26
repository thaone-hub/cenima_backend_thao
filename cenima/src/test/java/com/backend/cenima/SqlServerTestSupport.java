package com.backend.cenima;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.*;
@SpringBootTest
@ActiveProfiles("demo")
@EnabledIfEnvironmentVariable(named="TEST_DB_URL",matches=".*databaseName=CINEMA_THAO_ETICKET_TEST(?:;.*)?")
abstract class SqlServerTestSupport {
    @DynamicPropertySource static void database(DynamicPropertyRegistry r) {
        r.add("spring.datasource.url",()->System.getenv("TEST_DB_URL"));
        r.add("spring.datasource.username",()->System.getenv("TEST_DB_USERNAME"));
        r.add("spring.datasource.password",()->System.getenv("TEST_DB_PASSWORD"));
    }
}
