package com.dallimo.dallimoserver.gamification;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

import java.nio.charset.StandardCharsets;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 124장 Course Crown · Local Legend (126장 GET /courses/{id}/crown · /local-legend). MySQL(개발)과 MariaDB(운영) 양쪽에서 같은 결과여야 한다.
 * 공식 기록은 검증이 만든다. 집계만 보려고 직접 넣고, 마지막 테스트는 실제 검증을 거친다.
 */
abstract class CourseTitleApiContractTest {

    @Autowired
    MockMvcTester mvc;

    @Autowired
    JdbcTemplate jdbc;

    static final Instant T0 = Instant.parse("2026-09-29T00:00:00Z");

    record User(String token, long id, String name) {
    }

    @Test
    void crownIsFastestVerifiedRecordInLast90Days() {
        User me = signup(), old = signup(), holder = signup(), late = signup();
        long course = course(me);
        Instant now = Instant.now();
        // 기록이 없으면 크라운 없음
        String empty = body(get(me.token, "/api/v1/courses/" + course + "/crown"));
        assertThat((Object) JsonPath.read(empty, "$.data.holder")).isNull();
        assertThat((Integer) JsonPath.read(empty, "$.data.periodDays")).isEqualTo(90);

        record(course, me, 300, now.minus(Duration.ofDays(1)));
        // 90일이 지난 더 빠른 기록은 세지 않는다
        record(course, old, 250, now.minus(Duration.ofDays(91)));
        record(course, holder, 290, now.minus(Duration.ofDays(10)));
        // 같은 기록이면 먼저 세운 사람
        record(course, late, 290, now.minus(Duration.ofDays(2)));

        String c = body(get(me.token, "/api/v1/courses/" + course + "/crown"));
        assertThat(((Number) JsonPath.read(c, "$.data.holder.userId")).longValue()).isEqualTo(holder.id);
        assertThat((String) JsonPath.read(c, "$.data.holder.name")).isEqualTo(holder.name);
        assertThat((String) JsonPath.read(c, "$.data.holder.relation")).isEqualTo("normal");
        assertThat((Integer) JsonPath.read(c, "$.data.timeSec")).isEqualTo(290);
        assertThat((Integer) JsonPath.read(c, "$.data.paceSecPerKm")).isBetween(320, 326);
        assertThat((Integer) JsonPath.read(c, "$.data.me.bestSec")).isEqualTo(300);
        assertThat((Integer) JsonPath.read(c, "$.data.me.gapSec")).isEqualTo(10);
        assertThat((Boolean) JsonPath.read(c, "$.data.me.holder")).isFalse();
        // 크라운인 사람은 relation self, 차이 0
        String h = body(get(holder.token, "/api/v1/courses/" + course + "/crown"));
        assertThat((String) JsonPath.read(h, "$.data.holder.relation")).isEqualTo("self");
        assertThat((Integer) JsonPath.read(h, "$.data.me.gapSec")).isZero();
        assertThat((Boolean) JsonPath.read(h, "$.data.me.holder")).isTrue();
        // 친구면 relation friend. 기간 안 기록이 없는 사람 · 비회원은 me 없음
        befriend(me, holder);
        assertThat((String) JsonPath.read(body(get(me.token, "/api/v1/courses/" + course + "/crown")), "$.data.holder.relation")).isEqualTo("friend");
        assertThat((Object) JsonPath.read(body(get(old.token, "/api/v1/courses/" + course + "/crown")), "$.data.me")).isNull();
        String anon = body(get(null, "/api/v1/courses/" + course + "/crown"));
        assertThat((Object) JsonPath.read(anon, "$.data.me")).isNull();
        assertThat(((Number) JsonPath.read(anon, "$.data.holder.userId")).longValue()).isEqualTo(holder.id);
        // 없는 코스
        assertThat(get(me.token, "/api/v1/courses/99999999/crown")).hasStatus(404);
    }

    @Test
    void legendIsMostVerifiedFinishesInLast90Days() {
        User me = signup(), first = signup(), second = signup(), old = signup();
        long course = course(me);
        Instant now = Instant.now();
        // 한 번씩만 달렸으면 레전드 없음 (2번 이상)
        record(course, me, 300, now.minus(Duration.ofDays(3)));
        String none = body(get(me.token, "/api/v1/courses/" + course + "/local-legend"));
        assertThat((Object) JsonPath.read(none, "$.data.holder")).isNull();
        assertThat((Integer) JsonPath.read(none, "$.data.minFinishes")).isEqualTo(2);
        assertThat((Integer) JsonPath.read(none, "$.data.me.finishCount")).isEqualTo(1);
        assertThat((Integer) JsonPath.read(none, "$.data.me.needed")).isEqualTo(1);

        // first · second 3번씩: 3번째를 먼저 채운 first가 레전드. old는 5번이지만 90일 전
        for (int d : new int[]{30, 20, 5}) record(course, first, 320, now.minus(Duration.ofDays(d)));
        for (int d : new int[]{40, 10, 2}) record(course, second, 310, now.minus(Duration.ofDays(d)));
        for (int i = 0; i < 5; i++) record(course, old, 330, now.minus(Duration.ofDays(95 + i)));

        String l = body(get(me.token, "/api/v1/courses/" + course + "/local-legend"));
        assertThat(((Number) JsonPath.read(l, "$.data.holder.userId")).longValue()).isEqualTo(first.id);
        assertThat((Integer) JsonPath.read(l, "$.data.finishCount")).isEqualTo(3);
        assertThat((String) JsonPath.read(l, "$.data.lastFinishedAt")).isNotBlank();
        // 나는 1번: 레전드를 넘으려면 3번 더 (같은 횟수면 먼저 채운 사람)
        assertThat((Integer) JsonPath.read(l, "$.data.me.finishCount")).isEqualTo(1);
        assertThat((Integer) JsonPath.read(l, "$.data.me.needed")).isEqualTo(3);
        String f = body(get(first.token, "/api/v1/courses/" + course + "/local-legend"));
        assertThat((Boolean) JsonPath.read(f, "$.data.me.holder")).isTrue();
        assertThat((Integer) JsonPath.read(f, "$.data.me.needed")).isZero();
        assertThat((Object) JsonPath.read(body(get(null, "/api/v1/courses/" + course + "/local-legend")), "$.data.me")).isNull();
    }

    @Test
    void verifiedRunTakesCrownAndLegend() {
        // 실제 검증: 라이벌 250초가 이번 달에 있다
        User me = signup(), rival = signup();
        double[] at = somewhere();
        long course = course(me, at);
        record(course, rival, 250, Instant.now().minus(Duration.ofDays(1)));
        // 첫 기록 약 299초: 크라운도 레전드도 아니다 (레전드는 2번부터)
        long first = courseRun(me, course, at, 334, 3.0);
        String a = body(get(me.token, "/api/v1/runs/" + first));
        assertThat((Boolean) JsonPath.read(a, "$.data.verification.crownTaken")).isFalse();
        assertThat((Boolean) JsonPath.read(a, "$.data.verification.legendTaken")).isFalse();
        // 약 225초: 크라운을 가져오고, 2번째 완주로 레전드
        long faster = courseRun(me, course, at, 250, 4.0);
        String b = body(get(me.token, "/api/v1/runs/" + faster));
        assertThat((Boolean) JsonPath.read(b, "$.data.verification.crownTaken")).isTrue();
        assertThat((Boolean) JsonPath.read(b, "$.data.verification.legendTaken")).isTrue();
        assertThat((Integer) JsonPath.read(b, "$.data.verification.legendFinishCount")).isEqualTo(2);
        // 이미 가진 뒤의 기록은 새로 가진 것이 아니다
        long third = courseRun(me, course, at, 334, 3.0);
        String c = body(get(me.token, "/api/v1/runs/" + third));
        assertThat((Boolean) JsonPath.read(c, "$.data.verification.crownTaken")).isFalse();
        assertThat((Boolean) JsonPath.read(c, "$.data.verification.legendTaken")).isFalse();
        // 활동: 크라운 · 레전드 한 번씩 (레전드는 그때 완주 수)
        String feed = body(get(me.token, "/api/v1/activities"));
        List<Map<String, Object>> items = JsonPath.read(feed, "$.data.items");
        assertThat(items.stream().filter(i -> "CROWN".equals(i.get("type")))).hasSize(1);
        List<Map<String, Object>> legends = items.stream().filter(i -> "LEGEND".equals(i.get("type"))).toList();
        assertThat(legends).hasSize(1);
        assertThat(((Number) legends.get(0).get("finishCount")).intValue()).isEqualTo(2);
        assertThat(((Number) legends.get(0).get("courseId")).longValue()).isEqualTo(course);
        // 코스 크라운 API도 나
        String crown = body(get(me.token, "/api/v1/courses/" + course + "/crown"));
        assertThat((Boolean) JsonPath.read(crown, "$.data.me.holder")).isTrue();
        // 라이벌 쪽에서는 크라운을 빼앗겼다 (나보다 느림)
        String r = body(get(rival.token, "/api/v1/courses/" + course + "/crown"));
        assertThat(((Number) JsonPath.read(r, "$.data.holder.userId")).longValue()).isEqualTo(me.id);
        assertThat((Integer) JsonPath.read(r, "$.data.me.gapSec")).isPositive();
    }

    // ── helpers ──

    /** a가 요청하고 b가 승인한다 */
    private void befriend(User a, User b) {
        MvcTestResult r = post(a.token, "/api/v1/friends/requests", "{\"userId\":%d}".formatted(b.id));
        assertThat(r).hasStatusOk();
        long requestId = ((Number) JsonPath.read(body(r), "$.data.requestId")).longValue();
        assertThat(post(b.token, "/api/v1/friends/requests/" + requestId + "/accept", "")).hasStatusOk();
    }

    private User signup() {
        String id = UUID.randomUUID().toString().substring(0, 8);
        MvcTestResult r = post(null, "/api/v1/auth/signup", """
                {"email":"title-%s@dallimo.test","password":"run12345","nickname":"타이틀%s","deviceId":"d"}""".formatted(id, id));
        assertThat(r).hasStatus(201);
        String b = body(r);
        return new User(JsonPath.read(b, "$.data.accessToken"), ((Number) JsonPath.read(b, "$.data.user.userId")).longValue(), "타이틀" + id);
    }

    private static double[] somewhere() {
        ThreadLocalRandom r = ThreadLocalRandom.current();
        return new double[]{r.nextDouble(-60, 60), r.nextDouble(-170, 170)};
    }

    private long course(User owner) {
        return course(owner, somewhere());
    }

    /** 북쪽으로 초속 3m × 300초 기록으로 만든 약 897m 코스 */
    private long course(User owner, double[] at) {
        long source = finishedRun(owner, null, at, 300, 3.0);
        MvcTestResult r = post(owner.token, "/api/v1/courses", """
                {"sourceRunId":%d,"name":"타이틀 코스","tags":[]}""".formatted(source));
        assertThat(r).hasStatus(201);
        return ((Number) JsonPath.read(body(r), "$.data.id")).longValue();
    }

    /** 검증이 만들 공식 기록을 직접 넣는다 (Run 한 줄 + 기록 한 줄) */
    private void record(long courseId, User user, int sec, Instant at) {
        GeneratedKeyHolder key = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement("""
                    INSERT INTO tbl_run (user_id, course_id, client_run_uuid, mode, status, started_at, ended_at, elapsed_seconds, distance_m,
                                         verification_status, created_at, updated_at)
                    VALUES (?, ?, ?, 'COURSE', 'FINISHED', ?, ?, ?, 900, 'VERIFIED', ?, ?)""", Statement.RETURN_GENERATED_KEYS);
            ps.setLong(1, user.id);
            ps.setLong(2, courseId);
            ps.setString(3, UUID.randomUUID().toString());
            ps.setTimestamp(4, Timestamp.from(at.minusSeconds(sec)));
            ps.setTimestamp(5, Timestamp.from(at));
            ps.setInt(6, sec);
            ps.setTimestamp(7, Timestamp.from(at));
            ps.setTimestamp(8, Timestamp.from(at));
            return ps;
        }, key);
        long runId = key.getKey().longValue();
        jdbc.update("""
                INSERT INTO tbl_course_record (course_id, run_id, user_id, duration_seconds, avg_pace_sec_per_km, match_rate, verified_at, created_at)
                VALUES (?, ?, ?, ?, 333, 99.0, ?, ?)""", courseId, runId, user.id, sec, Timestamp.from(at), Timestamp.from(at));
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
        String pts = IntStream.rangeClosed(1, points).mapToObj(s -> """
                {"seq":%d,"latitude":%.7f,"longitude":%.7f,"accuracyM":5.0,"recordedAt":"%s"}"""
                .formatted(s, at[0] + (s - 1) * stepM / 111_195.0, at[1], T0.plusSeconds(s - 1))).collect(Collectors.joining(","));
        assertThat(post(user.token, "/api/v1/runs/" + runId + "/points", """
                {"batchUuid":"%s","fromSeq":1,"toSeq":%d,"points":[%s]}""".formatted(UUID.randomUUID(), points, pts))).hasStatusOk();
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
