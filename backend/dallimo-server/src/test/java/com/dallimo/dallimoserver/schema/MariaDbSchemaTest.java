package com.dallimo.dallimoserver.schema;

import com.dallimo.dallimoserver.MariaDbTestcontainersConfiguration;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

@Import(MariaDbTestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@ActiveProfiles("test")
class MariaDbSchemaTest extends SchemaContractTest {
}
