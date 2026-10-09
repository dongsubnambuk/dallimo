package com.dallimo.dallimoserver.activityimport;

import com.dallimo.dallimoserver.activityimport.application.ImportedDistanceRepair;
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
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 외부 러닝 기록 가져오기 (명세 122장, 126장). 중복 방지 · 병합 후보 · 코스 자동 매칭 · 가져온 기록용 검증 정책 · 실패 기록 · 연동 상태.
 * MySQL(개발)과 MariaDB(운영) 양쪽에서 같은 결과여야 한다.
 */
abstract class ImportApiContractTest {

    @Autowired
    MockMvcTester mvc;

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    ImportedDistanceRepair repair;

    static final Instant T0 = Instant.parse("2026-09-01T00:00:00Z");

    record User(String token, long id) {
    }

    @Test
    void importMatchesCourseAndVerifiesWithImportedPolicy() {
        User owner = signup(), me = signup(), other = signup();
        double[] at = somewhere();
        long course = course(owner, at);
        Instant start = Instant.parse("2026-09-10T06:00:00Z");

        // 코스를 그대로 달린 Apple Watch 기록 (1초마다, 초속 3m, 300초)
        String id = "HK-" + UUID.randomUUID();
        MvcTestResult r = importRun(me, id, "APPLE_HEALTH", start, 300, 3.0, 1, at);
        assertThat(r).hasStatusOk();
        String b = body(r);
        assertThat((String) JsonPath.read(b, "$.data.status")).isEqualTo("IMPORTED");
        long runId = ((Number) JsonPath.read(b, "$.data.runId")).longValue();
        assertThat(((Number) JsonPath.read(b, "$.data.course.courseId")).longValue()).isEqualTo(course);
        assertThat((String) JsonPath.read(b, "$.data.course.name")).isEqualTo("가져오기 코스");
        assertThat(((Number) JsonPath.read(b, "$.data.course.matchRate")).doubleValue()).isGreaterThanOrEqualTo(90);
        assertThat((String) JsonPath.read(b, "$.data.verificationStatus")).isEqualTo("PENDING");

        // 가져온 기록용 정책으로 검증 → 공식 기록
        waitVerified(me, runId);
        String detail = body(get(me, "/api/v1/runs/" + runId));
        assertThat((String) JsonPath.read(detail, "$.data.summary.source")).isEqualTo("APPLE_HEALTH");
        assertThat((String) JsonPath.read(detail, "$.data.summary.sourceDeviceName")).isEqualTo("Apple Watch");
        assertThat((String) JsonPath.read(detail, "$.data.summary.importedAt")).isNotNull();
        assertThat((String) JsonPath.read(detail, "$.data.summary.mode")).isEqualTo("COURSE");
        assertThat((String) JsonPath.read(detail, "$.data.verification.policyVersion")).isEqualTo("2026-10-imp-v2");
        assertThat((Integer) JsonPath.read(detail, "$.data.summary.distanceM")).isBetween(880, 910);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM tbl_course_record WHERE run_id = ?", Integer.class, runId)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT trust_level FROM tbl_run WHERE id = ?", String.class, runId)).isEqualTo("MEDIUM");
        assertThat(jdbc.queryForObject("SELECT verification_policy_version FROM tbl_run WHERE id = ?", String.class, runId)).isEqualTo("2026-10-imp-v2");

        // 같은 기록을 다시 가져와도 한 번만 (같은 결과)
        String again = body(importRun(me, id, "APPLE_HEALTH", start, 300, 3.0, 1, at));
        assertThat(((Number) JsonPath.read(again, "$.data.runId")).longValue()).isEqualTo(runId);
        assertThat((String) JsonPath.read(again, "$.data.verificationStatus")).isEqualTo("VERIFIED");
        assertThat(((Number) JsonPath.read(again, "$.data.course.courseId")).longValue()).isEqualTo(course);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM tbl_run WHERE user_id = ?", Integer.class, me.id)).isEqualTo(1);

        // 확인: 가져온 기록만 알려 준다
        String check = body(post(me, "/api/v1/imported-activities/check", """
                {"source":"APPLE_HEALTH","externalIds":["%s","HK-unknown"]}""".formatted(id)));
        assertThat(JsonPath.<List<String>>read(check, "$.data[*].externalId")).containsExactly(id);
        assertThat((String) JsonPath.read(check, "$.data[0].status")).isEqualTo("IMPORTED");
        // 남의 확인에는 보이지 않는다
        assertThat(JsonPath.<List<?>>read(body(post(other, "/api/v1/imported-activities/check", """
                {"source":"APPLE_HEALTH","externalIds":["%s"]}""".formatted(id))), "$.data")).isEmpty();
        // 같은 원본 id를 다른 사람이 가져와도 따로다
        assertThat((String) JsonPath.read(body(importRun(other, id, "APPLE_HEALTH", start, 300, 3.0, 1, at)), "$.data.status")).isEqualTo("IMPORTED");

        // 히스토리에 가져온 기록 표시
        String list = body(get(me, "/api/v1/runs"));
        assertThat((String) JsonPath.read(list, "$.data.items[0].source")).isEqualTo("APPLE_HEALTH");

        // 연동 상태
        String integ = body(get(me, "/api/v1/integrations"));
        assertThat(JsonPath.<List<String>>read(integ, "$.data[*].source")).containsExactly("APPLE_HEALTH", "HEALTH_CONNECT");
        assertThat((Integer) JsonPath.read(integ, "$.data[0].importedCount")).isEqualTo(1);
        assertThat((String) JsonPath.read(integ, "$.data[0].lastImportedAt")).isNotNull();
        assertThat((Integer) JsonPath.read(integ, "$.data[1].importedCount")).isZero();
        assertThat(get(null, "/api/v1/integrations")).hasStatus(401);
    }

    @Test
    void routeWithoutOrWithLargeAccuracyKeepsPathDistanceAndCourse() {
        // FOUNDATION-DECISION-LOG 92항: 건강 앱 경로는 정확도가 없거나 20m보다 크게 적혀 와도 경로 · 거리 · 코스 매칭에 쓴다
        User owner = signup(), me = signup();
        double[] at = somewhere();
        long course = course(owner, at);
        String[] accuracies = {null, "35.0"};
        for (int i = 0; i < accuracies.length; i++) {
            Instant start = Instant.parse("2026-09-12T06:00:00Z").plusSeconds(3600L * i);
            MvcTestResult r = importRun(me, "HK-" + UUID.randomUUID(), "APPLE_HEALTH", start, 300, 3.0, 1, at, accuracies[i]);
            assertThat(r).hasStatusOk();
            String b = body(r);
            assertThat((String) JsonPath.read(b, "$.data.status")).isEqualTo("IMPORTED");
            assertThat(((Number) JsonPath.read(b, "$.data.course.courseId")).longValue()).isEqualTo(course);
            long runId = ((Number) JsonPath.read(b, "$.data.runId")).longValue();
            waitVerified(me, runId);
            String detail = body(get(me, "/api/v1/runs/" + runId));
            assertThat(JsonPath.<List<?>>read(detail, "$.data.path")).hasSizeGreaterThan(100);
            assertThat((Integer) JsonPath.read(detail, "$.data.summary.distanceM")).isBetween(880, 910);
            assertThat((String) JsonPath.read(detail, "$.data.verification.policyVersion")).isEqualTo("2026-10-imp-v2");
        }
        // 예전에 거리 0으로 저장된 가져온 기록은 서버를 켤 때 다시 잰다
        long old = jdbc.queryForObject("SELECT MIN(id) FROM tbl_run WHERE user_id = ?", Long.class, me.id);
        jdbc.update("UPDATE tbl_run SET distance_m = 0, avg_pace_sec_per_km = NULL WHERE id = ?", old);
        repair.run(null);
        assertThat(jdbc.queryForObject("SELECT distance_m FROM tbl_run WHERE id = ?", Integer.class, old)).isBetween(880, 910);
        assertThat(jdbc.queryForObject("SELECT avg_pace_sec_per_km FROM tbl_run WHERE id = ?", Integer.class, old)).isNotNull();
        // 고스트 · 구간 기록도 가져온 경로로 만든다
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM tbl_course_record WHERE course_id = ? AND user_id = ?", Integer.class, course, me.id)).isEqualTo(2);
        assertThat(JsonPath.<List<?>>read(body(get(me, "/api/v1/courses/" + course + "/ghost")), "$.data.samples")).isNotEmpty();
    }

    @Test
    void mergeCandidatesSparseIndoorAndNoCourse() {
        User owner = signup(), me = signup();
        double[] at = somewhere();
        course(owner, at);

        // 달리모로 기록한 러닝과 같은 시간의 워치 기록 → 새로 만들지 않고 병합 후보
        long mine = finishedRun(me, "FREE", null, at, 300, 3.0, T0);
        MvcTestResult merged = importRun(me, "HK-merge", "APPLE_HEALTH", T0.plusSeconds(20), 300, 3.0, 1, at);
        assertThat((String) JsonPath.read(body(merged), "$.data.status")).isEqualTo("MERGE_CANDIDATE");
        assertThat(((Number) JsonPath.read(body(merged), "$.data.mergedRunId")).longValue()).isEqualTo(mine);
        assertThat((Object) JsonPath.read(body(merged), "$.data.runId")).isNull();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM tbl_run WHERE user_id = ?", Integer.class, me.id)).isEqualTo(1);
        // 조금만 겹치면(절반 미만) 다른 달리기
        String apart = body(importRun(me, "HK-apart", "APPLE_HEALTH", T0.plusSeconds(250), 300, 3.0, 1, new double[]{at[0] + 0.05, at[1]}));
        assertThat((String) JsonPath.read(apart, "$.data.status")).isEqualTo("IMPORTED");

        // 경로 point가 10초마다인 기록: 코스를 따라 달렸어도 가져온 기록 정책으로는 인정하지 않는다 (코스 연결 없음)
        String sparse = body(importRun(me, "HK-sparse", "APPLE_HEALTH", Instant.parse("2026-09-11T06:00:00Z"), 300, 3.0, 10, at));
        assertThat((String) JsonPath.read(sparse, "$.data.status")).isEqualTo("IMPORTED");
        assertThat((Object) JsonPath.read(sparse, "$.data.course")).isNull();
        assertThat((String) JsonPath.read(sparse, "$.data.verificationStatus")).isEqualTo("NONE");

        // 실내 달리기: 경로 없이 거리만
        MvcTestResult indoor = post(me, "/api/v1/imported-activities/HC-indoor/import", """
                {"source":"HEALTH_CONNECT","sourceDeviceName":"Galaxy Watch","startedAt":"2026-09-12T06:00:00Z","endedAt":"2026-09-12T06:30:00Z",
                 "activeSeconds":1700,"distanceM":5000,"points":[]}""");
        assertThat(indoor).hasStatusOk();
        long indoorRun = ((Number) JsonPath.read(body(indoor), "$.data.runId")).longValue();
        String d = body(get(me, "/api/v1/runs/" + indoorRun));
        assertThat((Integer) JsonPath.read(d, "$.data.summary.distanceM")).isEqualTo(5000);
        assertThat((Integer) JsonPath.read(d, "$.data.summary.elapsedSeconds")).isEqualTo(1700);
        assertThat((String) JsonPath.read(d, "$.data.summary.source")).isEqualTo("HEALTH_CONNECT");

        // 코스가 없는 곳의 기록
        String free = body(importRun(me, "HK-free", "APPLE_HEALTH", Instant.parse("2026-09-13T06:00:00Z"), 200, 3.0, 1, somewhere()));
        assertThat((Object) JsonPath.read(free, "$.data.course")).isNull();
        assertThat((String) JsonPath.read(body(get(me, "/api/v1/runs/" + ((Number) JsonPath.read(free, "$.data.runId")).longValue())), "$.data.summary.mode"))
                .isEqualTo("FREE");
    }

    @Test
    void failuresAreRecordedAndRetryable() {
        User me = signup();
        double[] at = somewhere();
        // 끝이 시작보다 앞 → 400, 기록부에 실패 사유
        MvcTestResult bad = post(me, "/api/v1/imported-activities/HK-bad/import", """
                {"source":"APPLE_HEALTH","startedAt":"2026-09-14T06:00:00Z","endedAt":"2026-09-14T05:00:00Z","activeSeconds":10,"points":[]}""");
        assertThat(bad).hasStatus(400);
        String check = body(post(me, "/api/v1/imported-activities/check", """
                {"source":"APPLE_HEALTH","externalIds":["HK-bad"]}"""));
        assertThat((String) JsonPath.read(check, "$.data[0].status")).isEqualTo("FAILED");
        assertThat((String) JsonPath.read(check, "$.data[0].failureReason")).contains("시각");
        // 올바른 값으로 다시 시도하면 가져온다
        String ok = body(importRun(me, "HK-bad", "APPLE_HEALTH", Instant.parse("2026-09-14T06:00:00Z"), 120, 3.0, 1, at));
        assertThat((String) JsonPath.read(ok, "$.data.status")).isEqualTo("IMPORTED");
        assertThat(jdbc.queryForObject("SELECT attempts FROM tbl_activity_import WHERE user_id = ? AND provider_activity_id = 'HK-bad'", Integer.class, me.id))
                .isEqualTo(2);

        // 아직 받지 않는 source, 경로도 거리도 없음, 너무 긴 기록, 달린 시간이 더 김 → 400
        assertThat(post(me, "/api/v1/imported-activities/G-1/import", """
                {"source":"GARMIN","startedAt":"2026-09-14T06:00:00Z","endedAt":"2026-09-14T07:00:00Z","activeSeconds":10,"distanceM":100}""")).hasStatus(400);
        assertThat(post(me, "/api/v1/imported-activities/HK-empty/import", """
                {"source":"APPLE_HEALTH","startedAt":"2026-09-14T06:00:00Z","endedAt":"2026-09-14T07:00:00Z","activeSeconds":10,"points":[]}""")).hasStatus(400);
        assertThat(post(me, "/api/v1/imported-activities/HK-long/import", """
                {"source":"APPLE_HEALTH","startedAt":"2026-09-14T06:00:00Z","endedAt":"2026-09-16T07:00:00Z","activeSeconds":10,"distanceM":1}""")).hasStatus(400);
        assertThat(post(me, "/api/v1/imported-activities/HK-active/import", """
                {"source":"APPLE_HEALTH","startedAt":"2026-09-14T06:00:00Z","endedAt":"2026-09-14T06:10:00Z","activeSeconds":9999,"distanceM":1}""")).hasStatus(400);
        assertThat(post(me, "/api/v1/imported-activities/check", """
                {"source":"GPX_IMPORT","externalIds":["x"]}""")).hasStatus(400);
        assertThat(post(null, "/api/v1/imported-activities/HK-x/import", "{}")).hasStatus(401);
    }

    // ── 도우미 ──

    /** at에서 북쪽으로 초속 stepM m, every초마다 point */
    private MvcTestResult importRun(User user, String externalId, String source, Instant start, int seconds, double stepM, int every, double[] at) {
        return importRun(user, externalId, source, start, seconds, stepM, every, at, "5.0");
    }

    /** accuracyM: point마다 같은 정확도 (null이면 보내지 않는다) */
    private MvcTestResult importRun(User user, String externalId, String source, Instant start, int seconds, double stepM, int every, double[] at,
                                    String accuracyM) {
        String accuracy = accuracyM == null ? "" : "\"accuracyM\":" + accuracyM + ",";
        String pts = IntStream.iterate(0, s -> s <= seconds, s -> s + every).mapToObj(s -> """
                {"latitude":%.7f,"longitude":%.7f,%s"recordedAt":"%s"}"""
                .formatted(at[0] + s * stepM / 111_195.0, at[1], accuracy, start.plusSeconds(s))).collect(Collectors.joining(","));
        return post(user, "/api/v1/imported-activities/" + externalId + "/import", """
                {"source":"%s","sourceProvider":"com.apple.Fitness","sourceDeviceName":"Apple Watch","startedAt":"%s","endedAt":"%s",
                 "activeSeconds":%d,"points":[%s]}""".formatted(source, start, start.plusSeconds(seconds), seconds, pts));
    }

    private void waitVerified(User user, long runId) {
        for (int i = 0; i < 150; i++) {
            String status = JsonPath.read(body(get(user, "/api/v1/runs/" + runId)), "$.data.summary.verificationStatus");
            if ("VERIFIED".equals(status)) return;
            assertThat(status).isEqualTo("PENDING");
            sleep(100);
        }
        throw new AssertionError("검증이 끝나지 않았어요");
    }

    private User signup() {
        String id = UUID.randomUUID().toString().substring(0, 8);
        MvcTestResult r = post(null, "/api/v1/auth/signup", """
                {"email":"import-%s@dallimo.test","password":"run12345","nickname":"가져오기%s","deviceId":"d"}""".formatted(id, id));
        assertThat(r).hasStatus(201);
        String b = body(r);
        return new User(JsonPath.read(b, "$.data.accessToken"), ((Number) JsonPath.read(b, "$.data.user.userId")).longValue());
    }

    private static double[] somewhere() {
        ThreadLocalRandom r = ThreadLocalRandom.current();
        return new double[]{r.nextDouble(-60, 60), r.nextDouble(-170, 170)};
    }

    /** 북쪽으로 초속 3m × 300초 기록으로 만든 약 897m 코스 */
    private long course(User owner, double[] at) {
        long source = finishedRun(owner, "FREE", null, at, 300, 3.0, T0);
        MvcTestResult r = post(owner, "/api/v1/courses", """
                {"sourceRunId":%d,"name":"가져오기 코스","tags":[]}""".formatted(source));
        assertThat(r).hasStatus(201);
        return ((Number) JsonPath.read(body(r), "$.data.id")).longValue();
    }

    private long finishedRun(User user, String mode, Long courseId, double[] at, int points, double stepM, Instant t0) {
        MvcTestResult c = post(user, "/api/v1/runs", """
                {"clientRunUuid":"%s","mode":"%s","courseId":%s,"startedAt":"%s"}""".formatted(UUID.randomUUID(), mode, courseId, t0));
        assertThat(c).hasStatus(201);
        long runId = ((Number) JsonPath.read(body(c), "$.data.runId")).longValue();
        String pts = IntStream.rangeClosed(1, points).mapToObj(s -> """
                {"seq":%d,"latitude":%.7f,"longitude":%.7f,"accuracyM":5.0,"recordedAt":"%s"}"""
                .formatted(s, at[0] + (s - 1) * stepM / 111_195.0, at[1], t0.plusSeconds(s - 1))).collect(Collectors.joining(","));
        assertThat(post(user, "/api/v1/runs/" + runId + "/points", """
                {"batchUuid":"%s","fromSeq":1,"toSeq":%d,"points":[%s]}""".formatted(UUID.randomUUID(), points, pts))).hasStatusOk();
        assertThat(post(user, "/api/v1/runs/" + runId + "/finish", """
                {"endedAt":"%s","lastSeq":%d,"activeSeconds":%d}""".formatted(t0.plusSeconds(points), points, points))).hasStatusOk();
        return runId;
    }

    private static void sleep(long ms) {
        try {
            Thread.sleep(ms);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(e);
        }
    }

    private MvcTestResult post(User user, String uri, String json) {
        var req = mvc.post().uri(uri).contentType(MediaType.APPLICATION_JSON).content(json);
        if (user != null) req = req.header("Authorization", "Bearer " + user.token);
        return req.exchange();
    }

    private MvcTestResult get(User user, String uri) {
        var req = mvc.get().uri(uri);
        if (user != null) req = req.header("Authorization", "Bearer " + user.token);
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
