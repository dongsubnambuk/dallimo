package com.dallimo.dallimoserver.common.openapi;

import com.dallimo.dallimoserver.TestcontainersConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 명세 57장 API Contract: 저장소의 docs/api/openapi.yaml이 지금 서버 코드와 같아야 한다.
 * API를 바꾸면 이 테스트가 실패한다. 문서 다시 만들기: ./gradlew test --tests '*OpenApiContractTest' -Dopenapi.update=true
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class OpenApiContractTest {

    static final Path FILE = Path.of(System.getProperty("user.dir")).resolve("../../docs/api/openapi.yaml").normalize();

    @Autowired
    MockMvcTester mvc;

    @Test
    void committedContractMatchesServer() throws IOException {
        MvcTestResult r = mvc.get().uri("/v3/api-docs.yaml").exchange();
        assertThat(r).hasStatusOk();
        String generated = normalize(r.getResponse().getContentAsString(StandardCharsets.UTF_8));
        if (Boolean.getBoolean("openapi.update")) {
            Files.createDirectories(FILE.getParent());
            Files.writeString(FILE, generated, StandardCharsets.UTF_8);
            return;
        }
        assertThat(Files.exists(FILE)).as("docs/api/openapi.yaml이 없어요. -Dopenapi.update=true로 만들어 주세요").isTrue();
        assertThat(normalize(Files.readString(FILE, StandardCharsets.UTF_8)))
                .as("API가 바뀌었는데 docs/api/openapi.yaml이 그대로예요. -Dopenapi.update=true로 다시 만들어 주세요")
                .isEqualTo(generated);
    }

    @Test
    void securityMatchesSecurityConfig() throws IOException {
        String doc = mvc.get().uri("/v3/api-docs").exchange().getResponse().getContentAsString(StandardCharsets.UTF_8);
        // 공개 · Bearer · 관리 키가 SecurityConfig와 같게 적힌다
        assertThat(com.jayway.jsonpath.JsonPath.<java.util.List<Object>>read(doc, "$.paths['/api/v1/auth/login'].post.security")).hasSize(2);
        assertThat(com.jayway.jsonpath.JsonPath.<java.util.List<Object>>read(doc, "$.paths['/api/v1/courses/nearby'].get.security")).hasSize(2);
        assertThat(com.jayway.jsonpath.JsonPath.<java.util.List<Object>>read(doc, "$.paths['/api/v1/runs'].post.security")).hasSize(1);
        assertThat(com.jayway.jsonpath.JsonPath.<java.util.List<Object>>read(doc, "$.paths['/api/v1/runs'].post.security[0].bearerAuth")).isEmpty();
        assertThat(doc).contains("\"adminKey\"");
        assertThat(com.jayway.jsonpath.JsonPath.<java.util.List<String>>read(doc, "$.paths['/api/v1/admin/courses/reported'].get.security[*].adminKey")).hasSize(1);
        // 모든 API가 명세 장 이름으로 묶인다 (새 컨트롤러는 OpenApiConfig.TAGS에 넣는다)
        assertThat(com.jayway.jsonpath.JsonPath.<java.util.List<String>>read(doc, "$.paths.*.*.tags[*]")).noneMatch(t -> t.endsWith("-controller"));
        // 공유 페이지 · actuator는 API 문서에 넣지 않는다
        assertThat(doc).doesNotContain("\"/s/{code}\"").doesNotContain("/actuator");
    }

    private static String normalize(String s) {
        return s.replace("\r\n", "\n").lines().map(String::stripTrailing).reduce((a, b) -> a + "\n" + b).orElse("") + "\n";
    }
}
