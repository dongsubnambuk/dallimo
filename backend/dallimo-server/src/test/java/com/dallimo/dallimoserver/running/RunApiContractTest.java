package com.dallimo.dallimoserver.running;

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
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 42장 Run API · 53장 RUN-IT-001~007. MySQL(개발)과 MariaDB(운영) 양쪽에서 같은 결과여야 한다 (ADR-004).
 */
abstract class RunApiContractTest {

    @Autowired
    MockMvcTester mvc;

    @Autowired
    JdbcTemplate jdbc;

    static final Instant T0 = Instant.parse("2026-09-29T00:00:00Z");

    // ── RUN-IT-001 ──

    @Test
    void createIsIdempotentByClientRunUuid() {
        String token = signup();
        String uuid = UUID.randomUUID().toString();
        MvcTestResult first = createRun(token, uuid);
        MvcTestResult again = createRun(token, uuid);
        assertThat(first).hasStatus(201);
        assertThat(again).hasStatus(200);
        assertThat((Integer) JsonPath.read(body(again), "$.data.runId")).isEqualTo(JsonPath.read(body(first), "$.data.runId"));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM tbl_run WHERE client_run_uuid = ?", Integer.class, uuid)).isEqualTo(1);
    }

    @Test
    void otherUsersClientRunUuidConflicts() {
        String uuid = UUID.randomUUID().toString();
        createRun(signup(), uuid);
        assertThat(createRun(signup(), uuid)).hasStatus(409).bodyJson().extractingPath("$.error.code").isEqualTo("IDEMPOTENCY_CONFLICT");
    }

    // ── RUN-IT-002 · 003 · 004 ──

    @Test
    void sameBatchResendDoesNotDuplicate() {
        String token = signup();
        long runId = newRun(token);
        String batch = UUID.randomUUID().toString();
        assertThat(upload(token, runId, batch, 1, 30)).hasStatusOk().bodyJson().extractingPath("$.data.lastAcceptedSeq").isEqualTo(30);
        assertThat(upload(token, runId, batch, 1, 30)).hasStatusOk();
        assertThat(pointCount(runId)).isEqualTo(30);
    }

    @Test
    void sameBatchUuidWithDifferentPayloadConflicts() {
        String token = signup();
        long runId = newRun(token);
        String batch = UUID.randomUUID().toString();
        upload(token, runId, batch, 1, 30);
        assertThat(upload(token, runId, batch, 1, 31)).hasStatus(409).bodyJson().extractingPath("$.error.code").isEqualTo("IDEMPOTENCY_CONFLICT");
    }

    @Test
    void overlappingSeqInAnotherBatchIsNotDuplicated() {
        String token = signup();
        long runId = newRun(token);
        upload(token, runId, UUID.randomUUID().toString(), 1, 30);
        assertThat(upload(token, runId, UUID.randomUUID().toString(), 20, 40)).hasStatusOk()
                .bodyJson().extractingPath("$.data.lastAcceptedSeq").isEqualTo(40);
        assertThat(pointCount(runId)).isEqualTo(40);
    }

    @Test
    void firstBatchArrivingLateIsCountedFromStart() {
        String token = signup();
        long runId = newRun(token);
        // 앞 Batch가 늦게 오면 1부터 이어진 것이 없다
        assertThat(upload(token, runId, UUID.randomUUID().toString(), 31, 60)).hasStatusOk()
                .bodyJson().extractingPath("$.data.lastAcceptedSeq").isEqualTo(0);
        assertThat(upload(token, runId, UUID.randomUUID().toString(), 1, 30)).hasStatusOk()
                .bodyJson().extractingPath("$.data.lastAcceptedSeq").isEqualTo(60);
        assertThat(upload(token, runId, UUID.randomUUID().toString(), 61, 90)).hasStatusOk()
                .bodyJson().extractingPath("$.data.lastAcceptedSeq").isEqualTo(90);
        // 결정 로그 70항: 확인한 seq를 Run에 저장해 다음 Batch는 그 뒤부터 센다
        assertThat(jdbc.queryForObject("SELECT contiguous_seq FROM tbl_run WHERE id = ?", Integer.class, runId)).isEqualTo(90);
    }

    // ── RUN-IT-005 ──

    @Test
    void cannotTouchOthersRun() {
        long runId = newRun(signup());
        String other = signup();
        assertThat(upload(other, runId, UUID.randomUUID().toString(), 1, 5)).hasStatus(403)
                .bodyJson().extractingPath("$.error.code").isEqualTo("RESOURCE_FORBIDDEN");
        assertThat(finish(other, runId, 0, 60)).hasStatus(403);
        assertThat(get(other, "/api/v1/runs/" + runId)).hasStatus(403);
        assertThat(pointCount(runId)).isZero();
    }

    // ── RUN-IT-006 · 007 ──

    @Test
    void finishWithMissingBatchStaysFinishingThenCompletes() {
        String token = signup();
        long runId = newRun(token);
        upload(token, runId, UUID.randomUUID().toString(), 1, 300);
        upload(token, runId, UUID.randomUUID().toString(), 401, 500); // 301~400 빠짐
        assertThat(finish(token, runId, 500, 500)).hasStatusOk().bodyJson().extractingPath("$.data.status").isEqualTo("FINISHING");
        upload(token, runId, UUID.randomUUID().toString(), 301, 400);
        MvcTestResult done = finish(token, runId, 500, 480);
        assertThat(done).hasStatusOk().bodyJson().extractingPath("$.data.status").isEqualTo("FINISHED");
        // 499구간 × 3m ≈ 1497m, 앱이 보낸 달린 시간 480초 (시작~종료 500초보다 짧음: 일시정지 제외)
        assertThat((Integer) JsonPath.read(body(done), "$.data.distanceM")).isBetween(1494, 1500);
        assertThat((Integer) JsonPath.read(body(done), "$.data.elapsedSeconds")).isEqualTo(480);
        assertThat((Integer) JsonPath.read(body(done), "$.data.avgPaceSecPerKm")).isBetween(319, 322);
        assertThat(JsonPath.<String>read(body(done), "$.data.verificationStatus")).isEqualTo("NONE");
        // 재요청은 같은 결과
        MvcTestResult again = finish(token, runId, 500, 999);
        assertThat(body(again)).isEqualTo(body(done).replaceAll("\"timestamp\":\"[^\"]+\"", body(again).replaceAll(".*(\"timestamp\":\"[^\"]+\").*", "$1")));
        assertThat((Integer) JsonPath.read(body(again), "$.data.elapsedSeconds")).isEqualTo(480);
    }

    @Test
    void activeSecondsCannotExceedWallClock() {
        String token = signup();
        long runId = newRun(token);
        upload(token, runId, UUID.randomUUID().toString(), 1, 10);
        assertThat(finish(token, runId, 10, 99_999)).hasStatusOk().bodyJson().extractingPath("$.data.elapsedSeconds").isEqualTo(600);
    }

    @Test
    void noPointsAfterFinishButResendOfKnownBatchIsOk() {
        String token = signup();
        long runId = newRun(token);
        String batch = UUID.randomUUID().toString();
        upload(token, runId, batch, 1, 10);
        finish(token, runId, 10, 10);
        assertThat(upload(token, runId, batch, 1, 10)).hasStatusOk();
        assertThat(upload(token, runId, UUID.randomUUID().toString(), 11, 20)).hasStatus(409)
                .bodyJson().extractingPath("$.error.code").isEqualTo("RUN_INVALID_STATE");
    }

    // ── 42.3장 검증 ──

    @Test
    void batchValidation() {
        String token = signup();
        long runId = newRun(token);
        // points가 비어 있으면 400
        assertThat(post(token, "/api/v1/runs/" + runId + "/points", """
                {"batchUuid":"%s","fromSeq":1,"toSeq":1,"points":[]}""".formatted(UUID.randomUUID()))).hasStatus(400);
        // from/to와 실제 seq가 다르면 422
        assertThat(post(token, "/api/v1/runs/" + runId + "/points", batchJson(UUID.randomUUID().toString(), 1, 10, 1, 9)))
                .hasStatus(422).bodyJson().extractingPath("$.error.code").isEqualTo("RUN_POINT_INVALID");
        // 좌표 범위
        assertThat(post(token, "/api/v1/runs/" + runId + "/points", """
                {"batchUuid":"%s","fromSeq":1,"toSeq":1,"points":[{"seq":1,"latitude":95,"longitude":128,"accuracyM":5,"recordedAt":"2026-09-29T00:00:00Z"}]}"""
                .formatted(UUID.randomUUID()))).hasStatus(422);
        // 없는 Run
        assertThat(upload(token, 999_999_999L, UUID.randomUUID().toString(), 1, 2)).hasStatus(404)
                .bodyJson().extractingPath("$.error.code").isEqualTo("RUN_NOT_FOUND");
        // Idempotency-Key가 batchUuid와 다르면 400
        assertThat(mvc.post().uri("/api/v1/runs/" + runId + "/points").header("Authorization", "Bearer " + token)
                .header("Idempotency-Key", UUID.randomUUID().toString()).contentType(MediaType.APPLICATION_JSON)
                .content(batchJson(UUID.randomUUID().toString(), 1, 2, 1, 2)).exchange()).hasStatus(400);
        // 없는 코스로 만들기
        assertThat(post(token, "/api/v1/runs", """
                {"clientRunUuid":"%s","mode":"COURSE","courseId":123456,"startedAt":"2026-09-29T09:00:00+09:00"}"""
                .formatted(UUID.randomUUID()))).hasStatus(404).bodyJson().extractingPath("$.error.code").isEqualTo("COURSE_NOT_FOUND");
        assertThat(pointCount(runId)).isZero();
    }

    @Test
    void pauseAndResumeFollowState() {
        String token = signup();
        long runId = newRun(token);
        assertThat(post(token, "/api/v1/runs/" + runId + "/resume", "")).hasStatus(409);
        assertThat(post(token, "/api/v1/runs/" + runId + "/pause", "")).hasStatusOk().bodyJson().extractingPath("$.data.status").isEqualTo("PAUSED");
        assertThat(post(token, "/api/v1/runs/" + runId + "/pause", "")).hasStatus(409);
        assertThat(post(token, "/api/v1/runs/" + runId + "/resume", "")).hasStatusOk().bodyJson().extractingPath("$.data.status").isEqualTo("RUNNING");
    }

    // ── 조회 ──

    @Test
    void listAndDetail() {
        String token = signup();
        for (int i = 0; i < 3; i++) {
            long runId = newRun(token, T0.plusSeconds(3600L * i));
            upload(token, runId, UUID.randomUUID().toString(), 1, 400);
            finish(token, runId, 400, 399);
        }
        newRun(token, T0.plusSeconds(99_999)); // 끝나지 않은 러닝은 목록에 없다
        MvcTestResult page1 = get(token, "/api/v1/runs?size=2");
        assertThat(page1).hasStatusOk();
        List<Integer> ids1 = JsonPath.read(body(page1), "$.data.items[*].runId");
        assertThat(ids1).hasSize(2);
        assertThat(JsonPath.<Boolean>read(body(page1), "$.data.hasNext")).isTrue();
        String cursor = JsonPath.read(body(page1), "$.data.nextCursor");
        MvcTestResult page2 = get(token, "/api/v1/runs?size=2&cursor=" + cursor);
        List<Integer> ids2 = JsonPath.read(body(page2), "$.data.items[*].runId");
        assertThat(ids2).hasSize(1).doesNotContainAnyElementsOf(ids1);
        assertThat(JsonPath.<Boolean>read(body(page2), "$.data.hasNext")).isFalse();
        // 최근 시작 순
        List<String> starts = JsonPath.read(body(page1), "$.data.items[*].startedAt");
        assertThat(starts.get(0)).isGreaterThan(starts.get(1));

        MvcTestResult detail = get(token, "/api/v1/runs/" + ids1.get(0));
        assertThat(detail).hasStatusOk();
        assertThat(JsonPath.<List<Object>>read(body(detail), "$.data.splits")).hasSize(1);
        assertThat(JsonPath.<List<Object>>read(body(detail), "$.data.path").size()).isBetween(2, 401);
        // 다른 사용자 목록에는 없다
        assertThat(JsonPath.<List<Object>>read(body(get(signup(), "/api/v1/runs")), "$.data.items")).isEmpty();
        assertThat(get(token, "/api/v1/runs?cursor=@@bad")).hasStatus(400);
        // size 범위 밖은 400 (전에는 500)
        assertThat(get(token, "/api/v1/runs?size=51")).hasStatus(400);
        assertThat(get(token, "/api/v1/runs?size=0")).hasStatus(400);
    }

    // ── helpers ──

    private String signup() {
        String id = UUID.randomUUID().toString().substring(0, 8);
        MvcTestResult r = post(null, "/api/v1/auth/signup", """
                {"email":"run-%s@dallimo.test","password":"run12345","nickname":"러너%s","deviceId":"d"}""".formatted(id, id));
        assertThat(r).hasStatus(201);
        return JsonPath.read(body(r), "$.data.accessToken");
    }

    private MvcTestResult createRun(String token, String uuid) {
        return post(token, "/api/v1/runs", """
                {"clientRunUuid":"%s","mode":"FREE","courseId":null,"challengeId":null,"liveRoomId":null,"startedAt":"%s"}""".formatted(uuid, T0));
    }

    /** 워치 심박 (FOUNDATION-DECISION-LOG 65항): finish로 받아 평균 · 최고를 상세에 준다. 러닝 시간 밖은 버리고, 동의를 끄면 지운다 */
    @Test
    void heartRateFromWatch() {
        String token = signup();
        long runId = newRun(token, T0);
        upload(token, runId, UUID.randomUUID().toString(), 1, 120);
        // 잘못된 심박(250 초과)은 400
        assertThat(post(token, "/api/v1/runs/" + runId + "/finish", """
                {"endedAt":"%s","lastSeq":120,"activeSeconds":120,"heartRate":[{"recordedAt":"%s","bpm":300}]}"""
                .formatted(T0.plusSeconds(600), T0.plusSeconds(10)))).hasStatus(400);
        // 러닝 앞 10분(범위 밖) 하나는 버린다
        assertThat(post(token, "/api/v1/runs/" + runId + "/finish", """
                {"endedAt":"%s","lastSeq":120,"activeSeconds":120,"heartRate":[
                  {"recordedAt":"%s","bpm":120},{"recordedAt":"%s","bpm":140},{"recordedAt":"%s","bpm":160},{"recordedAt":"%s","bpm":200}]}"""
                .formatted(T0.plusSeconds(600), T0.plusSeconds(5), T0.plusSeconds(10), T0.plusSeconds(15), T0.minusSeconds(600)))).hasStatusOk();
        String detail = body(get(token, "/api/v1/runs/" + runId));
        assertThat(JsonPath.<Integer>read(detail, "$.data.heartRate.avgBpm")).isEqualTo(140);
        assertThat(JsonPath.<Integer>read(detail, "$.data.heartRate.maxBpm")).isEqualTo(160);
        assertThat(JsonPath.<Integer>read(detail, "$.data.heartRate.sampleCount")).isEqualTo(3);

        // 심박을 보내지 않은 러닝은 null
        long other = newRun(token, T0.plusSeconds(7200));
        upload(token, other, UUID.randomUUID().toString(), 1, 60);
        finish(token, other, 60, 60);
        assertThat((Object) JsonPath.read(body(get(token, "/api/v1/runs/" + other)), "$.data.heartRate")).isNull();

        // 동의를 끄면 모두 지운다
        var del = mvc.delete().uri("/api/v1/users/me/heart-rates").header("Authorization", "Bearer " + token).exchange();
        assertThat(del).hasStatus(204);
        assertThat((Object) JsonPath.read(body(get(token, "/api/v1/runs/" + runId)), "$.data.heartRate")).isNull();
    }

    private long newRun(String token) {
        return newRun(token, T0);
    }

    private long newRun(String token, Instant startedAt) {
        MvcTestResult r = post(token, "/api/v1/runs", """
                {"clientRunUuid":"%s","mode":"FREE","startedAt":"%s"}""".formatted(UUID.randomUUID(), startedAt));
        assertThat(r).hasStatus(201);
        return ((Number) JsonPath.read(body(r), "$.data.runId")).longValue();
    }

    private MvcTestResult upload(String token, long runId, String batch, int from, int to) {
        return post(token, "/api/v1/runs/" + runId + "/points", batchJson(batch, from, to, from, to));
    }

    /** seq from..to 점을 북쪽으로 초속 3m 간격으로 (seq 1 = T0) */
    private static String batchJson(String batch, int fromSeq, int toSeq, int first, int last) {
        String pts = IntStream.rangeClosed(first, last).mapToObj(s -> """
                {"seq":%d,"latitude":%.7f,"longitude":128.6000000,"accuracyM":5.0,"speedMps":3.0,"recordedAt":"%s"}"""
                .formatted(s, 35.8 + (s - 1) * 3 / 111_320.0, T0.plusSeconds(s - 1))).collect(Collectors.joining(","));
        return """
                {"batchUuid":"%s","fromSeq":%d,"toSeq":%d,"points":[%s]}""".formatted(batch, fromSeq, toSeq, pts);
    }

    private MvcTestResult finish(String token, long runId, int lastSeq, int activeSeconds) {
        return post(token, "/api/v1/runs/" + runId + "/finish", """
                {"endedAt":"%s","lastSeq":%d,"activeSeconds":%d}""".formatted(T0.plusSeconds(Math.max(lastSeq, 600)), lastSeq, activeSeconds));
    }

    private MvcTestResult post(String token, String uri, String json) {
        var req = mvc.post().uri(uri).contentType(MediaType.APPLICATION_JSON).content(json);
        if (token != null) req = req.header("Authorization", "Bearer " + token);
        return req.exchange();
    }

    private MvcTestResult get(String token, String uri) {
        return mvc.get().uri(uri).header("Authorization", "Bearer " + token).exchange();
    }

    private int pointCount(long runId) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM tbl_run_point WHERE run_id = ?", Integer.class, runId);
    }

    private static String body(MvcTestResult r) {
        try {
            return r.getResponse().getContentAsString(StandardCharsets.UTF_8);
        } catch (java.io.UnsupportedEncodingException e) {
            throw new IllegalStateException(e);
        }
    }
}
