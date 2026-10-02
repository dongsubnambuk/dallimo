package com.dallimo.dallimoserver.ranking;

import com.dallimo.dallimoserver.ranking.domain.RankingPeriod;
import com.dallimo.dallimoserver.ranking.infrastructure.CourseBestProjection;
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
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 43장 코스 랭킹 (RNK-001~005, 53장 RNK-IT-001 · DB-COMP-002). MySQL(개발)과 MariaDB(운영) 양쪽에서 같은 결과여야 한다.
 * 공식 기록(tbl_course_record)은 검증이 만든다. 여기서는 순위 계산만 보려고 직접 넣는다(마지막 테스트는 실제 검증을 거친다).
 */
abstract class RankingApiContractTest {

    @Autowired
    MockMvcTester mvc;

    @Autowired
    JdbcTemplate jdbc;

    static final Instant T0 = Instant.parse("2026-09-29T00:00:00Z");

    record User(String token, long id, String name) {
    }

    @Test
    void eachUserIsRankedByBestRecord() {
        // RNK-IT-001: 한 사람이 여러 기록이어도 최고 기록 하나만. 같은 기록이면 user_id 순
        User a = signup(), b = signup(), c = signup();
        long course = course(a);
        Instant now = Instant.now();
        record(course, a, 300, now);
        record(course, a, 280, now);
        record(course, a, 320, now);
        record(course, b, 290, now);
        record(course, c, 280, now);
        String body = body(get(a.token, "/api/v1/courses/" + course + "/rankings"));
        List<Map<String, Object>> items = JsonPath.read(body, "$.data.items");
        List<User> tie = List.of(a, c).stream().sorted(Comparator.comparingLong(User::id)).toList();
        assertThat(items).extracting(i -> ((Number) i.get("userId")).longValue()).containsExactly(tie.get(0).id, tie.get(1).id, b.id);
        assertThat(items).extracting(i -> ((Number) i.get("timeSec")).intValue()).containsExactly(280, 280, 290);
        assertThat(items).extracting(i -> ((Number) i.get("rank")).intValue()).containsExactly(1, 2, 3);
        Map<String, Object> mine = items.stream().filter(i -> ((Number) i.get("userId")).longValue() == a.id).findFirst().orElseThrow();
        assertThat(mine).containsEntry("relation", "self").containsEntry("isPB", true).containsEntry("name", a.name);
        // 코스 거리(897m) 기준 페이스
        assertThat(((Number) mine.get("paceSecPerKm")).intValue()).isBetween(310, 315);
        Map<String, Object> other = items.stream().filter(i -> ((Number) i.get("userId")).longValue() == b.id).findFirst().orElseThrow();
        assertThat(other).containsEntry("relation", "normal").containsEntry("isPB", false);
        // 비회원도 본다
        assertThat(JsonPath.<List<?>>read(body(get(null, "/api/v1/courses/" + course + "/rankings")), "$.data.items")).hasSize(3);
    }

    @Test
    void bestRecordProjectionMatchesRecords() {
        // 결정 로그 70항: 사용자별 최고 기록 projection은 원본 GROUP BY와 같다. 같은 시간이면 먼저 세운 기록
        User a = signup(), b = signup();
        long course = course(a);
        Instant now = Instant.now();
        record(course, a, 300, now);
        record(course, a, 280, now);
        record(course, a, 280, now);
        record(course, b, 310, now);
        record(course, b, 330, now);
        List<Map<String, Object>> expected = jdbc.queryForList("""
                SELECT user_id, MIN(duration_seconds) AS best,
                       (SELECT MIN(r.id) FROM tbl_course_record r WHERE r.course_id = c.course_id AND r.user_id = c.user_id
                          AND r.duration_seconds = MIN(c.duration_seconds)) AS record_id
                FROM tbl_course_record c WHERE course_id = ? GROUP BY course_id, user_id ORDER BY user_id""", course);
        List<Map<String, Object>> actual = jdbc.queryForList(
                "SELECT user_id, best_seconds AS best, record_id FROM tbl_course_user_best WHERE course_id = ? ORDER BY user_id", course);
        assertThat(actual).hasSize(2);
        assertThat(actual.toString()).isEqualTo(expected.toString());
        // 랭킹 · 내 순위 · 코스 상세 숫자가 projection을 읽는다
        assertThat(JsonPath.<Integer>read(body(get(b.token, "/api/v1/courses/" + course + "/rankings/me")), "$.data.entry.rank")).isEqualTo(2);
        assertThat(JsonPath.<Integer>read(body(get(b.token, "/api/v1/courses/" + course + "/rankings/me")), "$.data.total")).isEqualTo(2);
    }

    @Test
    void weeklyAndMonthlyFollowKoreanCalendar() {
        // 주간: 한국 시간 월요일 0시, 월간: 1일 0시 (경계 시각은 포함, 1ms 전은 전 기간)
        User me = signup(), last = signup(), inWeek = signup();
        long course = course(me);
        Instant now = Instant.now();
        Instant weekStart = RankingPeriod.WEEKLY.window(now).from();
        Instant monthStart = RankingPeriod.MONTHLY.window(now).from();
        assertThat(weekStart.atZone(RankingPeriod.ZONE).getDayOfWeek()).isEqualTo(java.time.DayOfWeek.MONDAY);
        assertThat(weekStart.atZone(RankingPeriod.ZONE).toLocalTime()).isEqualTo(java.time.LocalTime.MIDNIGHT);
        record(course, inWeek, 300, weekStart);
        record(course, last, 290, weekStart.minusMillis(1));
        record(course, me, 310, monthStart);
        record(course, me, 250, monthStart.minusMillis(1));
        String base = "/api/v1/courses/" + course + "/rankings?period=";
        assertThat(userIds(get(me.token, base + "ALL"))).containsExactly(me.id, last.id, inWeek.id);
        assertThat(userIds(get(me.token, base + "WEEKLY"))).contains(inWeek.id).doesNotContain(last.id);
        List<Long> monthly = userIds(get(me.token, base + "MONTHLY"));
        assertThat(monthly).contains(me.id);
        // 달이 바뀐 첫 주에는 이번 주 시작(월요일)이 지난달이라 이번 주 기록이 월간에 들지 않는다
        if (weekStart.isBefore(monthStart)) assertThat(monthly).doesNotContain(inWeek.id);
        else assertThat(monthly).contains(inWeek.id);
        // 이번 달 내 최고는 310 (250은 지난달)
        List<Map<String, Object>> items = JsonPath.read(body(get(me.token, base + "MONTHLY")), "$.data.items");
        Map<String, Object> mine = items.stream().filter(i -> ((Number) i.get("userId")).longValue() == me.id).findFirst().orElseThrow();
        assertThat(((Number) mine.get("timeSec")).intValue()).isEqualTo(310);
        assertThat(mine).containsEntry("isPB", false);
    }

    @Test
    void cursorAndMyStanding() {
        // RNK-005: 내 위아래 두 명
        List<User> users = new ArrayList<>();
        for (int i = 0; i < 7; i++) users.add(signup());
        User me = users.get(4);
        long course = course(users.get(0));
        Instant now = Instant.now();
        for (int i = 0; i < users.size(); i++) record(course, users.get(i), 300 + i * 10, now);
        String base = "/api/v1/courses/" + course + "/rankings";
        MvcTestResult p1 = get(me.token, base + "?size=3");
        assertThat(ranks(p1)).containsExactly(1, 2, 3);
        MvcTestResult p2 = get(me.token, base + "?size=3&cursor=" + JsonPath.read(body(p1), "$.data.nextCursor"));
        assertThat(ranks(p2)).containsExactly(4, 5, 6);
        MvcTestResult p3 = get(me.token, base + "?size=3&cursor=" + JsonPath.read(body(p2), "$.data.nextCursor"));
        assertThat(ranks(p3)).containsExactly(7);
        assertThat((Boolean) JsonPath.read(body(p3), "$.data.hasNext")).isFalse();

        String s = body(get(me.token, base + "/me"));
        assertThat((Integer) JsonPath.read(s, "$.data.total")).isEqualTo(7);
        assertThat((Integer) JsonPath.read(s, "$.data.entry.rank")).isEqualTo(5);
        assertThat((String) JsonPath.read(s, "$.data.entry.relation")).isEqualTo("self");
        assertThat(JsonPath.<List<Integer>>read(s, "$.data.around[*].rank")).containsExactly(3, 4, 5, 6, 7);
        // 1위는 위가 없다
        assertThat(JsonPath.<List<Integer>>read(body(get(users.get(0).token, base + "/me")), "$.data.around[*].rank")).containsExactly(1, 2, 3);
        // 비회원 · 기록 없는 사람
        assertThat((Object) JsonPath.read(body(get(null, base + "/me")), "$.data.entry")).isNull();
        assertThat((Integer) JsonPath.read(body(get(signup().token, base + "/me")), "$.data.total")).isEqualTo(7);
        // 친구 랭킹 (RNK-004): 친구가 없으면 나 혼자
        assertThat(userIds(get(me.token, base + "?scope=FRIENDS"))).containsExactly(me.id);
        assertThat(JsonPath.<List<?>>read(body(get(null, base + "?scope=FRIENDS")), "$.data.items")).isEmpty();
        // 1위 · 6위와 친구가 되면 셋 안에서 순위를 센다
        befriend(me, users.get(0));
        befriend(users.get(5), me);
        MvcTestResult friends = get(me.token, base + "?scope=FRIENDS");
        assertThat(userIds(friends)).containsExactly(users.get(0).id, me.id, users.get(5).id);
        assertThat(ranks(friends)).containsExactly(1, 2, 3);
        assertThat(JsonPath.<List<String>>read(body(friends), "$.data.items[*].relation")).containsExactly("friend", "self", "friend");
        String fs = body(get(me.token, base + "/me?scope=FRIENDS"));
        assertThat((Integer) JsonPath.read(fs, "$.data.total")).isEqualTo(3);
        assertThat((Integer) JsonPath.read(fs, "$.data.entry.rank")).isEqualTo(2);
        // 코스 상세: 친구 최고 기록 (CRS-104)
        String detail = body(get(me.token, "/api/v1/courses/" + course));
        assertThat((String) JsonPath.read(detail, "$.data.competition.friendBest.name")).isEqualTo(users.get(0).name);
        assertThat((Integer) JsonPath.read(detail, "$.data.competition.friendBest.timeSec")).isEqualTo(300);
        assertThat((Object) JsonPath.read(body(get(users.get(1).token, "/api/v1/courses/" + course)), "$.data.competition.friendBest")).isNull();
        // 전체 랭킹에서도 친구 줄이 보인다
        assertThat(JsonPath.<List<String>>read(body(get(me.token, base + "?size=3")), "$.data.items[*].relation")).containsExactly("friend", "normal", "normal");
        // 잘못된 값 · 볼 수 없는 코스
        assertThat(get(me.token, base + "?cursor=@@")).hasStatus(400);
        assertThat(get(me.token, base + "?period=DAILY")).hasStatus(400);
        assertThat(get(me.token, base + "?size=51")).hasStatus(400);
        assertThat(get(me.token, "/api/v1/courses/99999999/rankings")).hasStatus(404);
        jdbc.update("UPDATE tbl_course SET status = 'HIDDEN' WHERE id = ?", course);
        assertThat(get(me.token, base)).hasStatus(403);
    }

    @Test
    void courseDetailShowsWeeklyTopThreeAndMe() {
        List<User> users = new ArrayList<>();
        for (int i = 0; i < 5; i++) users.add(signup());
        long course = course(users.get(0));
        Instant now = Instant.now();
        for (int i = 0; i < users.size(); i++) record(course, users.get(i), 300 + i * 10, now);
        String d = body(get(users.get(4).token, "/api/v1/courses/" + course));
        assertThat(JsonPath.<List<Integer>>read(d, "$.data.competition.weeklyTop[*].rank")).containsExactly(1, 2, 3);
        assertThat((Integer) JsonPath.read(d, "$.data.competition.myWeeklyRank")).isEqualTo(5);
        assertThat((Integer) JsonPath.read(d, "$.data.competition.myEntry.timeSec")).isEqualTo(340);
        assertThat((Integer) JsonPath.read(d, "$.data.competition.leaderSec")).isEqualTo(300);
        assertThat((Object) JsonPath.read(body(get(null, "/api/v1/courses/" + course)), "$.data.competition.myEntry")).isNull();
    }

    @Test
    void verifiedRunShowsWeeklyRankChange() {
        // RST-003: 검증을 거친 실제 코스 러닝. 라이벌 250초 · 400초가 이번 주에 있다
        User me = signup(), fast = signup(), slow = signup();
        double[] at = somewhere();
        long course = course(me, at);
        record(course, fast, 250, Instant.now());
        record(course, slow, 400, Instant.now());
        // 첫 기록 약 299초 → 이번 주 기록이 없었으니 before null, after 2위
        long first = courseRun(me, course, at, 334, 3.0);
        String a = body(get(me.token, "/api/v1/runs/" + first));
        assertThat((Object) JsonPath.read(a, "$.data.verification.weeklyRankBefore")).isNull();
        assertThat((Integer) JsonPath.read(a, "$.data.verification.weeklyRankAfter")).isEqualTo(2);
        // 약 225초 → 2위에서 1위
        long faster = courseRun(me, course, at, 250, 4.0);
        String b = body(get(me.token, "/api/v1/runs/" + faster));
        assertThat((Integer) JsonPath.read(b, "$.data.verification.weeklyRankBefore")).isEqualTo(2);
        assertThat((Integer) JsonPath.read(b, "$.data.verification.weeklyRankAfter")).isEqualTo(1);
        // RST-004 친구 비교: 친구가 없으면 null, slow와 친구가 되면 slow의 기록
        assertThat((Object) JsonPath.read(b, "$.data.verification.friendBest")).isNull();
        befriend(me, slow);
        String c = body(get(me.token, "/api/v1/runs/" + faster));
        assertThat((String) JsonPath.read(c, "$.data.verification.friendBest.name")).isEqualTo(slow.name);
        assertThat((Integer) JsonPath.read(c, "$.data.verification.friendBest.timeSec")).isEqualTo(400);
    }

    // ── helpers ──

    /** a가 요청하고 b가 승인한다 */
    private void befriend(User a, User b) {
        MvcTestResult r = post(a.token, "/api/v1/friends/requests", "{\"userId\":%d}".formatted(b.id));
        assertThat(r).hasStatusOk();
        long requestId = ((Number) JsonPath.read(body(r), "$.data.requestId")).longValue();
        assertThat(post(b.token, "/api/v1/friends/requests/" + requestId + "/accept", "")).hasStatusOk();
    }

    private List<Long> userIds(MvcTestResult r) {
        return JsonPath.<List<Number>>read(body(r), "$.data.items[*].userId").stream().map(Number::longValue).toList();
    }

    private List<Integer> ranks(MvcTestResult r) {
        return JsonPath.read(body(r), "$.data.items[*].rank");
    }

    private User signup() {
        String id = UUID.randomUUID().toString().substring(0, 8);
        MvcTestResult r = post(null, "/api/v1/auth/signup", """
                {"email":"rank-%s@dallimo.test","password":"run12345","nickname":"순위%s","deviceId":"d"}""".formatted(id, id));
        assertThat(r).hasStatus(201);
        String b = body(r);
        return new User(JsonPath.read(b, "$.data.accessToken"), ((Number) JsonPath.read(b, "$.data.user.userId")).longValue(), "순위" + id);
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
                {"sourceRunId":%d,"name":"랭킹 코스","tags":[]}""".formatted(source));
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
        jdbc.update(CourseBestProjection.REFRESH, courseId, user.id); // 검증이 같이 고치는 사용자별 최고 기록
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
