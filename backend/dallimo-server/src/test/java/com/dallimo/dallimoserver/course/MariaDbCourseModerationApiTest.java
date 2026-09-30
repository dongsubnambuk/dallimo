package com.dallimo.dallimoserver.course;

import com.dallimo.dallimoserver.MariaDbTestcontainersConfiguration;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

@Import(MariaDbTestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class MariaDbCourseModerationApiTest extends CourseModerationApiContractTest {
}
