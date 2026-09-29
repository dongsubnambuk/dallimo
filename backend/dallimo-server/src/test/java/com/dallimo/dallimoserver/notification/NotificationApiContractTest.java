package com.dallimo.dallimoserver.notification;

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
import java.util.function.Supplier;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 알림 (NTF, 14.2장): 알림함 · 읽음 · Push 토큰 · 설정 · 사용자 결정 알림(친구 요청, 함께 달리기 초대 · 예약 방 취소, 친구가 내 기록을 넘음,
 * 막아낸 도전은 알림함에만). Push는 가짜 발송기(RecordingPushSender)로 누구에게 무엇이 가는지 본다. 밤 시간 규칙은 QuietHoursTest.
 */
abstract class NotificationApiContractTest {

    @Autowired
    MockMvcTester mvc;

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    RecordingPushSender push;

    static final Instant T0 = Instant.parse("2026-09-01T00:00:00Z");

    record User(String token, long id, String name) {
    }

    @Test
    void friendRequestGoesToInboxAndPush() {
        User a = signup("요청"), b = signup("받음"), c = signup("남");
        String bToken = registerToken(b);

        request(a, b);
        List<?> inbox = items(b);
        assertThat(inbox).hasSize(1);
        String n = body(get(b, "/api/v1/notifications"));
        assertThat((String) JsonPath.read(n, "$.data.items[0].type")).isEqualTo("FRIEND_REQUEST");
        assertThat((String) JsonPath.read(n, "$.data.items[0].body")).isEqualTo(a.name + "님이 친구 요청을 보냈어요");
        assertThat((String) JsonPath.read(n, "$.data.items[0].link")).isEqualTo("/my/friends");
        assertThat((Boolean) JsonPath.read(n, "$.data.items[0].read")).isFalse();
        assertThat(unread(b)).isEqualTo(1);
        List<?> pushed = await(() -> push.to(bToken), 1);
        assertThat(push.to(bToken).get(0).title()).isEqualTo("친구 요청");
        assertThat(push.to(bToken).get(0).data()).containsEntry("link", "/my/friends").containsEntry("type", "FRIEND_REQUEST");
        assertThat(pushed).hasSize(1);

        // 같은 요청을 다시 보내도 알림은 하나. 상대가 되받아 친구가 되면 알리지 않는다
        request(a, b);
        request(b, a);
        assertThat(items(b)).hasSize(1);
        assertThat(items(a)).isEmpty();

        // 읽음: 내 알림만
        long id = ((Number) JsonPath.read(n, "$.data.items[0].id")).longValue();
        assertThat(post(c, "/api/v1/notifications/" + id + "/read", "")).hasStatus(404);
        assertThat(post(b, "/api/v1/notifications/" + id + "/read", "")).hasStatus(204);
        assertThat(unread(b)).isZero();
        assertThat(get(null, "/api/v1/notifications")).hasStatus(401);
    }

    @Test
    void settingsOffKeepsInboxButSkipsPush() {
        User a = signup("설정"), b = signup("끔");
        String bToken = registerToken(b);
        String s = body(get(b, "/api/v1/users/me/notification-settings"));
        assertThat(JsonPath.<Boolean>read(s, "$.data.friend")).isTrue();
        assertThat(JsonPath.<Boolean>read(s, "$.data.live")).isTrue();
        assertThat(put(b, "/api/v1/users/me/notification-settings", "{\"friend\":false,\"live\":true,\"record\":true}")).hasStatusOk();
        assertThat(JsonPath.<Boolean>read(body(get(b, "/api/v1/users/me/notification-settings")), "$.data.friend")).isFalse();
        assertThat(put(b, "/api/v1/users/me/notification-settings", "{\"friend\":false}")).hasStatus(400);

        request(a, b);
        assertThat(items(b)).hasSize(1);
        sleep(700);
        assertThat(push.to(bToken)).isEmpty();
    }

    @Test
    void readAllAndCursor() {
        User me = signup("많음");
        for (int i = 0; i < 5; i++) request(signup("보냄" + i), me);
        assertThat(unread(me)).isEqualTo(5);
        MvcTestResult p1 = get(me, "/api/v1/notifications?size=2");
        assertThat(JsonPath.<List<?>>read(body(p1), "$.data.items")).hasSize(2);
        String cursor = JsonPath.read(body(p1), "$.data.nextCursor");
        MvcTestResult p2 = get(me, "/api/v1/notifications?size=2&cursor=" + cursor);
        List<Number> ids1 = JsonPath.read(body(p1), "$.data.items[*].id"), ids2 = JsonPath.read(body(p2), "$.data.items[*].id");
        assertThat(ids2.get(0).longValue()).isLessThan(ids1.get(1).longValue());
        assertThat(get(me, "/api/v1/notifications?cursor=@@")).hasStatus(400);
        assertThat(post(me, "/api/v1/notifications/read-all", "")).hasStatus(204);
        assertThat(unread(me)).isZero();
    }

    @Test
    void liveInviteAndScheduledCancel() {
        User host = signup("방장"), friend = signup("친구");
        befriend(host, friend);
        String token = registerToken(friend);

        long room = room(host, "{\"mode\":\"LIVE_RACE\",\"targetDistanceM\":5000,\"scheduledAt\":\"%s\"}".formatted(Instant.now().plusSeconds(7200)));
        post(host, "/api/v1/live-runs/" + room + "/invite", "{\"userIds\":[%d]}".formatted(friend.id));
        String n = body(get(friend, "/api/v1/notifications"));
        assertThat((String) JsonPath.read(n, "$.data.items[0].type")).isEqualTo("LIVE_INVITE");
        assertThat((String) JsonPath.read(n, "$.data.items[0].body")).isEqualTo(host.name + "님이 5km 레이스에 초대했어요");
        assertThat((String) JsonPath.read(n, "$.data.items[0].link")).isEqualTo("/together/" + room);
        await(() -> push.to(token), 1);

        // 예약한 방 취소는 참가 · 초대된 사람에게 알린다
        assertThat(post(host, "/api/v1/live-runs/" + room + "/cancel", "")).hasStatus(204);
        String c = body(get(friend, "/api/v1/notifications"));
        assertThat((String) JsonPath.read(c, "$.data.items[0].type")).isEqualTo("LIVE_CANCELED");
        assertThat((String) JsonPath.read(c, "$.data.items[0].body")).isEqualTo(host.name + "님이 함께 달리기를 취소했어요 · 5km 레이스");
        assertThat(items(host)).isEmpty();
        await(() -> push.to(token), 2);

        // 예약 없는 방 취소는 알리지 않는다 (대기실에서 바로 보인다)
        long now = room(host, "{\"mode\":\"TIME_ATTACK\",\"targetSeconds\":1800}");
        post(host, "/api/v1/live-runs/" + now + "/invite", "{\"userIds\":[%d]}".formatted(friend.id));
        assertThat((String) JsonPath.read(body(get(friend, "/api/v1/notifications")), "$.data.items[0].body")).isEqualTo(host.name + "님이 30분 타임 어택에 초대했어요");
        post(host, "/api/v1/live-runs/" + now + "/cancel", "");
        assertThat(items(friend)).hasSize(3);
    }

    @Test
    void friendPassingMyRecordNotifiesOnceAndDefendedChallengeIsInboxOnly() {
        User me = signup("기록"), friend = signup("넘는");
        befriend(me, friend);
        String token = registerToken(me);
        double[] at = somewhere();
        long course = course(me, at);
        long myRecord = record(course, me, 260);

        // 친구가 약 299초 → 못 넘음. 약 225초 → 넘음 (알림 1). 다시 더 빨라도 이미 넘었으니 다시 알리지 않는다
        courseRun(friend, course, null, at, 334, 3.0);
        assertThat(items(me)).isEmpty();
        courseRun(friend, course, null, at, 250, 4.0);
        String n = body(get(me, "/api/v1/notifications"));
        assertThat((String) JsonPath.read(n, "$.data.items[0].type")).isEqualTo("RECORD_BEATEN");
        assertThat((String) JsonPath.read(n, "$.data.items[0].body")).startsWith(friend.name + "님이 알림 코스에서 ").endsWith("로 내 기록 4:20을 넘었어요");
        assertThat((String) JsonPath.read(n, "$.data.items[0].link")).isEqualTo("/course/" + course);
        await(() -> push.to(token), 1);
        courseRun(friend, course, null, at, 240, 4.2);
        assertThat(items(me)).hasSize(1);

        // 막아낸 도전: 알림함에만
        long ch = ((Number) JsonPath.read(body(post(friend, "/api/v1/challenges", "{\"targetCourseRecordId\":%d}".formatted(myRecord))), "$.data.id")).longValue();
        courseRun(friend, course, ch, somewhere(), 250, 4.0);
        String d = body(get(me, "/api/v1/notifications"));
        assertThat((String) JsonPath.read(d, "$.data.items[0].type")).isEqualTo("CHALLENGE_DEFENDED");
        sleep(700);
        assertThat(push.to(token)).hasSize(1);
    }

    @Test
    void pushTokensFollowDeviceAndAccount() {
        User a = signup("토큰"), b = signup("옮김"), sender = signup("보냄");
        String shared = "ExponentPushToken[" + UUID.randomUUID() + "]";
        assertThat(put(a, "/api/v1/users/me/push-token", "{\"token\":\"%s\",\"platform\":\"ios\"}".formatted(shared))).hasStatus(204);
        assertThat(put(a, "/api/v1/users/me/push-token", "{\"token\":\"%s\",\"platform\":\"ios\"}".formatted(shared))).hasStatus(204);
        assertThat(put(a, "/api/v1/users/me/push-token", "{\"token\":\"x\",\"platform\":\"web\"}")).hasStatus(400);
        assertThat(tokens(a)).containsExactly(shared);
        // 같은 휴대폰에서 다른 계정으로 로그인하면 토큰이 옮겨 간다
        put(b, "/api/v1/users/me/push-token", "{\"token\":\"%s\",\"platform\":\"ios\"}".formatted(shared));
        assertThat(tokens(a)).isEmpty();
        assertThat(tokens(b)).containsExactly(shared);

        // 기기가 없어진 토큰은 보낸 뒤 지운다
        String gone = "ExponentPushToken[gone-" + UUID.randomUUID() + "]";
        put(a, "/api/v1/users/me/push-token", "{\"token\":\"%s\",\"platform\":\"android\"}".formatted(gone));
        request(sender, a);
        await(() -> push.to(gone), 1);
        for (int i = 0; i < 30 && !tokens(a).isEmpty(); i++) sleep(100);
        assertThat(tokens(a)).isEmpty();

        // 로그아웃하면 이 기기 토큰, 탈퇴하면 모두 지운다
        String t = registerToken(a);
        assertThat(post(a, "/api/v1/auth/logout", "")).hasStatus(204);
        assertThat(tokens(a)).doesNotContain(t);
        assertThat(delete(b, "/api/v1/users/me")).hasStatus(204);
        assertThat(tokens(b)).isEmpty();
    }

    // ── 도우미 ──

    private String registerToken(User u) {
        String token = "ExponentPushToken[" + UUID.randomUUID() + "]";
        assertThat(put(u, "/api/v1/users/me/push-token", "{\"token\":\"%s\",\"platform\":\"android\"}".formatted(token))).hasStatus(204);
        return token;
    }

    private List<String> tokens(User u) {
        return jdbc.queryForList("SELECT token FROM tbl_push_token WHERE user_id = ?", String.class, u.id);
    }

    private List<?> items(User u) {
        return JsonPath.read(body(get(u, "/api/v1/notifications?size=50")), "$.data.items");
    }

    private int unread(User u) {
        return JsonPath.read(body(get(u, "/api/v1/notifications/unread-count")), "$.data.count");
    }

    private static <T> List<T> await(Supplier<List<T>> read, int size) {
        for (int i = 0; i < 50; i++) {
            List<T> v = read.get();
            if (v.size() >= size) {
                assertThat(v).hasSize(size);
                return v;
            }
            sleep(100);
        }
        throw new AssertionError("Push가 오지 않았어요");
    }

    private void request(User a, User b) {
        assertThat(post(a, "/api/v1/friends/requests", "{\"userId\":%d}".formatted(b.id))).hasStatusOk();
    }

    private void befriend(User a, User b) {
        long id = ((Number) JsonPath.read(body(post(a, "/api/v1/friends/requests", "{\"userId\":%d}".formatted(b.id))), "$.data.requestId")).longValue();
        assertThat(post(b, "/api/v1/friends/requests/" + id + "/accept", "")).hasStatusOk();
        // 친구 요청 알림은 이 테스트에서 보지 않는다
        jdbc.update("DELETE FROM tbl_notification WHERE user_id = ?", b.id);
    }

    private long room(User host, String json) {
        MvcTestResult r = post(host, "/api/v1/live-runs", json);
        assertThat(r).hasStatus(201);
        return ((Number) JsonPath.read(body(r), "$.data.id")).longValue();
    }

    private User signup(String nickname) {
        String id = UUID.randomUUID().toString().substring(0, 8);
        String nick = nickname + id;
        MvcTestResult r = post(null, "/api/v1/auth/signup", """
                {"email":"ntf-%s@dallimo.test","password":"run12345","nickname":"%s","deviceId":"phone-%s"}""".formatted(id, nick, id));
        assertThat(r).hasStatus(201);
        String b = body(r);
        return new User(JsonPath.read(b, "$.data.accessToken"), ((Number) JsonPath.read(b, "$.data.user.userId")).longValue(), nick);
    }

    private static double[] somewhere() {
        ThreadLocalRandom r = ThreadLocalRandom.current();
        return new double[]{r.nextDouble(-60, 60), r.nextDouble(-170, 170)};
    }

    private long course(User owner, double[] at) {
        long source = finishedRun(owner, "FREE", null, null, at, 300, 3.0);
        MvcTestResult r = post(owner, "/api/v1/courses", """
                {"sourceRunId":%d,"name":"알림 코스","tags":[]}""".formatted(source));
        assertThat(r).hasStatus(201);
        return ((Number) JsonPath.read(body(r), "$.data.id")).longValue();
    }

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
        return jdbc.queryForObject("SELECT id FROM tbl_course_record WHERE run_id = ?", Long.class, runId);
    }

    private void courseRun(User user, long courseId, Long challengeId, double[] at, int points, double stepM) {
        long runId = finishedRun(user, challengeId == null ? "COURSE" : "CHALLENGE", courseId, challengeId, at, points, stepM);
        for (int i = 0; i < 150; i++) {
            String status = JsonPath.read(body(get(user, "/api/v1/runs/" + runId)), "$.data.summary.verificationStatus");
            if (!"PENDING".equals(status)) return;
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

    private MvcTestResult put(User user, String uri, String json) {
        var req = mvc.put().uri(uri).contentType(MediaType.APPLICATION_JSON).content(json);
        if (user != null) req = req.header("Authorization", "Bearer " + user.token);
        return req.exchange();
    }

    private MvcTestResult delete(User user, String uri) {
        var req = mvc.delete().uri(uri);
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
