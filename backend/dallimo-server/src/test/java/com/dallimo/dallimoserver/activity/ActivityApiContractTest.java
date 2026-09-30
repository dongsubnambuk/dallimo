package com.dallimo.dallimoserver.activity;

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
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 친구 활동 (ACT-001~002, SCR-M06). 코스 등록 · 첫 기록 · PB · 이번 주 3위 안 · 도전 성공이 활동으로 남고,
 * 친구와 나의 활동을 최근 먼저 본다. MySQL(개발)과 MariaDB(운영) 양쪽에서 같은 결과여야 한다.
 */
abstract class ActivityApiContractTest {

    @Autowired
    MockMvcTester mvc;

    @Autowired
    JdbcTemplate jdbc;

    static final Instant T0 = Instant.parse("2026-09-01T00:00:00Z");

    record User(String token, long id, String name) {
    }

    @Test
    void friendsSeeCourseRecordPbWeeklyAndChallengeActivities() {
        User me = signup("활동"), friend = signup("친구"), stranger = signup("남");
        befriend(me, friend);
        double[] at = somewhere();
        long course = course(friend, at);

        // 첫 공식 기록(약 225초) → PB(이전 없음) + 이번 주 1위 + 코스 크라운(최근 90일 첫 기록)
        verifiedRun(me, course, at, 250, 4.0, "COURSE", null);
        // 느린 기록(약 299초) → 2번째 완주로 로컬 레전드 (124장)
        verifiedRun(me, course, at, 334, 3.0, "COURSE", null);
        // 더 빠른 기록(약 179초) → PB(이전 약 225초). 순위는 그대로 1위라 랭킹 활동은 없다
        verifiedRun(me, course, at, 200, 5.0, "COURSE", null);

        String mine = body(get(me, "/api/v1/activities"));
        assertThat(JsonPath.<List<String>>read(mine, "$.data.items[*].type")).containsExactly("PB", "LEGEND", "CROWN", "WEEKLY_TOP", "PB", "COURSE_CREATED");
        assertThat((Integer) JsonPath.read(mine, "$.data.items[0].previousSec")).isBetween(222, 228);
        assertThat((Integer) JsonPath.read(mine, "$.data.items[0].timeSec")).isBetween(176, 182);
        assertThat((Integer) JsonPath.read(mine, "$.data.items[1].finishCount")).isEqualTo(2);
        assertThat((Integer) JsonPath.read(mine, "$.data.items[2].timeSec")).isBetween(222, 228);
        assertThat((Integer) JsonPath.read(mine, "$.data.items[3].rank")).isEqualTo(1);
        assertThat((Object) JsonPath.read(mine, "$.data.items[4].previousSec")).isNull();
        assertThat((Boolean) JsonPath.read(mine, "$.data.items[0].isMine")).isTrue();
        assertThat((String) JsonPath.read(mine, "$.data.items[5].nickname")).isEqualTo(friend.name);
        assertThat((String) JsonPath.read(mine, "$.data.items[5].courseName")).isEqualTo("활동 코스");
        assertThat(((Number) JsonPath.read(mine, "$.data.items[5].courseId")).longValue()).isEqualTo(course);
        // 코스 등록에는 기록 숫자가 없다 (코스 id와 같은 id의 기록이 있어도)
        assertThat((Object) JsonPath.read(mine, "$.data.items[5].timeSec")).isNull();

        // 도전 성공: 친구 기록 260초에 도전해 약 179초로 인증
        long target = record(course, friend.id, 260);
        long challenge = ((Number) JsonPath.read(body(post(me, "/api/v1/challenges", "{\"targetCourseRecordId\":%d}".formatted(target))), "$.data.id")).longValue();
        verifiedRun(me, course, at, 200, 5.0, "CHALLENGE", challenge);
        String seen = body(get(friend, "/api/v1/activities"));
        assertThat((String) JsonPath.read(seen, "$.data.items[0].type")).isEqualTo("CHALLENGE_WON");
        assertThat((String) JsonPath.read(seen, "$.data.items[0].targetNickname")).isEqualTo(friend.name);
        assertThat((Integer) JsonPath.read(seen, "$.data.items[0].targetSec")).isEqualTo(260);
        assertThat((Boolean) JsonPath.read(seen, "$.data.items[0].targetIsMe")).isTrue();
        assertThat((Boolean) JsonPath.read(body(get(me, "/api/v1/activities")), "$.data.items[0].targetIsMe")).isFalse();
        assertThat((Boolean) JsonPath.read(seen, "$.data.items[0].isMine")).isFalse();

        // 친구가 아니면 보이지 않는다 (내 활동만)
        assertThat(JsonPath.<List<?>>read(body(get(stranger, "/api/v1/activities")), "$.data.items")).isEmpty();
        // 한 개씩 cursor
        String p1 = body(get(friend, "/api/v1/activities?size=1"));
        String p2 = body(get(friend, "/api/v1/activities?size=1&cursor=" + JsonPath.read(p1, "$.data.nextCursor")));
        assertThat((String) JsonPath.read(p2, "$.data.items[0].type")).isEqualTo("PB");
        // 숨긴 코스 활동은 빠진다
        jdbc.update("UPDATE tbl_course SET status = 'HIDDEN' WHERE id = ?", course);
        assertThat(JsonPath.<List<?>>read(body(get(friend, "/api/v1/activities")), "$.data.items")).isEmpty();
        assertThat((Boolean) JsonPath.read(body(get(friend, "/api/v1/activities")), "$.data.hasNext")).isFalse();
        // 로그인 필요, 잘못된 cursor
        assertThat(get(null, "/api/v1/activities")).hasStatus(401);
        assertThat(get(friend, "/api/v1/activities?cursor=zzz")).hasStatus(400);
    }

    @Test
    void rankActivityWhenClimbingIntoWeeklyTop3() {
        User me = signup("순위");
        double[] at = somewhere();
        long course = course(me, at);
        // 이번 주 다른 사람 기록 네 개 (150 · 160 · 170 · 180초)
        for (int sec : new int[]{150, 160, 170, 180}) record(course, signup("앞").id, sec);
        // 약 225초 → 5위: PB만
        verifiedRun(me, course, at, 250, 4.0, "COURSE", null);
        // 약 165초 → 3위로 올라섬: PB + 랭킹. 2번째 완주라 로컬 레전드도 (다른 사람은 1번씩)
        verifiedRun(me, course, at, 185, 5.4, "COURSE", null);
        String b = body(get(me, "/api/v1/activities"));
        assertThat(JsonPath.<List<String>>read(b, "$.data.items[*].type")).containsExactly("LEGEND", "WEEKLY_TOP", "PB", "PB", "COURSE_CREATED");
        assertThat((Integer) JsonPath.read(b, "$.data.items[1].rank")).isEqualTo(3);
    }

    // ── 도우미 ──

    private void befriend(User a, User b) {
        long id = ((Number) JsonPath.read(body(post(a, "/api/v1/friends/requests", "{\"userId\":%d}".formatted(b.id))), "$.data.requestId")).longValue();
        assertThat(post(b, "/api/v1/friends/requests/" + id + "/accept", "")).hasStatusOk();
    }

    private User signup(String nickname) {
        String id = UUID.randomUUID().toString().substring(0, 8);
        String nick = nickname + id;
        MvcTestResult r = post(null, "/api/v1/auth/signup", """
                {"email":"activity-%s@dallimo.test","password":"run12345","nickname":"%s","deviceId":"d"}""".formatted(id, nick));
        assertThat(r).hasStatus(201);
        String b = body(r);
        return new User(JsonPath.read(b, "$.data.accessToken"), ((Number) JsonPath.read(b, "$.data.user.userId")).longValue(), nick);
    }

    private static double[] somewhere() {
        ThreadLocalRandom r = ThreadLocalRandom.current();
        return new double[]{r.nextDouble(-60, 60), r.nextDouble(-170, 170)};
    }

    /** 북쪽으로 초속 3m × 300초 기록으로 만든 약 897m 코스 */
    private long course(User owner, double[] at) {
        long source = finishedRun(owner, "FREE", null, null, at, 300, 3.0);
        MvcTestResult r = post(owner, "/api/v1/courses", """
                {"sourceRunId":%d,"name":"활동 코스","tags":[]}""".formatted(source));
        assertThat(r).hasStatus(201);
        return ((Number) JsonPath.read(body(r), "$.data.id")).longValue();
    }

    /** 공식 기록을 직접 넣는다 (Run 한 줄 + 기록 한 줄). 기록 id */
    private long record(long courseId, long userId, int sec) {
        Instant at = Instant.now();
        String uuid = UUID.randomUUID().toString();
        jdbc.update("""
                INSERT INTO tbl_run (user_id, course_id, client_run_uuid, mode, status, started_at, ended_at, elapsed_seconds, distance_m,
                                     verification_status, created_at, updated_at)
                VALUES (?, ?, ?, 'COURSE', 'FINISHED', ?, ?, ?, 900, 'VERIFIED', ?, ?)""",
                userId, courseId, uuid, Timestamp.from(at.minusSeconds(sec)), Timestamp.from(at), sec, Timestamp.from(at), Timestamp.from(at));
        long runId = jdbc.queryForObject("SELECT id FROM tbl_run WHERE client_run_uuid = ?", Long.class, uuid);
        jdbc.update("""
                INSERT INTO tbl_course_record (course_id, run_id, user_id, duration_seconds, avg_pace_sec_per_km, match_rate, verified_at, created_at)
                VALUES (?, ?, ?, ?, 333, 99.0, ?, ?)""", courseId, runId, userId, sec, Timestamp.from(at), Timestamp.from(at));
        return jdbc.queryForObject("SELECT id FROM tbl_course_record WHERE run_id = ?", Long.class, runId);
    }

    /** 코스를 달리고 검증이 끝날 때까지 기다린다 */
    private void verifiedRun(User user, long courseId, double[] at, int points, double stepM, String mode, Long challengeId) {
        long runId = finishedRun(user, mode, courseId, challengeId, at, points, stepM);
        for (int i = 0; i < 150; i++) {
            String status = JsonPath.read(body(get(user, "/api/v1/runs/" + runId)), "$.data.summary.verificationStatus");
            if ("VERIFIED".equals(status)) return;
            assertThat(status).isEqualTo("PENDING");
            sleep(100);
        }
        throw new AssertionError("검증이 끝나지 않았어요");
    }

    private long finishedRun(User user, String mode, Long courseId, Long challengeId, double[] at, int points, double stepM) {
        MvcTestResult c = post(user, "/api/v1/runs", """
                {"clientRunUuid":"%s","mode":"%s","courseId":%s,"challengeId":%s,"startedAt":"%s"}"""
                .formatted(UUID.randomUUID(), mode, courseId, challengeId, T0));
        assertThat(c).hasStatus(201);
        long runId = ((Number) JsonPath.read(body(c), "$.data.runId")).longValue();
        String pts = IntStream.rangeClosed(1, points).mapToObj(s -> """
                {"seq":%d,"latitude":%.7f,"longitude":%.7f,"accuracyM":5.0,"recordedAt":"%s"}"""
                .formatted(s, at[0] + (s - 1) * stepM / 111_195.0, at[1], T0.plusSeconds(s - 1))).collect(Collectors.joining(","));
        assertThat(post(user, "/api/v1/runs/" + runId + "/points", """
                {"batchUuid":"%s","fromSeq":1,"toSeq":%d,"points":[%s]}""".formatted(UUID.randomUUID(), points, pts))).hasStatusOk();
        assertThat(post(user, "/api/v1/runs/" + runId + "/finish", """
                {"endedAt":"%s","lastSeq":%d,"activeSeconds":%d}""".formatted(T0.plusSeconds(points), points, points))).hasStatusOk();
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
