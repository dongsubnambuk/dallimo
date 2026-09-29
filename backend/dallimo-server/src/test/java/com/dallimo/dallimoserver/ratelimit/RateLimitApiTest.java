package com.dallimo.dallimoserver.ratelimit;

import com.dallimo.dallimoserver.TestcontainersConfiguration;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 27장 RATE_LIMITED (429): 로그인 · 가입은 IP마다, 검색 · 친구 요청은 사람마다, 공유 링크 해석은 IP마다.
 * 제한 계산은 DB와 상관없어 MySQL에서만 돌린다. 값은 작게 줄였다.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "dallimo.rate-limit.enabled=true",
        "dallimo.rate-limit.login=5",
        "dallimo.rate-limit.search=2",
        "dallimo.rate-limit.share-resolve=2",
        // 다른 테스트 클래스와 키가 겹쳐도 이 창 안에서만 센다
        "dallimo.rate-limit.window=30s"
})
class RateLimitApiTest {

    @Autowired
    MockMvcTester mvc;

    @Test
    void limitsLoginSearchAndShareResolve() {
        // 가입 둘 + 틀린 로그인 셋 = 5번까지는 된다. 여섯 번째는 429 + Retry-After (같은 IP)
        String a = signup(), b = signup();
        for (int i = 0; i < 3; i++) assertThat(login("wrong")).hasStatus(401);
        MvcTestResult blocked = login("wrong");
        assertThat(blocked).hasStatus(429);
        assertThat(blocked.getResponse().getHeader("Retry-After")).isEqualTo("30");
        assertThat((String) JsonPath.read(body(blocked), "$.error.code")).isEqualTo("RATE_LIMITED");

        // 검색은 사람마다 두 번
        assertThat(get(a, "/api/v1/users/search?q=zz")).hasStatusOk();
        assertThat(get(a, "/api/v1/courses/search?query=zz")).hasStatusOk();
        assertThat(get(a, "/api/v1/users/search?q=zz")).hasStatus(429);
        assertThat(get(b, "/api/v1/users/search?q=zz")).hasStatusOk();

        // 공유 링크 해석은 IP마다 두 번 (없는 코드도 센다: 코드 추측 방지)
        assertThat(get(null, "/api/v1/shares/nothere01")).hasStatus(404);
        assertThat(get(null, "/s/nothere02").getResponse().getStatus()).isEqualTo(404);
        assertThat(get(null, "/api/v1/shares/nothere03")).hasStatus(429);
        // 제한 없는 경로는 그대로
        assertThat(get(a, "/api/v1/users/me")).hasStatusOk();
    }

    private String signup() {
        String id = UUID.randomUUID().toString().substring(0, 8);
        MvcTestResult r = mvc.post().uri("/api/v1/auth/signup").contentType(MediaType.APPLICATION_JSON).content("""
                {"email":"limit-%s@dallimo.test","password":"run12345","nickname":"제한%s","deviceId":"d"}""".formatted(id, id)).exchange();
        assertThat(r).hasStatus(201);
        return JsonPath.read(body(r), "$.data.accessToken");
    }

    private MvcTestResult login(String password) {
        return mvc.post().uri("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"nobody@dallimo.test\",\"password\":\"%s\",\"deviceId\":\"d\"}".formatted(password)).exchange();
    }

    private MvcTestResult get(String token, String uri) {
        var req = mvc.get().uri(uri);
        if (token != null) req = req.header("Authorization", "Bearer " + token);
        return req.exchange();
    }

    private static String body(MvcTestResult r) {
        try {
            return r.getResponse().getContentAsString(StandardCharsets.UTF_8);
        } catch (java.io.UnsupportedEncodingException e) {
            throw new IllegalStateException(e);
        }
    }
}
