package com.dallimo.dallimoserver.auth;

import com.dallimo.dallimoserver.MutableClock;
import com.dallimo.dallimoserver.TestcontainersConfiguration;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

import java.time.Duration;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** 이메일 가입 · 로그인 · 세션(14.1장) */
@Import({TestcontainersConfiguration.class, AuthFlowTest.ClockConfig.class})
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthFlowTest {

    @TestConfiguration(proxyBeanMethods = false)
    static class ClockConfig {
        @Bean
        @Primary
        MutableClock testClock() {
            return new MutableClock();
        }
    }

    @Autowired
    MockMvcTester mvc;

    @Autowired
    MutableClock clock;

    record Tokens(String access, String refresh) {
    }

    // ── 가입 · 로그인 ──

    @Test
    void signupLogsInAndMeReturnsProfile() {
        String email = email();
        MvcTestResult r = post("/api/v1/auth/signup", signupBody(email, "run12345", nick(), "dev-a"));
        assertThat(r).hasStatus(201);
        assertThat(r).bodyJson().extractingPath("$.data.user.email").isEqualTo(email);
        assertThat(r).bodyJson().extractingPath("$.data.user.friendCode").asString().startsWith("RUN-");
        Tokens t = tokens(r);
        assertThat(t.refresh()).contains(".");

        assertThat(get("/api/v1/users/me", t.access())).hasStatusOk()
                .bodyJson().extractingPath("$.data.email").isEqualTo(email);
    }

    @Test
    void emailIsNormalizedAndUnique() {
        String email = email();
        assertThat(post("/api/v1/auth/signup", signupBody(email, "run12345", nick(), "dev-a"))).hasStatus(201);
        assertThat(post("/api/v1/auth/signup", signupBody("  " + email.toUpperCase() + " ", "run12345", nick(), "dev-a")))
                .hasStatus(409).bodyJson().extractingPath("$.error.code").isEqualTo("EMAIL_ALREADY_EXISTS");
        // 대소문자를 바꿔도 같은 계정으로 로그인
        assertThat(post("/api/v1/auth/login", loginBody(email.toUpperCase(), "run12345", "dev-b"))).hasStatusOk();
    }

    @Test
    void nicknameIsUnique() {
        String n = nick();
        assertThat(post("/api/v1/auth/signup", signupBody(email(), "run12345", n, "dev-a"))).hasStatus(201);
        assertThat(post("/api/v1/auth/signup", signupBody(email(), "run12345", " " + n + " ", "dev-a")))
                .hasStatus(409).bodyJson().extractingPath("$.error.code").isEqualTo("NICKNAME_ALREADY_EXISTS");
    }

    @Test
    void passwordRule() {
        for (String weak : new String[]{"short1", "onlyletters", "12345678", "has space1"}) {
            MvcTestResult r = post("/api/v1/auth/signup", signupBody(email(), weak, nick(), "dev-a"));
            assertThat(r).hasStatus(400);
            assertThat(r).bodyJson().extractingPath("$.error.details[0].field").isEqualTo("password");
        }
    }

    @Test
    void wrongPasswordAndUnknownEmailLookTheSame() {
        String email = email();
        post("/api/v1/auth/signup", signupBody(email, "run12345", nick(), "dev-a"));
        MvcTestResult wrong = post("/api/v1/auth/login", loginBody(email, "run99999", "dev-a"));
        MvcTestResult unknown = post("/api/v1/auth/login", loginBody(email(), "run12345", "dev-a"));
        assertThat(wrong).hasStatus(401).bodyJson().extractingPath("$.error.code").isEqualTo("INVALID_CREDENTIALS");
        assertThat(unknown).hasStatus(401).bodyJson().extractingPath("$.error.code").isEqualTo("INVALID_CREDENTIALS");
        assertThat(JsonPath.<String>read(body(wrong), "$.error.message")).isEqualTo(JsonPath.read(body(unknown), "$.error.message"));
    }

    @Test
    void passwordIsNotStoredOrReturned() {
        MvcTestResult r = post("/api/v1/auth/signup", signupBody(email(), "run12345", nick(), "dev-a"));
        assertThat(body(r)).doesNotContain("run12345").doesNotContain("password");
    }

    // ── 토큰 ──

    @Test
    void missingOrForgedTokenIsRejected() {
        assertThat(mvc.get().uri("/api/v1/users/me")).hasStatus(401).bodyJson().extractingPath("$.error.code").isEqualTo("AUTH_REQUIRED");
        assertThat(get("/api/v1/users/me", "not-a-jwt")).hasStatus(401).bodyJson().extractingPath("$.error.code").isEqualTo("AUTH_REQUIRED");
        // 서명을 바꾼 토큰
        Tokens t = signup("dev-a");
        String forged = t.access().substring(0, t.access().lastIndexOf('.') + 1) + "AAAA";
        assertThat(get("/api/v1/users/me", forged)).hasStatus(401);
    }

    @Test
    void expiredAccessTokenSaysTokenExpiredThenRefreshWorks() {
        Tokens t = signup("dev-a");
        clock.advance(Duration.ofMinutes(31));
        assertThat(get("/api/v1/users/me", t.access())).hasStatus(401)
                .bodyJson().extractingPath("$.error.code").isEqualTo("TOKEN_EXPIRED");
        Tokens next = tokens(post("/api/v1/auth/refresh", refreshBody(t.refresh(), "dev-a")));
        assertThat(get("/api/v1/users/me", next.access())).hasStatusOk();
    }

    @Test
    void unknownPathWithLoginIs404() {
        Tokens t = signup("dev-a");
        assertThat(get("/api/v1/nothing-here", t.access())).hasStatus(404)
                .bodyJson().extractingPath("$.error.code").isEqualTo("RESOURCE_NOT_FOUND");
    }

    // ── 세션 ──

    @Test
    void refreshRotatesToken() {
        Tokens t = signup("dev-a");
        Tokens next = tokens(post("/api/v1/auth/refresh", refreshBody(t.refresh(), "dev-a")));
        assertThat(next.refresh()).isNotEqualTo(t.refresh());
        // 새 토큰은 계속 쓸 수 있다
        assertThat(post("/api/v1/auth/refresh", refreshBody(next.refresh(), "dev-a"))).hasStatusOk();
    }

    @Test
    void retryWithPreviousTokenWithinGraceIsAccepted() {
        // 응답을 못 받고 같은 토큰으로 다시 보낸 경우
        Tokens t = signup("dev-a");
        assertThat(post("/api/v1/auth/refresh", refreshBody(t.refresh(), "dev-a"))).hasStatusOk();
        clock.advance(Duration.ofSeconds(10));
        Tokens retried = tokens(post("/api/v1/auth/refresh", refreshBody(t.refresh(), "dev-a")));
        assertThat(get("/api/v1/users/me", retried.access())).hasStatusOk();
    }

    @Test
    void reusedOldRefreshTokenRevokesSession() {
        Tokens t = signup("dev-a");
        Tokens next = tokens(post("/api/v1/auth/refresh", refreshBody(t.refresh(), "dev-a")));
        clock.advance(Duration.ofSeconds(61));
        // 이미 바뀐 옛 토큰: 탈취로 보고 세션을 끊는다
        assertThat(post("/api/v1/auth/refresh", refreshBody(t.refresh(), "dev-a"))).hasStatus(401)
                .bodyJson().extractingPath("$.error.code").isEqualTo("AUTH_REQUIRED");
        // 정상 사용자의 최신 토큰과 Access Token도 막힌다
        assertThat(post("/api/v1/auth/refresh", refreshBody(next.refresh(), "dev-a"))).hasStatus(401);
        assertThat(get("/api/v1/users/me", next.access())).hasStatus(401);
    }

    @Test
    void refreshFromAnotherDeviceRevokesSession() {
        Tokens t = signup("dev-a");
        assertThat(post("/api/v1/auth/refresh", refreshBody(t.refresh(), "dev-other"))).hasStatus(401);
        assertThat(get("/api/v1/users/me", t.access())).hasStatus(401);
    }

    @Test
    void logoutEndsSessionImmediately() {
        Tokens t = signup("dev-a");
        assertThat(mvc.post().uri("/api/v1/auth/logout").header("Authorization", "Bearer " + t.access())).hasStatus(204);
        assertThat(get("/api/v1/users/me", t.access())).hasStatus(401)
                .bodyJson().extractingPath("$.error.code").isEqualTo("AUTH_REQUIRED");
        assertThat(post("/api/v1/auth/refresh", refreshBody(t.refresh(), "dev-a"))).hasStatus(401);
    }

    @Test
    void sessionsArePerDevice() {
        String email = email();
        Tokens a = tokens(post("/api/v1/auth/signup", signupBody(email, "run12345", nick(), "dev-a")));
        Tokens b = tokens(post("/api/v1/auth/login", loginBody(email, "run12345", "dev-b")));
        // 다른 기기 로그인은 서로 영향 없음
        assertThat(get("/api/v1/users/me", a.access())).hasStatusOk();
        assertThat(get("/api/v1/users/me", b.access())).hasStatusOk();
        // 같은 기기에서 다시 로그인하면 그 기기의 이전 세션은 끝난다
        Tokens a2 = tokens(post("/api/v1/auth/login", loginBody(email, "run12345", "dev-a")));
        assertThat(get("/api/v1/users/me", a.access())).hasStatus(401);
        assertThat(post("/api/v1/auth/refresh", refreshBody(a.refresh(), "dev-a"))).hasStatus(401);
        assertThat(get("/api/v1/users/me", a2.access())).hasStatusOk();
        assertThat(get("/api/v1/users/me", b.access())).hasStatusOk();
    }

    @Test
    void refreshTokenExpires() {
        Tokens t = signup("dev-a");
        clock.advance(Duration.ofDays(31));
        assertThat(post("/api/v1/auth/refresh", refreshBody(t.refresh(), "dev-a"))).hasStatus(401);
    }

    @Test
    void malformedRefreshTokenIsRejected() {
        assertThat(post("/api/v1/auth/refresh", refreshBody("garbage", "dev-a"))).hasStatus(401);
        assertThat(post("/api/v1/auth/refresh", refreshBody("999999.abc", "dev-a"))).hasStatus(401);
    }

    // ── 사용자 ──

    @Test
    void nicknameAvailabilityAndChange() {
        String taken = nick();
        post("/api/v1/auth/signup", signupBody(email(), "run12345", taken, "dev-a"));
        assertThat(mvc.get().uri("/api/v1/users/nickname-availability").param("nickname", taken))
                .hasStatusOk().bodyJson().extractingPath("$.data.available").isEqualTo(false);
        assertThat(mvc.get().uri("/api/v1/users/nickname-availability").param("nickname", nick()))
                .hasStatusOk().bodyJson().extractingPath("$.data.available").isEqualTo(true);

        Tokens t = signup("dev-a");
        assertThat(patchMe(t.access(), taken)).hasStatus(409)
                .bodyJson().extractingPath("$.error.code").isEqualTo("NICKNAME_ALREADY_EXISTS");
        String fresh = nick();
        assertThat(patchMe(t.access(), "  " + fresh + " ")).hasStatusOk()
                .bodyJson().extractingPath("$.data.nickname").isEqualTo(fresh);
    }

    @Test
    void withdrawEndsAllSessionsAndFreesEmail() {
        String email = email();
        String nickname = nick();
        Tokens a = tokens(post("/api/v1/auth/signup", signupBody(email, "run12345", nickname, "dev-a")));
        Tokens b = tokens(post("/api/v1/auth/login", loginBody(email, "run12345", "dev-b")));
        assertThat(mvc.delete().uri("/api/v1/users/me").header("Authorization", "Bearer " + a.access())).hasStatus(204);
        assertThat(get("/api/v1/users/me", a.access())).hasStatus(401);
        assertThat(get("/api/v1/users/me", b.access())).hasStatus(401);
        assertThat(post("/api/v1/auth/refresh", refreshBody(b.refresh(), "dev-b"))).hasStatus(401);
        assertThat(post("/api/v1/auth/login", loginBody(email, "run12345", "dev-a"))).hasStatus(401);
        // 같은 이메일 · 닉네임으로 새로 가입할 수 있다
        assertThat(post("/api/v1/auth/signup", signupBody(email, "run12345", nickname, "dev-a"))).hasStatus(201);
    }

    private MvcTestResult patchMe(String access, String nickname) {
        return mvc.patch().uri("/api/v1/users/me").header("Authorization", "Bearer " + access)
                .contentType(MediaType.APPLICATION_JSON).content("{\"nickname\":\"%s\"}".formatted(nickname)).exchange();
    }

    // ── helpers ──

    private Tokens signup(String device) {
        return tokens(post("/api/v1/auth/signup", signupBody(email(), "run12345", nick(), device)));
    }

    private MvcTestResult post(String uri, String json) {
        return mvc.post().uri(uri).contentType(MediaType.APPLICATION_JSON).content(json).exchange();
    }

    private MvcTestResult get(String uri, String access) {
        return mvc.get().uri(uri).header("Authorization", "Bearer " + access).exchange();
    }

    private static Tokens tokens(MvcTestResult r) {
        assertThat(r).hasStatus2xxSuccessful();
        String b = body(r);
        return new Tokens(JsonPath.read(b, "$.data.accessToken"), JsonPath.read(b, "$.data.refreshToken"));
    }

    private static String body(MvcTestResult r) {
        try {
            return r.getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8);
        } catch (java.io.UnsupportedEncodingException e) {
            throw new IllegalStateException(e);
        }
    }

    private static String signupBody(String email, String password, String nickname, String device) {
        return """
                {"email":"%s","password":"%s","nickname":"%s","deviceId":"%s"}""".formatted(email, password, nickname, device);
    }

    private static String loginBody(String email, String password, String device) {
        return """
                {"email":"%s","password":"%s","deviceId":"%s"}""".formatted(email, password, device);
    }

    private static String refreshBody(String token, String device) {
        return """
                {"refreshToken":"%s","deviceId":"%s"}""".formatted(token, device);
    }

    private static String email() {
        return "runner-" + UUID.randomUUID().toString().substring(0, 8) + "@dallimo.test";
    }

    private static String nick() {
        return "러너" + UUID.randomUUID().toString().substring(0, 6);
    }
}
