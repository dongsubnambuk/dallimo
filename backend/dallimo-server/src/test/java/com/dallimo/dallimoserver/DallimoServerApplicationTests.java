package com.dallimo.dallimoserver;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

import static org.assertj.core.api.Assertions.assertThat;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DallimoServerApplicationTests {

    @Autowired
    MockMvcTester mvc;

    @Test
    void contextLoads() {
    }

    @Test
    void healthIsUp() {
        assertThat(mvc.get().uri("/actuator/health"))
                .hasStatusOk()
                .bodyJson().extractingPath("$.status").isEqualTo("UP");
    }

    @Test
    void unknownPathUsesErrorEnvelope() {
        assertThat(mvc.get().uri("/api/v1/nothing-here"))
                .hasStatus(404)
                .bodyJson().extractingPath("$.error.code").isEqualTo("RESOURCE_NOT_FOUND");
    }
}
