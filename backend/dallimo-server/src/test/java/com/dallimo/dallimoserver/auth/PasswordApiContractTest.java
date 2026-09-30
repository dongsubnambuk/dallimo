package com.dallimo.dallimoserver.auth;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 비밀번호 변경 (결정 로그 58항). MySQL(개발)과 MariaDB(운영) 양쪽에서 같은 결과여야 한다.
 * 이메일 인증 코드로 하는 재설정은 뺐다 (결정 로그 60항)
 */
abstract class PasswordApiContractTest {

    @Autowired
    MockMvcTester mvc;

    record Login(String access, String refresh) {
    }

    @Test
    void changePasswordKeepsThisDeviceAndLogsOutOthers() {
        String email = "pw-" + UUID.randomUUID().toString().substring(0, 8) + "@dallimo.test";
        Login phone = signup(email, "run12345", "phone");
        Login tablet = login(email, "run12345", "tablet");

        assertThat(change(phone.access, "wrong999", "newpass77")).hasStatus(400).bodyText().contains("PASSWORD_MISMATCH");
        assertThat(change(phone.access, "run12345", "run12345")).hasStatus(400).bodyText().contains("VALIDATION_ERROR");
        assertThat(change(phone.access, "run12345", "short")).hasStatus(400);
        assertThat(change(null, "run12345", "newpass77")).hasStatus(401);
        assertThat(change(phone.access, "run12345", "newpass77")).hasStatus(204);

        // 이 기기는 계속, 다른 기기는 로그아웃
        assertThat(mvc.get().uri("/api/v1/users/me").header("Authorization", "Bearer " + phone.access).exchange()).hasStatusOk();
        assertThat(mvc.get().uri("/api/v1/users/me").header("Authorization", "Bearer " + tablet.access).exchange()).hasStatus(401);
        assertThat(post("/api/v1/auth/refresh", "{\"refreshToken\":\"%s\",\"deviceId\":\"tablet\"}".formatted(tablet.refresh))).hasStatus(401);
        assertThat(post("/api/v1/auth/login", loginBody(email, "run12345", "x"))).hasStatus(401);
        assertThat(post("/api/v1/auth/login", loginBody(email, "newpass77", "x"))).hasStatusOk();
    }

    @Test
    void resetEndpointsAreGone() {
        // 재설정 경로는 없다 (로그인 없이 부르면 인증부터 막힌다)
        assertThat(post("/api/v1/auth/password/reset-code", "{\"email\":\"a@dallimo.test\"}").getResponse().getStatus()).isIn(401, 404);
        assertThat(post("/api/v1/auth/password/reset", "{\"email\":\"a@dallimo.test\",\"code\":\"123456\",\"newPassword\":\"fresh123\"}")
                .getResponse().getStatus()).isIn(401, 404);
    }

    private Login signup(String email, String password, String device) {
        String nick = "비번" + UUID.randomUUID().toString().substring(0, 6);
        MvcTestResult r = post("/api/v1/auth/signup", """
                {"email":"%s","password":"%s","nickname":"%s","deviceId":"%s"}""".formatted(email, password, nick, device));
        assertThat(r).hasStatus(201);
        return tokens(r);
    }

    private Login login(String email, String password, String device) {
        MvcTestResult r = post("/api/v1/auth/login", loginBody(email, password, device));
        assertThat(r).hasStatusOk();
        return tokens(r);
    }

    private static String loginBody(String email, String password, String device) {
        return "{\"email\":\"%s\",\"password\":\"%s\",\"deviceId\":\"%s\"}".formatted(email, password, device);
    }

    private static Login tokens(MvcTestResult r) {
        String b = new String(r.getResponse().getContentAsByteArray(), StandardCharsets.UTF_8);
        return new Login(JsonPath.read(b, "$.data.accessToken"), JsonPath.read(b, "$.data.refreshToken"));
    }

    private MvcTestResult change(String token, String current, String next) {
        var req = mvc.post().uri("/api/v1/auth/password/change").contentType(MediaType.APPLICATION_JSON)
                .content("{\"currentPassword\":\"%s\",\"newPassword\":\"%s\"}".formatted(current, next));
        if (token != null) req = req.header("Authorization", "Bearer " + token);
        return req.exchange();
    }

    private MvcTestResult post(String uri, String json) {
        return mvc.post().uri(uri).contentType(MediaType.APPLICATION_JSON).content(json).exchange();
    }
}
