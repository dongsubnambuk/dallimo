package com.dallimo.dallimoserver.gamification;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 124장 Ghost (GET /courses/{id}/ghost?recordId=). MySQL(개발)과 MariaDB(운영) 양쪽에서 같은 결과여야 한다.
 * 고스트는 실제 검증을 거친 공식 기록의 GPS point로 만든다. 좌표는 주지 않는다.
 */
abstract class GhostApiContractTest {

    @Autowired
    MockMvcTester mvc;

    static final Instant T0 = Instant.parse("2026-09-29T00:00:00Z");

    record User(String token, long id, String name) {
    }

    @Test
    void ghostFromMyBestOrAChosenRecord() {
        User me = signup(), rival = signup(), stranger = signup();
        double[] at = somewhere();
        long course = course(me, at, 300);
        // 기록이 없으면 404
        assertThat(get(me.token, "/api/v1/courses/" + course + "/ghost")).hasStatus(404);
        courseRun(me, course, at, 334, 3.0);   // 약 299초
        courseRun(me, course, at, 250, 4.0);   // 약 225초 (PB)
        long rivalRun = courseRun(rival, course, at, 200, 5.0); // 약 179초

        // 기본은 내 PB
        String g = body(get(me.token, "/api/v1/courses/" + course + "/ghost"));
        assertThat((String) JsonPath.read(g, "$.data.relation")).isEqualTo("self");
        int pb = JsonPath.read(g, "$.data.timeSec");
        assertThat(pb).isBetween(222, 228);
        int length = JsonPath.read(g, "$.data.courseLengthM");
        List<List<Number>> samples = JsonPath.read(g, "$.data.samples");
        assertThat(samples.get(0)).extracting(Number::doubleValue).containsExactly(0.0, 0.0);
        assertThat(samples.get(samples.size() - 1)).extracting(Number::intValue).containsExactly(length, pb);
        assertThat(samples.size()).isBetween(18, 20);
        // 좌표는 없다
        assertThat(g).doesNotContain("latitude").doesNotContain("longitude");

        // 도전 대상처럼 다른 사람 기록 id로
        assertThat((Integer) JsonPath.read(body(get(rival.token, "/api/v1/runs/" + rivalRun)), "$.data.verification.recordSeconds")).isBetween(176, 182);
        long rivalRecord = crownRecordId(me, course);
        String r = body(get(me.token, "/api/v1/courses/" + course + "/ghost?recordId=" + rivalRecord));
        assertThat((String) JsonPath.read(r, "$.data.name")).isEqualTo(rival.name);
        assertThat((String) JsonPath.read(r, "$.data.relation")).isEqualTo("normal");
        assertThat((Integer) JsonPath.read(r, "$.data.timeSec")).isBetween(176, 182);
        // 다른 코스의 기록 id, 기록이 없는 사람의 기본값, 비회원 기본값은 404
        long other = course(stranger, somewhere(), 300);
        assertThat(get(me.token, "/api/v1/courses/" + other + "/ghost?recordId=" + rivalRecord)).hasStatus(404);
        assertThat(get(stranger.token, "/api/v1/courses/" + course + "/ghost")).hasStatus(404);
        assertThat(get(null, "/api/v1/courses/" + course + "/ghost")).hasStatus(404);
        assertThat(get(null, "/api/v1/courses/" + course + "/ghost?recordId=" + rivalRecord)).hasStatusOk();
    }

    /** 이 코스 크라운 기록 id (라이벌이 가장 빠르다) */
    private long crownRecordId(User user, long course) {
        String d = body(get(user.token, "/api/v1/courses/" + course + "/crown"));
        return ((Number) JsonPath.read(d, "$.data.recordId")).longValue();
    }

    // ── helpers ──

    private User signup() {
        String id = UUID.randomUUID().toString().substring(0, 8);
        MvcTestResult r = post(null, "/api/v1/auth/signup", """
                {"email":"ghost-%s@dallimo.test","password":"run12345","nickname":"고스트%s","deviceId":"d"}""".formatted(id, id));
        assertThat(r).hasStatus(201);
        String b = body(r);
        return new User(JsonPath.read(b, "$.data.accessToken"), ((Number) JsonPath.read(b, "$.data.user.userId")).longValue(), "고스트" + id);
    }

    private static double[] somewhere() {
        ThreadLocalRandom r = ThreadLocalRandom.current();
        return new double[]{r.nextDouble(-60, 60), r.nextDouble(-170, 170)};
    }

    /** 북쪽으로 초속 3m × points초 기록으로 만든 코스 (600이면 약 1.8km → 구간 2개) */
    private long course(User owner, double[] at, int points) {
        long source = finishedRun(owner, null, at, points, 3.0);
        MvcTestResult r = post(owner.token, "/api/v1/courses", """
                {"sourceRunId":%d,"name":"구간 코스","tags":[]}""".formatted(source));
        assertThat(r).hasStatus(201);
        return ((Number) JsonPath.read(body(r), "$.data.id")).longValue();
    }

    private long courseRun(User user, long courseId, double[] at, int points, double stepM) {
        long runId = finishedRun(user, courseId, at, points, stepM);
        for (int i = 0; i < 150; i++) {
            String status = JsonPath.read(body(get(user.token, "/api/v1/runs/" + runId)), "$.data.summary.verificationStatus");
            if (!"PENDING".equals(status)) {
                assertThat(status).isEqualTo("VERIFIED");
                return runId;
            }
            try {
                Thread.sleep(100);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new IllegalStateException(e);
            }
        }
        throw new AssertionError("검증이 끝나지 않았어요");
    }

    private long finishedRun(User user, Long courseId, double[] at, int points, double stepM) {
        MvcTestResult c = post(user.token, "/api/v1/runs", """
                {"clientRunUuid":"%s","mode":"%s","courseId":%s,"startedAt":"%s"}"""
                .formatted(UUID.randomUUID(), courseId == null ? "FREE" : "COURSE", courseId, T0));
        assertThat(c).hasStatus(201);
        long runId = ((Number) JsonPath.read(body(c), "$.data.runId")).longValue();
        // 한 번에 올릴 수 있는 수보다 많으면 나눠 올린다
        for (int from = 1; from <= points; from += 300) {
            int to = Math.min(points, from + 299);
            String pts = IntStream.rangeClosed(from, to).mapToObj(s -> """
                    {"seq":%d,"latitude":%.7f,"longitude":%.7f,"accuracyM":5.0,"recordedAt":"%s"}"""
                    .formatted(s, at[0] + (s - 1) * stepM / 111_195.0, at[1], T0.plusSeconds(s - 1))).collect(Collectors.joining(","));
            assertThat(post(user.token, "/api/v1/runs/" + runId + "/points", """
                    {"batchUuid":"%s","fromSeq":%d,"toSeq":%d,"points":[%s]}""".formatted(UUID.randomUUID(), from, to, pts))).hasStatusOk();
        }
        assertThat(post(user.token, "/api/v1/runs/" + runId + "/finish", """
                {"endedAt":"%s","lastSeq":%d,"activeSeconds":%d}""".formatted(T0.plusSeconds(points), points, points))).hasStatusOk();
        return runId;
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
