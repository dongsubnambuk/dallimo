package com.dallimo.dallimoserver.share;

import com.dallimo.dallimoserver.TestcontainersConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

import static org.assertj.core.api.Assertions.assertThat;

/** SHR-004 App Link · Universal Link 확인 파일: 로그인 없이, 설정한 앱 id · 공유 페이지 경로만 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "dallimo.share.app-links.ios-app-ids=ABCDE12345.app.dallimo",
        "dallimo.share.app-links.android-package=app.dallimo",
        "dallimo.share.app-links.android-sha256=AA:BB:CC"
})
class AppLinksTest {

    @Autowired
    MockMvcTester mvc;

    @Test
    void servesVerificationFilesWithoutLogin() {
        assertThat(mvc.get().uri("/.well-known/apple-app-site-association")).hasStatusOk().bodyJson()
                .extractingPath("$.applinks.details[0].appIDs[0]").isEqualTo("ABCDE12345.app.dallimo");
        assertThat(mvc.get().uri("/.well-known/apple-app-site-association")).bodyJson()
                .extractingPath("$.applinks.details[0].components[0]['/']").isEqualTo("/s/*");
        assertThat(mvc.get().uri("/.well-known/assetlinks.json")).hasStatusOk().bodyJson()
                .extractingPath("$[0].target.package_name").isEqualTo("app.dallimo");
        assertThat(mvc.get().uri("/.well-known/assetlinks.json")).bodyJson()
                .extractingPath("$[0].target.sha256_cert_fingerprints[0]").isEqualTo("AA:BB:CC");
    }
}
