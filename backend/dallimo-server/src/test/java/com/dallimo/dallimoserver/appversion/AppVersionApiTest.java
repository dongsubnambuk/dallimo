package com.dallimo.dallimoserver.appversion;

import com.dallimo.dallimoserver.TestcontainersConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

import static org.assertj.core.api.Assertions.assertThat;

/** 강제 업데이트: 로그인 없이 플랫폼별 최소 버전 · 스토어 주소. 설정이 없으면 null(막지 않음) (결정 로그 79항) */
@Import(TestcontainersConfiguration.class)
@SpringBootTest(properties = {"dallimo.app-version.ios.min-version=1.2.0", "dallimo.app-version.ios.store-url=https://apps.apple.com/app/id123"})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AppVersionApiTest {

    @Autowired
    MockMvcTester mvc;

    @Test
    void iosMinVersionWithoutLogin() {
        assertThat(mvc.get().uri("/api/v1/app/version").queryParam("platform", "ios").exchange()).hasStatusOk()
                .bodyJson().extractingPath("$.data").isEqualTo(java.util.Map.of("platform", "ios", "minVersion", "1.2.0", "storeUrl", "https://apps.apple.com/app/id123"));
        // platform을 빼면 ios
        assertThat(mvc.get().uri("/api/v1/app/version").exchange()).hasStatusOk().bodyJson().extractingPath("$.data.minVersion").isEqualTo("1.2.0");
    }

    @Test
    void notConfiguredMeansNoForcedUpdate() {
        assertThat(mvc.get().uri("/api/v1/app/version").queryParam("platform", "android").exchange()).hasStatusOk()
                .bodyJson().extractingPath("$.data.minVersion").isNull();
    }

    @Test
    void unknownPlatformIsRejected() {
        assertThat(mvc.get().uri("/api/v1/app/version").queryParam("platform", "windows").exchange()).hasStatus(400);
    }
}
