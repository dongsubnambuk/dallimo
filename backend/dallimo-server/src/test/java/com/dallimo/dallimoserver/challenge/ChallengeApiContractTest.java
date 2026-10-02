package com.dallimo.dallimoserver.challenge;

import com.dallimo.dallimoserver.ranking.infrastructure.CourseBestProjection;
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
 * 도전 (CHL-001~004, 44장). 친구의 인증 기록을 목표로 만들고, 그 도전으로 달린 Run이 검증되면 서버가 판정한다.
 * MySQL(개발)과 MariaDB(운영) 양쪽에서 같은 결과여야 한다.
 */
abstract class ChallengeApiContractTest {

    @Autowired
    MockMvcTester mvc;

    @Autowired
    JdbcTemplate jdbc;

    static final Instant T0 = Instant.parse("2026-09-01T00:00:00Z");

    record User(String token, long id, String name) {
    }

    @Test
    void onlyFriendsVerifiedRecordsCanBeChallenged() {
        User me = signup("도전"), friend = signup("친구"), stranger = signup("남");
        befriend(me, friend);
        double[] at = somewhere();
        long course = course(friend, at);
        long friendRecord = record(course, friend, 260);
        long strangerRecord = record(course, stranger, 250);
        long myRecord = record(course, me, 300);

        MvcTestResult created = post(me, "/api/v1/challenges", "{\"targetCourseRecordId\":%d}".formatted(friendRecord));
        assertThat(created).hasStatus(201);
        String c = body(created);
        assertThat((String) JsonPath.read(c, "$.data.status")).isEqualTo("OPEN");
        assertThat((String) JsonPath.read(c, "$.data.role")).isEqualTo("SENT");
        assertThat((Integer) JsonPath.read(c, "$.data.targetSec")).isEqualTo(260);
        assertThat((String) JsonPath.read(c, "$.data.target.nickname")).isEqualTo(friend.name);
        assertThat((String) JsonPath.read(c, "$.data.course.name")).isEqualTo("도전 코스");
        long id = ((Number) JsonPath.read(c, "$.data.id")).longValue();

        // 친구 기록만, 내 기록은 PB 어택으로, 없는 기록 404, 로그인 필요
        assertThat(post(me, "/api/v1/challenges", "{\"targetCourseRecordId\":%d}".formatted(strangerRecord))).hasStatus(403);
        assertThat(post(me, "/api/v1/challenges", "{\"targetCourseRecordId\":%d}".formatted(myRecord))).hasStatus(400);
        assertThat(post(me, "/api/v1/challenges", "{\"targetCourseRecordId\":99999999}")).hasStatus(404);
        assertThat(post(me, "/api/v1/challenges", "{}")).hasStatus(400);
        assertThat(post(null, "/api/v1/challenges", "{\"targetCourseRecordId\":%d}".formatted(friendRecord))).hasStatus(401);

        // 받은 사람은 RECEIVED로 본다. 남은 볼 수 없다. 받은 사람에게는 도전한 사람의 Run id가 없다
        String seen = body(get(friend, "/api/v1/challenges/" + id));
        assertThat((String) JsonPath.read(seen, "$.data.role")).isEqualTo("RECEIVED");
        assertThat((String) JsonPath.read(seen, "$.data.challenger.nickname")).isEqualTo(me.name);
        assertThat(get(stranger, "/api/v1/challenges/" + id)).hasStatus(404);
        assertThat(JsonPath.<List<Number>>read(body(get(friend, "/api/v1/challenges")), "$.data[*].id")).extracting(Number::longValue).containsExactly(id);
        assertThat(JsonPath.<List<Number>>read(body(get(me, "/api/v1/challenges?userId=" + friend.id)), "$.data[*].id")).extracting(Number::longValue).containsExactly(id);
        assertThat(JsonPath.<List<?>>read(body(get(me, "/api/v1/challenges?userId=" + stranger.id)), "$.data")).isEmpty();

        // 숨긴 코스는 도전할 수 없다
        long hidden = course(friend, somewhere());
        long hiddenRecord = record(hidden, friend, 200);
        jdbc.update("UPDATE tbl_course SET status = 'HIDDEN' WHERE id = ?", hidden);
        assertThat(post(me, "/api/v1/challenges", "{\"targetCourseRecordId\":%d}".formatted(hiddenRecord))).hasStatus(403);
    }

    @Test
    void verifiedRunFasterThanTargetSucceedsOtherwiseFails() {
        User me = signup("판정"), friend = signup("목표");
        befriend(friend, me);
        double[] at = somewhere();
        long course = course(friend, at);
        long target = record(course, friend, 260);

        // 약 225초로 인증 → 260초보다 빠르다 → 성공
        long win = challenge(me, target);
        long fast = challengeRun(me, course, win, at, 250, 4.0);
        String w = body(get(me, "/api/v1/challenges/" + win));
        assertThat((String) JsonPath.read(w, "$.data.status")).isEqualTo("SUCCESS");
        assertThat((Integer) JsonPath.read(w, "$.data.resultSec")).isLessThan(260);
        assertThat(((Number) JsonPath.read(w, "$.data.runId")).longValue()).isEqualTo(fast);
        assertThat((String) JsonPath.read(w, "$.data.finishedAt")).isNotNull();
        // 러닝 상세에 이 Run의 도전이 붙는다
        String detail = body(get(me, "/api/v1/runs/" + fast));
        assertThat((String) JsonPath.read(detail, "$.data.challenge.status")).isEqualTo("SUCCESS");
        assertThat(((Number) JsonPath.read(detail, "$.data.challenge.id")).longValue()).isEqualTo(win);

        // 약 299초 → 느리다 → 실패
        long lose = challenge(me, target);
        challengeRun(me, course, lose, at, 334, 3.0);
        assertThat((String) JsonPath.read(body(get(me, "/api/v1/challenges/" + lose)), "$.data.status")).isEqualTo("FAILED");

        // 코스를 벗어나 인증되지 않으면 실패
        long off = challenge(me, target);
        challengeRun(me, course, off, somewhere(), 250, 4.0);
        String o = body(get(me, "/api/v1/challenges/" + off));
        assertThat((String) JsonPath.read(o, "$.data.status")).isEqualTo("FAILED");
        assertThat((Object) JsonPath.read(o, "$.data.resultSec")).isNull();

        // 받은 사람도 결과를 본다 (Run id는 없다)
        String r = body(get(friend, "/api/v1/challenges/" + win));
        assertThat((String) JsonPath.read(r, "$.data.status")).isEqualTo("SUCCESS");
        assertThat((Object) JsonPath.read(r, "$.data.runId")).isNull();
    }

    @Test
    void challengeShareLinkShowsVerdictToAnyone() {
        User me = signup("공유"), friend = signup("상대"), stranger = signup("남");
        befriend(me, friend);
        double[] at = somewhere();
        long course = course(friend, at);
        long target = record(course, friend, 260);

        // 달리기 전: 도전 중으로 보인다. 보낸 사람 · 받은 사람만 공유할 수 있다
        long open = challenge(me, target);
        String code = JsonPath.read(body(post(friend, "/api/v1/shares", "{\"type\":\"CHALLENGE\",\"referenceId\":%d}".formatted(open))), "$.data.code");
        String before = body(get(null, "/api/v1/shares/" + code));
        assertThat((String) JsonPath.read(before, "$.data.preview.challengeStatus")).isEqualTo("OPEN");
        assertThat((String) JsonPath.read(before, "$.data.preview.sharerName")).isEqualTo(friend.name);
        assertThat(post(stranger, "/api/v1/shares", "{\"type\":\"CHALLENGE\",\"referenceId\":%d}".formatted(open))).hasStatus(404);

        // 이기면: 받은 사람 누구나 판정 · 기록 · 목표를 본다 (로그인 없이)
        challengeRun(me, course, open, at, 250, 4.0);
        String after = body(get(null, "/api/v1/shares/" + code));
        assertThat((String) JsonPath.read(after, "$.data.type")).isEqualTo("CHALLENGE");
        assertThat((String) JsonPath.read(after, "$.data.preview.challengeStatus")).isEqualTo("SUCCESS");
        assertThat((String) JsonPath.read(after, "$.data.preview.challengerName")).isEqualTo(me.name);
        assertThat((String) JsonPath.read(after, "$.data.preview.challengedName")).isEqualTo(friend.name);
        assertThat((Integer) JsonPath.read(after, "$.data.preview.challengeTargetSec")).isEqualTo(260);
        assertThat((Integer) JsonPath.read(after, "$.data.preview.recordSeconds")).isLessThan(260);
        assertThat((String) JsonPath.read(after, "$.data.preview.courseName")).isEqualTo("도전 코스");
        assertThat(((Number) JsonPath.read(after, "$.data.courseId")).longValue()).isEqualTo(course);
        String page = body(get(null, "/s/" + code));
        assertThat(page).contains(me.name + "님이 " + friend.name + "님의 기록을 넘었어요");

        // 취소한 도전은 공유하지 않는다
        long canceled = challenge(me, target);
        assertThat(post(me, "/api/v1/challenges/" + canceled + "/cancel", "")).hasStatusOk();
        assertThat(post(me, "/api/v1/shares", "{\"type\":\"CHALLENGE\",\"referenceId\":%d}".formatted(canceled))).hasStatus(409);
    }

    @Test
    void cancelOnlyOpenAndRunOnlyAttachesToMatchingChallenge() {
        User me = signup("취소"), friend = signup("상대");
        befriend(me, friend);
        double[] at = somewhere();
        long course = course(friend, at);
        long other = course(friend, somewhere());
        long target = record(course, friend, 260);

        long id = challenge(me, target);
        assertThat(post(friend, "/api/v1/challenges/" + id + "/cancel", "")).hasStatus(403);
        assertThat((String) JsonPath.read(body(post(me, "/api/v1/challenges/" + id + "/cancel", "")), "$.data.status")).isEqualTo("CANCELED");
        assertThat(post(me, "/api/v1/challenges/" + id + "/cancel", "")).hasStatusOk();
        // 취소한 도전은 목록에서 빠지고 Run이 이어지지 않는다
        assertThat(JsonPath.<List<?>>read(body(get(me, "/api/v1/challenges")), "$.data")).isEmpty();
        long runOnCanceled = startRun(me, course, id);
        assertThat(jdbc.queryForObject("SELECT challenger_run_id FROM tbl_challenge WHERE id = ?", Long.class, id)).isNull();

        // 다른 코스 Run은 잇지 않는다 (Run은 그대로 만든다)
        long open = challenge(me, target);
        startRun(me, other, open);
        assertThat((String) JsonPath.read(body(get(me, "/api/v1/challenges/" + open)), "$.data.status")).isEqualTo("OPEN");
        // 같은 코스 Run이 이어지면 RUNNING, 그 뒤에는 취소할 수 없다
        startRun(me, course, open);
        assertThat((String) JsonPath.read(body(get(me, "/api/v1/challenges/" + open)), "$.data.status")).isEqualTo("RUNNING");
        assertThat(post(me, "/api/v1/challenges/" + open + "/cancel", "")).hasStatus(409);
        assertThat(runOnCanceled).isPositive();
    }

    @Test
    void rematchTargetsFriendsCurrentBest() {
        User me = signup("재도전"), friend = signup("기록");
        befriend(me, friend);
        long course = course(friend, somewhere());
        long first = record(course, friend, 260);
        long id = challenge(me, first);
        // 친구가 기록을 줄이면 도전의 목표는 그대로, 재도전 목표(targetBest)는 새 기록
        long better = record(course, friend, 240);
        String c = body(get(me, "/api/v1/challenges/" + id));
        assertThat((Integer) JsonPath.read(c, "$.data.targetSec")).isEqualTo(260);
        assertThat(((Number) JsonPath.read(c, "$.data.targetBest.recordId")).longValue()).isEqualTo(better);
        assertThat((Integer) JsonPath.read(c, "$.data.targetBest.timeSec")).isEqualTo(240);
        // 친구 프로필 · 코스 상세 친구 최고에 도전할 기록 id가 있다
        assertThat(((Number) JsonPath.read(body(get(me, "/api/v1/users/" + friend.id)), "$.data.records[0].recordId")).longValue()).isEqualTo(better);
        assertThat(((Number) JsonPath.read(body(get(me, "/api/v1/courses/" + course)), "$.data.competition.friendBest.recordId")).longValue()).isEqualTo(better);
        // 친구를 끊으면 새 도전은 만들 수 없다
        assertThat(mvc.delete().uri("/api/v1/friends/" + friend.id).header("Authorization", "Bearer " + me.token).exchange()).hasStatus(204);
        assertThat(post(me, "/api/v1/challenges", "{\"targetCourseRecordId\":%d}".formatted(better))).hasStatus(403);
    }

    // ── 도우미 ──

    private long challenge(User me, long recordId) {
        MvcTestResult r = post(me, "/api/v1/challenges", "{\"targetCourseRecordId\":%d}".formatted(recordId));
        assertThat(r).hasStatus(201);
        return ((Number) JsonPath.read(body(r), "$.data.id")).longValue();
    }

    private void befriend(User a, User b) {
        long id = ((Number) JsonPath.read(body(post(a, "/api/v1/friends/requests", "{\"userId\":%d}".formatted(b.id))), "$.data.requestId")).longValue();
        assertThat(post(b, "/api/v1/friends/requests/" + id + "/accept", "")).hasStatusOk();
    }

    private User signup(String nickname) {
        String id = UUID.randomUUID().toString().substring(0, 8);
        String nick = nickname + id;
        MvcTestResult r = post(null, "/api/v1/auth/signup", """
                {"email":"challenge-%s@dallimo.test","password":"run12345","nickname":"%s","deviceId":"d"}""".formatted(id, nick));
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
                {"sourceRunId":%d,"name":"도전 코스","tags":[]}""".formatted(source));
        assertThat(r).hasStatus(201);
        return ((Number) JsonPath.read(body(r), "$.data.id")).longValue();
    }

    /** 검증이 만들 공식 기록을 직접 넣는다 (Run 한 줄 + 기록 한 줄). 기록 id */
    private long record(long courseId, User user, int sec) {
        Instant at = Instant.now();
        String uuid = UUID.randomUUID().toString();
        jdbc.update("""
                INSERT INTO tbl_run (user_id, course_id, client_run_uuid, mode, status, started_at, ended_at, elapsed_seconds, distance_m,
                                     verification_status, created_at, updated_at)
                VALUES (?, ?, ?, 'COURSE', 'FINISHED', ?, ?, ?, 900, 'VERIFIED', ?, ?)""",
                user.id, courseId, uuid, Timestamp.from(at.minusSeconds(sec)), Timestamp.from(at), sec, Timestamp.from(at), Timestamp.from(at));
        long runId = jdbc.queryForObject("SELECT id FROM tbl_run WHERE client_run_uuid = ?", Long.class, uuid);
        jdbc.update("""
                INSERT INTO tbl_course_record (course_id, run_id, user_id, duration_seconds, avg_pace_sec_per_km, match_rate, verified_at, created_at)
                VALUES (?, ?, ?, ?, 333, 99.0, ?, ?)""", courseId, runId, user.id, sec, Timestamp.from(at), Timestamp.from(at));
        jdbc.update(CourseBestProjection.REFRESH, courseId, user.id); // 검증이 같이 고치는 사용자별 최고 기록
        return jdbc.queryForObject("SELECT id FROM tbl_course_record WHERE run_id = ?", Long.class, runId);
    }

    /** 도전으로 코스를 달리고 검증이 끝날 때까지 기다린다 */
    private long challengeRun(User user, long courseId, long challengeId, double[] at, int points, double stepM) {
        long runId = finishedRun(user, "CHALLENGE", courseId, challengeId, at, points, stepM);
        for (int i = 0; i < 150; i++) {
            String status = JsonPath.read(body(get(user, "/api/v1/runs/" + runId)), "$.data.summary.verificationStatus");
            if (!"PENDING".equals(status)) return runId;
            sleep(100);
        }
        throw new AssertionError("검증이 끝나지 않았어요");
    }

    private long startRun(User user, long courseId, long challengeId) {
        MvcTestResult c = post(user, "/api/v1/runs", """
                {"clientRunUuid":"%s","mode":"CHALLENGE","courseId":%d,"challengeId":%d,"startedAt":"%s"}"""
                .formatted(UUID.randomUUID(), courseId, challengeId, T0));
        assertThat(c).hasStatus(201);
        return ((Number) JsonPath.read(body(c), "$.data.runId")).longValue();
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
