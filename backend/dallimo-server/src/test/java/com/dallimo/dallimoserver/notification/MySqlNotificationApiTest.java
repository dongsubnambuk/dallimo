package com.dallimo.dallimoserver.notification;

import com.dallimo.dallimoserver.TestcontainersConfiguration;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

@Import({TestcontainersConfiguration.class, RecordingPushSender.Config.class})
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
// 밤 시간 규칙은 QuietHoursTest에서 본다 (테스트가 밤에 돌아도 Push가 가게)
@TestPropertySource(properties = "dallimo.push.quiet-hours=false")
class MySqlNotificationApiTest extends NotificationApiContractTest {
}
