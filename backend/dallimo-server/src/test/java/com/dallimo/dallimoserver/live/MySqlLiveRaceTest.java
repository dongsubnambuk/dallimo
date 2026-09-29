package com.dallimo.dallimoserver.live;

import com.dallimo.dallimoserver.TestcontainersConfiguration;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "dallimo.live.presence-timeout=2s", "dallimo.live.race-grace=3s", "dallimo.live.time-grace=1s", "dallimo.live.sweep-interval=500ms"})
class MySqlLiveRaceTest extends LiveRaceContractTest {
}
