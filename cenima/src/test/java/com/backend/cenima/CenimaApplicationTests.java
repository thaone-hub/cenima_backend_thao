package com.backend.cenima;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
@org.springframework.test.context.ActiveProfiles("demo")
@org.springframework.test.context.TestPropertySource(properties = {
    "spring.datasource.url=${TEST_DB_URL}", "spring.datasource.username=${TEST_DB_USERNAME}",
    "spring.datasource.password=${TEST_DB_PASSWORD}"})
@org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable(named = "TEST_DB_URL", matches = ".*databaseName=CINEMA_THAO_ETICKET_TEST(?:;.*)?")
class CenimaApplicationTests {

	@Test
	void contextLoads() {
	}

}
