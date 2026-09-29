package com.dallimo.dallimoserver.course;

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
 * 43장 Course API. MySQL(개발)과 MariaDB(운영) 양쪽에서 같은 결과여야 한다 (ADR-004).
 * 테스트끼리 같은 DB를 쓰므로 코스마다 다른 위치(무작위)에서 달려 주변 조회가 서로 섞이지 않게 한다.
 */
abstract class CourseApiContractTest {

    @Autowired
    MockMvcTester mvc;

    @Autowired
    JdbcTemplate jdbc;

    static final Instant T0 = Instant.parse("2026-09-29T00:00:00Z");

    // ── 등록 (CREG-004 · 43.1장) ──

    @Test
    void createsCourseFromMyFinishedRun() {
        User me = signup();
        double[] at = somewhere();
        long runId = finishedRun(me.token, at, 700, true);
        MvcTestResult r = createCourse(me.token, runId, "  수성못 새벽 루프 ", "호수 한 바퀴", List.of("평지", "야간 밝음", "평지"));
        assertThat(r).hasStatus(201);
        String b = body(r);
        long courseId = id(b, "$.data.id");
        assertThat((String) JsonPath.read(b, "$.data.name")).isEqualTo("수성못 새벽 루프");
        assertThat((String) JsonPath.read(b, "$.data.status")).isEqualTo("NEW");
        assertThat((String) JsonPath.read(b, "$.data.creatorName")).isEqualTo(me.nickname);
        assertThat(JsonPath.<List<String>>read(b, "$.data.tags")).containsExactly("평지", "야간 밝음");
        // 3m × 699 = 2097m. 10m 간격으로 다시 찍는다
        int distance = JsonPath.read(b, "$.data.distanceM");
        assertThat(distance).isBetween(2090, 2100);
        assertThat((Integer) JsonPath.read(b, "$.data.estimatedSec")).isEqualTo((int) Math.round(distance / 1000.0 * 360));
        assertThat(routeCount(courseId)).isBetween(209, 212);
        assertThat(JsonPath.<List<?>>read(b, "$.data.elevationProfile")).isNotEmpty();
        assertThat((Object) JsonPath.read(b, "$.data.myRecord")).isNull();
        assertThat((Object) JsonPath.read(b, "$.data.competition.leaderSec")).isNull();
        // 코스 경로 전체
        MvcTestResult route = get(null, "/api/v1/courses/" + courseId + "/route");
        assertThat(route).hasStatusOk();
        assertThat(JsonPath.<List<?>>read(body(route), "$.data")).hasSize(routeCount(courseId));
        assertThat((Integer) JsonPath.read(body(route), "$.data[0].seq")).isEqualTo(1);
    }

    @Test
    void createRejectsInvalidSourceRun() {
        User me = signup();
        double[] at = somewhere();
        // 남의 기록
        long others = finishedRun(signup().token, at, 700, false);
        assertThat(createCourse(me.token, others, "코스", null, List.of())).hasStatus(403);
        // 끝나지 않은 기록
        long running = newRun(me.token, null);
        upload(me.token, running, at, 1, 300, false);
        assertThat(createCourse(me.token, running, "코스", null, List.of())).hasStatus(409).bodyJson().extractingPath("$.error.code").isEqualTo("RUN_INVALID_STATE");
        // 짧은 기록 (3m × 99 = 297m)
        long shortRun = finishedRun(me.token, at, 100, false);
        assertThat(createCourse(me.token, shortRun, "코스", null, List.of())).hasStatus(422).bodyJson().extractingPath("$.error.code").isEqualTo("RUN_POINT_INVALID");
        // 없는 기록
        assertThat(createCourse(me.token, 99_999_999L, "코스", null, List.of())).hasStatus(404).bodyJson().extractingPath("$.error.code").isEqualTo("RUN_NOT_FOUND");
        // 입력 검증
        long ok = finishedRun(me.token, at, 700, false);
        assertThat(createCourse(me.token, ok, "   ", null, List.of())).hasStatus(400);
        assertThat(createCourse(me.token, ok, "코스", null, List.of("1", "2", "3", "4", "5", "6", "7"))).hasStatus(400);
        assertThat(createCourse(me.token, ok, "가".repeat(101), null, List.of())).hasStatus(400);
        assertThat(createCourse(null, ok, "코스", null, List.of())).hasStatus(401);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM tbl_course WHERE creator_id = ?", Integer.class, me.userId)).isZero();
    }

    // ── 주변 · 검색 (CRS-001 · 003) ──

    @Test
    void nearbyIsSortedByStartDistanceAndWorksWithoutLogin() {
        User me = signup();
        double[] at = somewhere();
        long near = course(me.token, at, "가까운 코스");
        long far = course(me.token, new double[]{at[0] + 0.02, at[1]}, "먼 코스"); // 약 2.2km 북쪽
        String q = "/api/v1/courses/nearby?lat=%f&lng=%f&radius=%d";
        String b = body(get(null, q.formatted(at[0], at[1], 3000)));
        assertThat(ids(b)).containsExactly(near, far);
        assertThat((Integer) JsonPath.read(b, "$.data.items[0].startDistanceM")).isLessThan(5);
        assertThat((Integer) JsonPath.read(b, "$.data.items[1].startDistanceM")).isBetween(2100, 2300);
        assertThat(JsonPath.<List<?>>read(b, "$.data.items[0].displayRoute").size()).isBetween(2, 101);
        assertThat((Boolean) JsonPath.read(b, "$.data.items[0].bookmarked")).isFalse();
        // 반경 밖은 빠진다
        assertThat(ids(body(get(null, q.formatted(at[0], at[1], 1000))))).containsExactly(near);
        // cursor
        MvcTestResult p1 = get(null, (q + "&size=1").formatted(at[0], at[1], 3000));
        String cursor = JsonPath.read(body(p1), "$.data.nextCursor");
        assertThat(ids(body(p1))).containsExactly(near);
        MvcTestResult p2 = get(null, (q + "&size=1&cursor=" + cursor).formatted(at[0], at[1], 3000));
        assertThat(ids(body(p2))).containsExactly(far);
        assertThat((Boolean) JsonPath.read(body(p2), "$.data.hasNext")).isFalse();
        // 잘못된 값
        assertThat(get(null, q.formatted(91.0, at[1], 3000))).hasStatus(400);
        assertThat(get(null, q.formatted(at[0], at[1], 50_000))).hasStatus(400);
        assertThat(get(null, (q + "&cursor=@@").formatted(at[0], at[1], 3000))).hasStatus(400);
    }

    @Test
    void hiddenAndPrivateCoursesAreNotShown() {
        User me = signup();
        User other = signup();
        double[] at = somewhere();
        long hidden = course(me.token, at, "숨김 코스");
        long secret = course(me.token, at, "비공개 코스");
        jdbc.update("UPDATE tbl_course SET status = 'HIDDEN' WHERE id = ?", hidden);
        jdbc.update("UPDATE tbl_course SET visibility = 'PRIVATE' WHERE id = ?", secret);
        String q = "/api/v1/courses/nearby?lat=%f&lng=%f&radius=1000".formatted(at[0], at[1]);
        assertThat(ids(body(get(other.token, q)))).isEmpty();
        assertThat(ids(body(get(me.token, q)))).containsExactly(secret);
        assertThat(get(other.token, "/api/v1/courses/" + hidden)).hasStatus(403).bodyJson().extractingPath("$.error.code").isEqualTo("RESOURCE_FORBIDDEN");
        assertThat(get(other.token, "/api/v1/courses/" + secret)).hasStatus(403);
        assertThat(get(null, "/api/v1/courses/" + secret)).hasStatus(403);
        assertThat(get(me.token, "/api/v1/courses/" + secret)).hasStatusOk();
        assertThat(get(null, "/api/v1/courses/99999999")).hasStatus(404).bodyJson().extractingPath("$.error.code").isEqualTo("COURSE_NOT_FOUND");
    }

    @Test
    void searchByNameWithCursor() {
        User me = signup();
        String tag = UUID.randomUUID().toString().substring(0, 6);
        long a = course(me.token, somewhere(), "검색" + tag + " 첫째");
        long b = course(me.token, somewhere(), "검색" + tag + " 둘째");
        course(me.token, somewhere(), "100%_" + tag);
        MvcTestResult p1 = search("검색" + tag, "&size=1");
        assertThat(ids(body(p1))).containsExactly(b);
        MvcTestResult p2 = search("검색" + tag, "&size=1&cursor=" + JsonPath.read(body(p1), "$.data.nextCursor"));
        assertThat(ids(body(p2))).containsExactly(a);
        // %, _는 글자 그대로 찾는다
        assertThat(ids(body(search("%_" + tag, "")))).hasSize(1);
        assertThat(ids(body(search("%%" + tag, "")))).isEmpty();
        assertThat(search(" ", "")).hasStatus(400);
    }

    // ── 저장 (CRS-105) · 내 코스 (MY-005) ──

    @Test
    void bookmarkIsIdempotentAndListedInMyCourses() {
        User me = signup();
        User other = signup();
        long mine = course(me.token, somewhere(), "내가 만든 코스");
        long theirs = course(other.token, somewhere(), "남이 만든 코스");
        assertThat(post(me.token, "/api/v1/courses/" + theirs + "/bookmarks", "")).hasStatus(204);
        assertThat(post(me.token, "/api/v1/courses/" + theirs + "/bookmarks", "")).hasStatus(204);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM tbl_course_bookmark WHERE user_id = ?", Integer.class, me.userId)).isEqualTo(1);
        assertThat((Boolean) JsonPath.read(body(get(me.token, "/api/v1/courses/" + theirs)), "$.data.bookmarked")).isTrue();
        assertThat((Boolean) JsonPath.read(body(get(other.token, "/api/v1/courses/" + theirs)), "$.data.bookmarked")).isFalse();
        assertThat(ids(body(get(me.token, "/api/v1/users/me/courses?kind=SAVED")), "$.data")).containsExactly(theirs);
        assertThat(ids(body(get(me.token, "/api/v1/users/me/courses?kind=CREATED")), "$.data")).containsExactly(mine);
        assertThat(ids(body(get(me.token, "/api/v1/users/me/courses?kind=FINISHED")), "$.data")).isEmpty();
        assertThat(delete(me.token, "/api/v1/courses/" + theirs + "/bookmarks")).hasStatus(204);
        assertThat(delete(me.token, "/api/v1/courses/" + theirs + "/bookmarks")).hasStatus(204);
        assertThat(ids(body(get(me.token, "/api/v1/users/me/courses?kind=SAVED")), "$.data")).isEmpty();
        assertThat(post(null, "/api/v1/courses/" + theirs + "/bookmarks", "")).hasStatus(401);
        assertThat(post(me.token, "/api/v1/courses/99999999/bookmarks", "")).hasStatus(404);
        assertThat(get(me.token, "/api/v1/users/me/courses?kind=WRONG")).hasStatus(400);
        assertThat(get(null, "/api/v1/users/me/courses?kind=SAVED")).hasStatus(401);
    }

    // ── 기록 숫자 · 코스 러닝 ──

    @Test
    void statsComeFromOfficialRecordsAndCourseRuns() {
        User me = signup();
        User rival = signup();
        double[] at = somewhere();
        long courseId = course(me.token, at, "기록 코스");
        // 코스 러닝: 서버 코스 id를 주면 검증 대기(PENDING)
        long run = newRun(me.token, courseId);
        upload(me.token, run, at, 1, 700, false);
        String finished = body(finish(me.token, run, 700));
        assertThat((String) JsonPath.read(finished, "$.data.verificationStatus")).isEqualTo("PENDING");
        // 커밋 뒤 완주 검증이 공식 기록을 만든다 (코스 897m를 초속 3m → 약 299초)
        assertThat(awaitVerification(me.token, run)).isEqualTo("VERIFIED");
        // 라이벌 기록은 직접 넣는다
        long rivalRun = finishedRun(rival.token, at, 700, false);
        record(courseId, rivalRun, rival.userId, 250, Instant.now());
        String b = body(get(me.token, "/api/v1/courses/" + courseId));
        assertThat((Integer) JsonPath.read(b, "$.data.competition.leaderSec")).isEqualTo(250);
        assertThat((Integer) JsonPath.read(b, "$.data.finisherCount")).isEqualTo(2);
        assertThat((Integer) JsonPath.read(b, "$.data.myRecord.bestSec")).isBetween(297, 301);
        assertThat((Integer) JsonPath.read(b, "$.data.myRecord.finishCount")).isEqualTo(1);
        // 최근 7일 안에 이 코스를 끝까지 달린 사람 (T0 기준 러닝이라 now()와 떨어져 있으면 0)
        int weekly = JsonPath.read(b, "$.data.weeklyRunnerCount");
        long recent = jdbc.queryForObject("SELECT COUNT(*) FROM tbl_run WHERE course_id = ? AND started_at >= ?", Long.class,
                courseId, Timestamp.from(Instant.now().minusSeconds(7 * 86_400)));
        assertThat(weekly).isEqualTo((int) recent);
        assertThat(ids(body(get(me.token, "/api/v1/users/me/courses?kind=FINISHED")), "$.data")).containsExactly(courseId);
        // 비회원에게는 내 기록이 없다
        assertThat((Object) JsonPath.read(body(get(null, "/api/v1/courses/" + courseId)), "$.data.myRecord")).isNull();
    }

    // ── helpers ──

    record User(String token, long userId, String nickname) {
    }

    private User signup() {
        String id = UUID.randomUUID().toString().substring(0, 8);
        MvcTestResult r = post(null, "/api/v1/auth/signup", """
                {"email":"course-%s@dallimo.test","password":"run12345","nickname":"코스%s","deviceId":"d"}""".formatted(id, id));
        assertThat(r).hasStatus(201);
        String b = body(r);
        return new User(JsonPath.read(b, "$.data.accessToken"), Long.parseLong(JsonPath.read(b, "$.data.user.userId").toString()), "코스" + id);
    }

    /** 다른 테스트와 겹치지 않는 출발 위치 */
    private static double[] somewhere() {
        ThreadLocalRandom r = ThreadLocalRandom.current();
        return new double[]{r.nextDouble(-60, 60), r.nextDouble(-170, 170)};
    }

    private long course(String token, double[] at, String name) {
        MvcTestResult r = createCourse(token, finishedRun(token, at, 300, false), name, null, List.of());
        assertThat(r).hasStatus(201);
        return id(body(r), "$.data.id");
    }

    private MvcTestResult createCourse(String token, long runId, String name, String description, List<String> tags) {
        String tagJson = tags.stream().map(t -> "\"" + t + "\"").collect(Collectors.joining(",", "[", "]"));
        return post(token, "/api/v1/courses", """
                {"sourceRunId":%d,"name":"%s","description":%s,"tags":%s}"""
                .formatted(runId, name, description == null ? "null" : "\"" + description + "\"", tagJson));
    }

    private long finishedRun(String token, double[] at, int points, boolean altitude) {
        long runId = newRun(token, null);
        upload(token, runId, at, 1, points, altitude);
        assertThat(finish(token, runId, points)).hasStatusOk();
        return runId;
    }

    private long newRun(String token, Long courseId) {
        MvcTestResult r = post(token, "/api/v1/runs", """
                {"clientRunUuid":"%s","mode":"%s","courseId":%s,"startedAt":"%s"}"""
                .formatted(UUID.randomUUID(), courseId == null ? "FREE" : "COURSE", courseId, T0));
        assertThat(r).hasStatus(201);
        return id(body(r), "$.data.runId");
    }

    /** seq from..to 점을 북쪽으로 초속 3m (seq 1 = T0), 500개씩 나눠 보낸다 */
    private void upload(String token, long runId, double[] at, int from, int to, boolean altitude) {
        for (int start = from; start <= to; start += 500) {
            int end = Math.min(to, start + 499);
            String pts = IntStream.rangeClosed(start, end).mapToObj(s -> """
                    {"seq":%d,"latitude":%.7f,"longitude":%.7f,"altitudeM":%s,"accuracyM":5.0,"speedMps":3.0,"recordedAt":"%s"}"""
                    .formatted(s, at[0] + (s - 1) * 3 / 111_195.0, at[1], altitude ? String.valueOf(50 + s * 0.02) : "null", T0.plusSeconds(s - 1)))
                    .collect(Collectors.joining(","));
            assertThat(post(token, "/api/v1/runs/" + runId + "/points", """
                    {"batchUuid":"%s","fromSeq":%d,"toSeq":%d,"points":[%s]}""".formatted(UUID.randomUUID(), start, end, pts))).hasStatusOk();
        }
    }

    private MvcTestResult finish(String token, long runId, int lastSeq) {
        return post(token, "/api/v1/runs/" + runId + "/finish", """
                {"endedAt":"%s","lastSeq":%d,"activeSeconds":%d}""".formatted(T0.plusSeconds(lastSeq), lastSeq, lastSeq - 1));
    }

    /** 검증 대기가 끝날 때까지 (최대 15초) */
    private String awaitVerification(String token, long runId) {
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

    private void record(long courseId, long runId, long userId, int sec, Instant at) {
        jdbc.update("""
                INSERT INTO tbl_course_record (course_id, run_id, user_id, duration_seconds, avg_pace_sec_per_km, match_rate, verified_at, created_at)
                VALUES (?, ?, ?, ?, 333, 98.5, ?, ?)""", courseId, runId, userId, sec, Timestamp.from(at), Timestamp.from(at));
    }

    private int routeCount(long courseId) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM tbl_course_route_point WHERE course_id = ?", Integer.class, courseId);
    }

    private static List<Long> ids(String body) {
        return ids(body, "$.data.items");
    }

    private static List<Long> ids(String body, String path) {
        return JsonPath.<List<Number>>read(body, path + "[*].id").stream().map(Number::longValue).toList();
    }

    private static long id(String body, String path) {
        return ((Number) JsonPath.read(body, path)).longValue();
    }

    private MvcTestResult post(String token, String uri, String json) {
        var req = mvc.post().uri(uri).contentType(MediaType.APPLICATION_JSON).content(json);
        if (token != null) req = req.header("Authorization", "Bearer " + token);
        return req.exchange();
    }

    private MvcTestResult search(String query, String rest) {
        return mvc.get().uri(java.net.URI.create("/api/v1/courses/search?query="
                + java.net.URLEncoder.encode(query, StandardCharsets.UTF_8).replace("+", "%20") + rest)).exchange();
    }

    private MvcTestResult delete(String token, String uri) {
        var req = mvc.delete().uri(uri);
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
