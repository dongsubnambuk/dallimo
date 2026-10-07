package com.dallimo.dallimoserver.admin;

import com.dallimo.dallimoserver.common.observability.ServerErrorRecorder;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 관리 웹 2단계 (FOUNDATION-DECISION-LOG 87항): 모니터링 · 서버 오류 · 공지 푸시. MySQL(개발)과 MariaDB(운영) 양쪽에서.
 * 밤 10시~아침 8시 막기는 시각에 따라 달라져 끄고 본다 (QuietHours 자체는 PushDispatcher 테스트)
 */
@TestPropertySource(properties = "dallimo.push.quiet-hours=false")
abstract class AdminOpsApiContractTest {

    static final String BOSS = "admin@naver.com";
    static final String BOSS_PASSWORD = AdminUserApiContractTest.BOSS_PASSWORD;

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ServerErrorRecorder recorder;

    record User(String token, long id) {
    }

    @Test
    void monitoringErrorsAndNotices() throws InterruptedException {
        String boss = bossToken();
        User ios = signup();
        User android = signup();
        User none = signup();
        assertThat(put(ios.token, "/api/v1/users/me/push-token", "{\"token\":\"ExponentPushToken[ios-" + ios.id + "]\",\"platform\":\"ios\"}")).hasStatus(204);
        assertThat(put(android.token, "/api/v1/users/me/push-token", "{\"token\":\"ExponentPushToken[and-" + android.id + "]\",\"platform\":\"android\"}")).hasStatus(204);

        // 모니터링: 일반 회원은 못 본다. 서버 상태 · 최근 60분 · 주요 API · 오늘 수치
        assertThat(get(ios.token, "/api/v1/admin/monitoring")).hasStatus(403);
        assertThat(get(null, "/api/v1/courses/nearby?lat=35.8&lng=128.6&radius=1000&size=5")).hasStatusOk();
        String m = body(get(boss, "/api/v1/admin/monitoring"));
        assertThat((Boolean) JsonPath.read(m, "$.data.server.db.ok")).isTrue();
        assertThat((Boolean) JsonPath.read(m, "$.data.server.redis.ok")).isTrue();
        assertThat(((Number) JsonPath.read(m, "$.data.server.uptimeSec")).longValue()).isGreaterThanOrEqualTo(0);
        assertThat((List<?>) JsonPath.read(m, "$.data.api.minutes")).hasSize(60);
        assertThat(((Number) JsonPath.read(m, "$.data.api.total.requests")).longValue()).isGreaterThan(0);
        List<Number> nearby = JsonPath.read(m, "$.data.api.keyApis[?(@.name == '주변 코스')].requests");
        assertThat(nearby.get(0).longValue()).isGreaterThan(0);
        assertThat(((Number) JsonPath.read(m, "$.data.today.signups")).intValue()).isGreaterThanOrEqualTo(3);

        // 서버 오류: 최근 · 종류별
        recorder.record(new IllegalStateException("모니터링 테스트 오류"), null);
        String e = body(get(boss, "/api/v1/admin/errors"));
        assertThat((String) JsonPath.read(e, "$.data.recent[0].exception")).isEqualTo("java.lang.IllegalStateException");
        assertThat((String) JsonPath.read(e, "$.data.recent[0].message")).isEqualTo("모니터링 테스트 오류");
        assertThat((String) JsonPath.read(e, "$.data.recent[0].location")).startsWith("AdminOpsApiContractTest.");
        assertThat(((Number) JsonPath.read(e, "$.data.last24h")).intValue()).isGreaterThanOrEqualTo(1);
        assertThat((List<?>) JsonPath.read(e, "$.data.groups")).isNotEmpty();
        assertThat(get(boss, "/api/v1/admin/errors?days=31")).hasStatus(400);

        // 공지 대상
        String all = body(get(boss, "/api/v1/admin/notices/audience?target=ALL"));
        int allUsers = JsonPath.read(all, "$.data.users");
        assertThat(allUsers).isGreaterThanOrEqualTo(3);
        assertThat((Boolean) JsonPath.read(all, "$.data.quietHours")).isFalse();
        String iosAudience = body(get(boss, "/api/v1/admin/notices/audience?target=IOS"));
        int iosUsers = JsonPath.read(iosAudience, "$.data.users");
        int iosDevices = JsonPath.read(iosAudience, "$.data.devices");
        assertThat(iosUsers).isGreaterThanOrEqualTo(1).isLessThan(allUsers);
        assertThat(iosDevices).isGreaterThanOrEqualTo(1);

        // 테스트 발송: 기기가 없는 회원 409, 있으면 그 기기로만
        assertThat(post(boss, "/api/v1/admin/notices/test", "{\"userId\":" + none.id + ",\"title\":\"t\",\"body\":\"b\"}")).hasStatus(409);
        String t = body(post(boss, "/api/v1/admin/notices/test", "{\"userId\":" + ios.id + ",\"title\":\"점검 안내\",\"body\":\"테스트\",\"link\":\"/settings\"}"));
        assertThat((Integer) JsonPath.read(t, "$.data.devices")).isEqualTo(1);
        assertThat((Integer) JsonPath.read(t, "$.data.ok")).isEqualTo(1);
        assertThat(post(boss, "/api/v1/admin/notices/test", "{\"userId\":999999999,\"title\":\"t\",\"body\":\"b\"}")).hasStatus(404);

        // 보내기: 잘못된 링크 · 대상 수가 다르면 막는다
        assertThat(post(boss, "/api/v1/admin/notices", send("IOS", "https://evil.example", iosUsers))).hasStatus(400);
        assertThat(post(boss, "/api/v1/admin/notices", send("IOS", "/settings", iosUsers + 1))).hasStatus(409);
        assertThat(post(ios.token, "/api/v1/admin/notices", send("IOS", "/settings", iosUsers))).hasStatus(403);
        String sent = body(post(boss, "/api/v1/admin/notices", send("IOS", "/settings", iosUsers)));
        long id = ((Number) JsonPath.read(sent, "$.data.id")).longValue();
        assertThat((Integer) JsonPath.read(sent, "$.data.targetUsers")).isEqualTo(iosUsers);

        // Push는 커밋 뒤 비동기로 보낸다
        String done = null;
        for (int i = 0; i < 50; i++) {
            done = body(get(boss, "/api/v1/admin/notices/" + id));
            if (!"SENDING".equals(JsonPath.read(done, "$.data.status"))) break;
            Thread.sleep(100);
        }
        assertThat((String) JsonPath.read(done, "$.data.status")).isEqualTo("SENT");
        assertThat((Integer) JsonPath.read(done, "$.data.pushTokens")).isEqualTo(iosDevices);
        assertThat((Integer) JsonPath.read(done, "$.data.pushOk")).isEqualTo(iosDevices);
        assertThat((String) JsonPath.read(done, "$.data.actorName")).isNotBlank();
        assertThat((List<Number>) JsonPath.read(body(get(boss, "/api/v1/admin/notices")), "$.data[*].id")).extracting(Number::longValue).contains(id);

        // 받는 회원 알림함에만 남는다
        String inbox = body(get(ios.token, "/api/v1/notifications"));
        assertThat((List<String>) JsonPath.read(inbox, "$.data.items[?(@.type == 'NOTICE')].title")).contains("서버 점검 안내");
        assertThat((List<String>) JsonPath.read(inbox, "$.data.items[?(@.type == 'NOTICE')].link")).contains("/settings");
        assertThat((List<?>) JsonPath.read(body(get(android.token, "/api/v1/notifications")), "$.data.items[?(@.type == 'NOTICE')]")).isEmpty();
    }

    private static String send(String target, String link, int expected) {
        return """
                {"target":"%s","title":"서버 점검 안내","body":"10월 8일 새벽 2시부터 30분 동안 점검해요.","link":"%s","expectedUsers":%d}"""
                .formatted(target, link, expected);
    }

    // ── helpers ──

    private String bossToken() {
        String setup = body(get(null, "/api/v1/admin/setup"));
        MvcTestResult r = (Boolean) JsonPath.read(setup, "$.data.needed")
                ? post(null, "/api/v1/admin/setup", "{\"password\":\"%s\",\"deviceId\":\"ops-web\"}".formatted(BOSS_PASSWORD))
                : post(null, "/api/v1/admin/login", "{\"email\":\"%s\",\"password\":\"%s\",\"deviceId\":\"ops-web\"}".formatted(BOSS, BOSS_PASSWORD));
        assertThat(r).hasStatusOk();
        return JsonPath.read(body(r), "$.data.accessToken");
    }

    private User signup() {
        String id = UUID.randomUUID().toString().substring(0, 8);
        MvcTestResult r = post(null, "/api/v1/auth/signup", """
                {"email":"ops-%s@dallimo.test","password":"run12345","nickname":"운영%s","deviceId":"d-%s"}""".formatted(id, id, id));
        assertThat(r).hasStatus(201);
        String b = body(r);
        return new User(JsonPath.read(b, "$.data.accessToken"), ((Number) JsonPath.read(b, "$.data.user.userId")).longValue());
    }

    private MvcTestResult post(String token, String uri, String json) {
        var req = mvc.post().uri(uri).contentType(MediaType.APPLICATION_JSON).content(json);
        if (token != null) req = req.header("Authorization", "Bearer " + token);
        return req.exchange();
    }

    private MvcTestResult put(String token, String uri, String json) {
        var req = mvc.put().uri(uri).contentType(MediaType.APPLICATION_JSON).content(json);
        if (token != null) req = req.header("Authorization", "Bearer " + token);
        return req.exchange();
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
