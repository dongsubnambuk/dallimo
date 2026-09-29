package com.dallimo.dallimoserver.verification;

import com.dallimo.dallimoserver.verification.application.CourseVerificationService;
import com.dallimo.dallimoserver.verification.application.VerificationTrigger;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * WBS 5 코스 완주 검증을 API로 끝까지 (53장 CRS-IT-001~003). MySQL(개발)과 MariaDB(운영) 양쪽에서 같은 결과여야 한다.
 * 코스: 북쪽으로 초속 3m × 300초 기록으로 만든 약 897m 직선.
 */
abstract class VerificationApiContractTest {

    @Autowired
    MockMvcTester mvc;

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    CourseVerificationService verification;

    @Autowired
    VerificationTrigger trigger;

    static final Instant T0 = Instant.parse("2026-09-29T00:00:00Z");

    @Test
    void finishedCourseRunIsVerifiedWithOfficialRecordAndPb() {
        // CRS-IT-001
        String token = signup();
        double[] at = somewhere();
        long courseId = course(token, at);
        // 코스를 지나 100m 더 달림 → 공식 기록은 코스 구간만
        long first = courseRun(token, courseId, at, 334, 3.0);
        assertThat(await(token, first)).isEqualTo("VERIFIED");
        String b = body(get(token, "/api/v1/runs/" + first));
        assertThat((Integer) JsonPath.read(b, "$.data.verification.recordSeconds")).isBetween(297, 301);
        assertThat((Double) JsonPath.read(b, "$.data.verification.matchRate")).isGreaterThanOrEqualTo(95.0);
        assertThat((Boolean) JsonPath.read(b, "$.data.verification.personalBest")).isTrue();
        assertThat((Object) JsonPath.read(b, "$.data.verification.previousBestSec")).isNull();
        assertThat((Object) JsonPath.read(b, "$.data.verification.failureReason")).isNull();
        assertThat((String) JsonPath.read(b, "$.data.verification.policyVersion")).isEqualTo("2026-09-v1");
        assertThat((String) JsonPath.read(b, "$.data.summary.courseName")).isEqualTo("검증 코스");
        Map<String, Object> rec = jdbc.queryForMap("SELECT course_id, user_id, duration_seconds, avg_pace_sec_per_km FROM tbl_course_record WHERE run_id = ?", first);
        assertThat(((Number) rec.get("course_id")).longValue()).isEqualTo(courseId);
        assertThat(((Number) rec.get("avg_pace_sec_per_km")).intValue()).isBetween(330, 336);

        // 더 빠르게 → PB, 더 느리게 → PB 아님
        long faster = courseRun(token, courseId, at, 300, 3.3);
        assertThat(await(token, faster)).isEqualTo("VERIFIED");
        String fb = body(get(token, "/api/v1/runs/" + faster));
        assertThat((Boolean) JsonPath.read(fb, "$.data.verification.personalBest")).isTrue();
        assertThat((Integer) JsonPath.read(fb, "$.data.verification.previousBestSec")).isBetween(297, 301);
        long slower = courseRun(token, courseId, at, 400, 2.5);
        assertThat(await(token, slower)).isEqualTo("VERIFIED");
        assertThat((Boolean) JsonPath.read(body(get(token, "/api/v1/runs/" + slower)), "$.data.verification.personalBest")).isFalse();

        // 코스 상세 · 내 코스에 공식 기록이 반영된다
        String course = body(get(token, "/api/v1/courses/" + courseId));
        assertThat((Integer) JsonPath.read(course, "$.data.myRecord.finishCount")).isEqualTo(3);
        assertThat((Integer) JsonPath.read(course, "$.data.competition.leaderSec")).isBetween(270, 275);
        assertThat((Integer) JsonPath.read(course, "$.data.finisherCount")).isEqualTo(1);
        assertThat(JsonPath.<List<Number>>read(body(get(token, "/api/v1/users/me/courses?kind=FINISHED")), "$.data[*].id"))
                .extracting(Number::longValue).containsExactly(courseId);
        // 목록에도 코스 이름
        List<Map<String, Object>> items = JsonPath.read(body(get(token, "/api/v1/runs")), "$.data.items");
        assertThat(items).hasSize(4).allSatisfy(i -> assertThat(i.get("courseName")).isEqualTo(i.get("courseId") == null ? null : "검증 코스"));
    }

    @Test
    void stoppingHalfwayIsUnverifiedWithoutRecord() {
        // CRS-IT-002
        String token = signup();
        double[] at = somewhere();
        long courseId = course(token, at);
        long run = courseRun(token, courseId, at, 150, 3.0);
        assertThat(await(token, run)).isEqualTo("UNVERIFIED");
        String b = body(get(token, "/api/v1/runs/" + run));
        assertThat((String) JsonPath.read(b, "$.data.verification.failureReason")).isEqualTo("END_NOT_REACHED");
        assertThat((Object) JsonPath.read(b, "$.data.verification.recordSeconds")).isNull();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM tbl_course_record WHERE run_id = ?", Integer.class, run)).isZero();
        assertThat((Object) JsonPath.read(body(get(token, "/api/v1/courses/" + courseId)), "$.data.myRecord")).isNull();
    }

    @Test
    void vehicleSpeedIsRejectedWithEvidence() {
        // CRS-IT-003: 근거(검사별 결과 · 정책 버전)를 남긴다
        String token = signup();
        double[] at = somewhere();
        long courseId = course(token, at);
        long run = courseRun(token, courseId, at, 100, 10.0);
        assertThat(await(token, run)).isEqualTo("REJECTED");
        Map<String, Object> v = jdbc.queryForMap("SELECT start_check, end_check, speed_check, failure_reason, policy_version FROM tbl_run_verification WHERE run_id = ?", run);
        assertThat(v).containsEntry("speed_check", "FAIL").containsEntry("start_check", "PASS").containsEntry("end_check", "PASS")
                .containsEntry("failure_reason", "SPEED_ANOMALY").containsEntry("policy_version", "2026-09-v1");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM tbl_course_record WHERE run_id = ?", Integer.class, run)).isZero();
    }

    @Test
    void verificationRunsOnceAndSweepPicksUpLeftovers() {
        String token = signup();
        double[] at = somewhere();
        long courseId = course(token, at);
        long run = courseRun(token, courseId, at, 150, 3.0);
        assertThat(await(token, run)).isEqualTo("UNVERIFIED");
        // 이미 판정한 Run은 다시 판정하지 않는다
        assertThat(verification.verify(run)).isEmpty();
        assertThat(rows(run)).isEqualTo(1);
        // 서버가 꺼져 검증 대기로 남은 경우: 주기 재검사가 찾아서 판정한다
        jdbc.update("UPDATE tbl_run SET verification_status = 'PENDING', updated_at = ? WHERE id = ?", Timestamp.from(Instant.now().minusSeconds(120)), run);
        trigger.sweep();
        assertThat(jdbc.queryForObject("SELECT verification_status FROM tbl_run WHERE id = ?", String.class, run)).isEqualTo("UNVERIFIED");
        assertThat(rows(run)).isEqualTo(2);
        // 자유 달리기는 검증하지 않는다
        long free = finishedRun(token, null, at, 300, 3.0);
        assertThat((Object) JsonPath.read(body(get(token, "/api/v1/runs/" + free)), "$.data.verification")).isNull();
        assertThat(rows(free)).isZero();
    }

    // ── helpers ──

    private int rows(long runId) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM tbl_run_verification WHERE run_id = ?", Integer.class, runId);
    }

    private String signup() {
        String id = UUID.randomUUID().toString().substring(0, 8);
        MvcTestResult r = post(null, "/api/v1/auth/signup", """
                {"email":"verify-%s@dallimo.test","password":"run12345","nickname":"검증%s","deviceId":"d"}""".formatted(id, id));
        assertThat(r).hasStatus(201);
        return JsonPath.read(body(r), "$.data.accessToken");
    }

    private static double[] somewhere() {
        ThreadLocalRandom r = ThreadLocalRandom.current();
        return new double[]{r.nextDouble(-60, 60), r.nextDouble(-170, 170)};
    }

    private long course(String token, double[] at) {
        long source = finishedRun(token, null, at, 300, 3.0);
        MvcTestResult r = post(token, "/api/v1/courses", """
                {"sourceRunId":%d,"name":"검증 코스","tags":[]}""".formatted(source));
        assertThat(r).hasStatus(201);
        return ((Number) JsonPath.read(body(r), "$.data.id")).longValue();
    }

    private long courseRun(String token, long courseId, double[] at, int points, double stepM) {
        return finishedRun(token, courseId, at, points, stepM);
    }

    /** 출발 위치에서 북쪽으로 1초마다 stepM씩 points개 */
    private long finishedRun(String token, Long courseId, double[] at, int points, double stepM) {
        MvcTestResult c = post(token, "/api/v1/runs", """
                {"clientRunUuid":"%s","mode":"%s","courseId":%s,"startedAt":"%s"}"""
                .formatted(UUID.randomUUID(), courseId == null ? "FREE" : "COURSE", courseId, T0));
        assertThat(c).hasStatus(201);
        long runId = ((Number) JsonPath.read(body(c), "$.data.runId")).longValue();
        String pts = IntStream.rangeClosed(1, points).mapToObj(s -> """
                {"seq":%d,"latitude":%.7f,"longitude":%.7f,"accuracyM":5.0,"recordedAt":"%s"}"""
                .formatted(s, at[0] + (s - 1) * stepM / 111_195.0, at[1], T0.plusSeconds(s - 1))).collect(Collectors.joining(","));
        assertThat(post(token, "/api/v1/runs/" + runId + "/points", """
                {"batchUuid":"%s","fromSeq":1,"toSeq":%d,"points":[%s]}""".formatted(UUID.randomUUID(), points, pts))).hasStatusOk();
        assertThat(post(token, "/api/v1/runs/" + runId + "/finish", """
                {"endedAt":"%s","lastSeq":%d,"activeSeconds":%d}""".formatted(T0.plusSeconds(points), points, points))).hasStatusOk();
        return runId;
    }

    /** 커밋 뒤 비동기 검증이 끝날 때까지 (최대 15초) */
    private String await(String token, long runId) {
        for (int i = 0; i < 150; i++) {
            String status = JsonPath.read(body(get(token, "/api/v1/runs/" + runId)), "$.data.summary.verificationStatus");
            if (!"PENDING".equals(status)) return status;
            try {
                Thread.sleep(100);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new IllegalStateException(e);
            }
        }
        return "PENDING";
    }

    private MvcTestResult post(String token, String uri, String json) {
        var req = mvc.post().uri(uri).contentType(MediaType.APPLICATION_JSON).content(json);
        if (token != null) req = req.header("Authorization", "Bearer " + token);
        return req.exchange();
    }

    private MvcTestResult get(String token, String uri) {
        return mvc.get().uri(uri).header("Authorization", "Bearer " + token).exchange();
    }

    private static String body(MvcTestResult r) {
        try {
            return r.getResponse().getContentAsString(StandardCharsets.UTF_8);
        } catch (java.io.UnsupportedEncodingException e) {
            throw new IllegalStateException(e);
        }
    }
}
