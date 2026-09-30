package com.dallimo.dallimoserver.course;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 코스 신고 처리 (FOUNDATION-DECISION-LOG 53항): 서로 다른 사람의 신고 3건이면 자동 숨김, 관리자가 검토(숨김 · 차단 · 다시 공개).
 * MySQL(개발)과 MariaDB(운영) 양쪽에서 같은 결과여야 한다.
 */
@TestPropertySource(properties = "dallimo.admin.api-key=" + CourseModerationApiContractTest.KEY)
abstract class CourseModerationApiContractTest {

    static final String KEY = "moderation-admin-key";
    static final Instant T0 = Instant.parse("2026-09-29T00:00:00Z");

    @Autowired
    MockMvcTester mvc;

    record User(String token, long id) {
    }

    @Test
    void reportsHideCourseAndAdminReviews() {
        User owner = signup();
        List<User> users = List.of(signup(), signup(), signup(), signup());
        long course = course(owner);
        String path = "/api/v1/courses/" + course;

        // 만든 사람 신고는 세지 않는다. 같은 사람이 다시 신고해도 한 건
        assertThat(report(owner, course, "OTHER")).hasStatus(204);
        assertThat(report(users.get(0), course, "DANGER")).hasStatus(204);
        assertThat(report(users.get(1), course, "DANGER")).hasStatus(204);
        assertThat(report(users.get(1), course, "PRIVATE_PROPERTY")).hasStatus(204);
        assertThat(get(null, path)).hasStatusOk();
        // 세 번째 사람 → 자동 숨김: 상세 403, 주변 목록에서 빠짐, 더 신고할 수 없음
        assertThat(report(users.get(2), course, "DANGER")).hasStatus(204);
        assertThat(get(null, path)).hasStatus(403);
        assertThat(get(owner.token, path)).hasStatus(403);
        assertThat(nearbyIds()).doesNotContain(course);
        assertThat(report(users.get(3), course, "DANGER")).hasStatus(403);
        // 만든 사람의 내 코스에는 숨김 상태로 남는다
        String mine = body(get(owner.token, "/api/v1/users/me/courses?kind=CREATED"));
        assertThat((List<String>) JsonPath.read(mine, "$.data[?(@.id == " + course + ")].status")).containsExactly("HIDDEN");

        // 관리 키
        assertThat(get(null, "/api/v1/admin/courses/reported")).hasStatus(403);
        assertThat(admin("GET", "/api/v1/admin/courses/reported", "wrong", null)).hasStatus(403);

        // 검토 대기 목록: 숨긴 코스, 열린 신고 3건(만든 사람 제외), 사유별 수
        String queue = body(admin("GET", "/api/v1/admin/courses/reported", KEY, null));
        String item = "$.data[?(@.id == " + course + ")]";
        assertThat((List<String>) JsonPath.read(queue, item + ".status")).containsExactly("HIDDEN");
        assertThat((List<Integer>) JsonPath.read(queue, item + ".openReports")).containsExactly(3);
        assertThat((List<Integer>) JsonPath.read(queue, item + ".totalReports")).containsExactly(4);
        assertThat((List<Map<String, Integer>>) JsonPath.read(queue, item + ".openReasons")).containsExactly(Map.of("DANGER", 2, "PRIVATE_PROPERTY", 1));

        // 신고 · 처리 기록
        String detail = body(admin("GET", "/api/v1/admin/courses/" + course + "/reports", KEY, null));
        assertThat((List<?>) JsonPath.read(detail, "$.data.reports")).hasSize(4);
        assertThat((List<Boolean>) JsonPath.read(detail, "$.data.reports[?(@.userId == " + owner.id + ")].open")).containsExactly(false);
        assertThat((String) JsonPath.read(detail, "$.data.history[0].action")).isEqualTo("AUTO_HIDE");
        assertThat((String) JsonPath.read(detail, "$.data.history[0].fromStatus")).isEqualTo("NEW");
        assertThat((Integer) JsonPath.read(detail, "$.data.history[0].reportCount")).isEqualTo(3);

        // 다시 공개 → 숨기기 전 상태(NEW), 신고는 닫혀 대기 목록에서 빠진다
        String restored = body(moderate(course, "{\"action\":\"RESTORE\",\"note\":\"공사 끝남\"}"));
        assertThat((String) JsonPath.read(restored, "$.data.status")).isEqualTo("NEW");
        assertThat(get(null, path)).hasStatusOk();
        assertThat(nearbyIds()).contains(course);
        assertThat(queueIds()).doesNotContain(course);

        // 검토 뒤 새 신고는 다시 센다 (한 건으로는 숨기지 않고 대기 목록에만)
        assertThat(report(users.get(3), course, "WRONG_INFO")).hasStatus(204);
        assertThat(get(null, path)).hasStatusOk();
        assertThat(queueIds()).contains(course);

        // 차단 → 다시 공개하면 NEW로
        assertThat((String) JsonPath.read(body(moderate(course, "{\"action\":\"BLOCK\"}")), "$.data.status")).isEqualTo("BLOCKED");
        assertThat(get(null, path)).hasStatus(403);
        assertThat((String) JsonPath.read(body(moderate(course, "{\"action\":\"RESTORE\"}")), "$.data.status")).isEqualTo("NEW");
        String history = body(admin("GET", "/api/v1/admin/courses/" + course + "/reports", KEY, null));
        assertThat((List<String>) JsonPath.read(history, "$.data.history[*].action")).containsExactly("RESTORE", "BLOCK", "RESTORE", "AUTO_HIDE");
        assertThat((String) JsonPath.read(history, "$.data.history[2].note")).isEqualTo("공사 끝남");

        // 잘못된 요청
        assertThat(moderate(course, "{\"action\":\"AUTO_HIDE\"}")).hasStatus(400);
        assertThat(moderate(course, "{\"action\":\"DELETE\"}")).hasStatus(400);
        assertThat(moderate(course, "{}")).hasStatus(400);
        assertThat(admin("POST", "/api/v1/admin/courses/99999999/moderation", KEY, "{\"action\":\"HIDE\"}")).hasStatus(404);
        assertThat(admin("GET", "/api/v1/admin/courses/99999999/reports", KEY, null)).hasStatus(404);
    }

    // ── helpers ──

    private List<Long> queueIds() {
        List<Number> ids = JsonPath.read(body(admin("GET", "/api/v1/admin/courses/reported?size=200", KEY, null)), "$.data[*].id");
        return ids.stream().map(Number::longValue).toList();
    }

    private double[] at;

    private List<Long> nearbyIds() {
        List<Number> ids = JsonPath.read(body(get(null, "/api/v1/courses/nearby?lat=" + at[0] + "&lng=" + at[1] + "&radius=1000&size=50")), "$.data.items[*].id");
        return ids.stream().map(Number::longValue).toList();
    }

    private MvcTestResult report(User user, long course, String reason) {
        return post(user.token, "/api/v1/courses/" + course + "/reports", "{\"reason\":\"" + reason + "\"}");
    }

    private MvcTestResult moderate(long course, String json) {
        return admin("POST", "/api/v1/admin/courses/" + course + "/moderation", KEY, json);
    }

    private MvcTestResult admin(String method, String uri, String key, String json) {
        var req = "POST".equals(method) ? mvc.post().uri(uri).contentType(MediaType.APPLICATION_JSON).content(json) : mvc.get().uri(uri);
        if (key != null) req = req.header("X-Admin-Key", key);
        return req.exchange();
    }

    private User signup() {
        String id = UUID.randomUUID().toString().substring(0, 8);
        MvcTestResult r = post(null, "/api/v1/auth/signup", """
                {"email":"mod-%s@dallimo.test","password":"run12345","nickname":"신고%s","deviceId":"d"}""".formatted(id, id));
        assertThat(r).hasStatus(201);
        String b = body(r);
        return new User(JsonPath.read(b, "$.data.accessToken"), ((Number) JsonPath.read(b, "$.data.user.userId")).longValue());
    }

    /** 북쪽으로 초속 3m × 300초 기록으로 만든 코스 */
    private long course(User owner) {
        ThreadLocalRandom r = ThreadLocalRandom.current();
        at = new double[]{r.nextDouble(-60, 60), r.nextDouble(-170, 170)};
        MvcTestResult c = post(owner.token, "/api/v1/runs", """
                {"clientRunUuid":"%s","mode":"FREE","startedAt":"%s"}""".formatted(UUID.randomUUID(), T0));
        assertThat(c).hasStatus(201);
        long runId = ((Number) JsonPath.read(body(c), "$.data.runId")).longValue();
        String pts = IntStream.rangeClosed(1, 300).mapToObj(s -> """
                {"seq":%d,"latitude":%.7f,"longitude":%.7f,"accuracyM":5.0,"recordedAt":"%s"}"""
                .formatted(s, at[0] + (s - 1) * 3.0 / 111_195.0, at[1], T0.plusSeconds(s - 1))).collect(Collectors.joining(","));
        assertThat(post(owner.token, "/api/v1/runs/" + runId + "/points", """
                {"batchUuid":"%s","fromSeq":1,"toSeq":300,"points":[%s]}""".formatted(UUID.randomUUID(), pts))).hasStatusOk();
        assertThat(post(owner.token, "/api/v1/runs/" + runId + "/finish", """
                {"endedAt":"%s","lastSeq":300,"activeSeconds":300}""".formatted(T0.plusSeconds(300)))).hasStatusOk();
        MvcTestResult created = post(owner.token, "/api/v1/courses", """
                {"sourceRunId":%d,"name":"신고 코스","tags":[]}""".formatted(runId));
        assertThat(created).hasStatus(201);
        return ((Number) JsonPath.read(body(created), "$.data.id")).longValue();
    }

    private MvcTestResult post(String token, String uri, String json) {
        var req = mvc.post().uri(uri).contentType(MediaType.APPLICATION_JSON).content(json);
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
