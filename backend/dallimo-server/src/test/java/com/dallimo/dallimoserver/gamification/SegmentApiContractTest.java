package com.dallimo.dallimoserver.gamification;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
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
 * 124장 Segment Attack (126장 GET /courses/{id}/segments, 러닝 상세 verification.segments). MySQL(개발)과 MariaDB(운영) 양쪽에서 같은 결과여야 한다.
 * 구간은 서버가 코스를 약 1km씩 나눈다(사용자 결정). 구간 기록은 실제 검증을 거친 러닝에서만 생긴다.
 */
abstract class SegmentApiContractTest {

    @Autowired
    MockMvcTester mvc;

    @Autowired
    JdbcTemplate jdbc;

    static final Instant T0 = Instant.parse("2026-09-29T00:00:00Z");

    record User(String token, long id, String name) {
    }

    @Test
    void verifiedRunsLeaveSegmentRecords() {
        User me = signup(), rival = signup();
        double[] at = somewhere();
        // 약 1.8km 코스 → 구간 2개(약 900m씩)
        long course = course(me, at, 600);
        String empty = body(get(me.token, "/api/v1/courses/" + course + "/segments"));
        int length = JsonPath.read(empty, "$.data.courseLengthM");
        assertThat(length).isBetween(1790, 1800);
        List<Map<String, Object>> segs = JsonPath.read(empty, "$.data.segments");
        assertThat(segs).hasSize(2);
        assertThat(segs).extracting(s -> ((Number) s.get("index")).intValue()).containsExactly(0, 1);
        assertThat(((Number) segs.get(0).get("startM")).intValue()).isZero();
        assertThat(((Number) segs.get(1).get("endM")).intValue()).isEqualTo(length);
        assertThat(((Number) segs.get(0).get("distanceM")).intValue()).isBetween(895, 900);
        assertThat(segs.get(0).get("leader")).isNull();
        assertThat(segs.get(0).get("myBestSec")).isNull();
        assertThat(((Number) segs.get(0).get("runnerCount")).intValue()).isZero();

        // 라이벌: 초속 4m → 구간마다 약 225초
        courseRun(rival, course, at, 460, 4.0);
        // 나: 초속 3m → 약 300초, 2위
        long slow = courseRun(me, course, at, 610, 3.0);
        String a = body(get(me.token, "/api/v1/runs/" + slow));
        List<Map<String, Object>> first = JsonPath.read(a, "$.data.verification.segments");
        assertThat(first).hasSize(2);
        assertThat(((Number) first.get(0).get("timeSec")).intValue()).isBetween(295, 302);
        assertThat(first.get(0)).containsEntry("personalBest", true).containsEntry("rank", 2);
        assertThat(first.get(0).get("previousBestSec")).isNull();
        assertThat(((Number) first.get(0).get("leaderSec")).intValue()).isBetween(222, 228);
        // 초속 5m → 약 180초, 구간 PB · 1위
        long fast = courseRun(me, course, at, 380, 5.0);
        String b = body(get(me.token, "/api/v1/runs/" + fast));
        List<Map<String, Object>> second = JsonPath.read(b, "$.data.verification.segments");
        assertThat(((Number) second.get(1).get("timeSec")).intValue()).isBetween(177, 183);
        assertThat(second.get(1)).containsEntry("personalBest", true).containsEntry("rank", 1);
        assertThat(((Number) second.get(1).get("previousBestSec")).intValue()).isBetween(295, 302);
        // 느린 기록을 다시 보면 PB였던 것은 그대로, 지금 순위는 1위(내 최고 기준)
        List<Map<String, Object>> again = JsonPath.read(body(get(me.token, "/api/v1/runs/" + slow)), "$.data.verification.segments");
        assertThat(again.get(0)).containsEntry("personalBest", true);

        // 코스 구간 목록: 나에게는 1위가 나, 라이벌에게는 남, 비회원은 내 기록 없음
        String mine = body(get(me.token, "/api/v1/courses/" + course + "/segments"));
        assertThat((String) JsonPath.read(mine, "$.data.segments[0].leader.relation")).isEqualTo("self");
        assertThat((Integer) JsonPath.read(mine, "$.data.segments[0].leader.timeSec")).isBetween(177, 183);
        assertThat((Integer) JsonPath.read(mine, "$.data.segments[0].myBestSec")).isBetween(177, 183);
        assertThat((Integer) JsonPath.read(mine, "$.data.segments[1].runnerCount")).isEqualTo(2);
        String theirs = body(get(rival.token, "/api/v1/courses/" + course + "/segments"));
        assertThat((String) JsonPath.read(theirs, "$.data.segments[0].leader.relation")).isEqualTo("normal");
        assertThat((String) JsonPath.read(theirs, "$.data.segments[0].leader.name")).isEqualTo(me.name);
        assertThat((Integer) JsonPath.read(theirs, "$.data.segments[0].myBestSec")).isBetween(222, 228);
        assertThat((Object) JsonPath.read(body(get(null, "/api/v1/courses/" + course + "/segments")), "$.data.segments[0].myBestSec")).isNull();
        // 한 러닝은 구간마다 한 줄
        Integer rows = jdbc.queryForObject("SELECT COUNT(*) FROM tbl_course_segment_record WHERE run_id = ?", Integer.class, fast);
        assertThat(rows).isEqualTo(2);
        assertThat(get(me.token, "/api/v1/courses/99999999/segments")).hasStatus(404);
    }

    @Test
    void shortCourseHasNoSegments() {
        // 약 900m 코스: 코스 전체가 곧 구간이라 따로 두지 않는다
        User me = signup();
        double[] at = somewhere();
        long course = course(me, at, 300);
        assertThat(JsonPath.<List<?>>read(body(get(me.token, "/api/v1/courses/" + course + "/segments")), "$.data.segments")).isEmpty();
        long run = courseRun(me, course, at, 250, 4.0);
        assertThat(JsonPath.<List<?>>read(body(get(me.token, "/api/v1/runs/" + run)), "$.data.verification.segments")).isEmpty();
    }

    // ── helpers ──

    private User signup() {
        String id = UUID.randomUUID().toString().substring(0, 8);
        MvcTestResult r = post(null, "/api/v1/auth/signup", """
                {"email":"seg-%s@dallimo.test","password":"run12345","nickname":"구간%s","deviceId":"d"}""".formatted(id, id));
        assertThat(r).hasStatus(201);
        String b = body(r);
        return new User(JsonPath.read(b, "$.data.accessToken"), ((Number) JsonPath.read(b, "$.data.user.userId")).longValue(), "구간" + id);
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
