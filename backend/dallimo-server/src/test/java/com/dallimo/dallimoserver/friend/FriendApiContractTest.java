package com.dallimo.dallimoserver.friend;

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
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 친구 (FND-001~005, 44장) · 함께 달리기 친구 초대 (TGT-002). MySQL(개발)과 MariaDB(운영) 양쪽에서 같은 결과여야 한다.
 */
abstract class FriendApiContractTest {

    @Autowired
    MockMvcTester mvc;

    @Autowired
    JdbcTemplate jdbc;

    record User(String token, long id, String name, String friendCode) {
    }

    @Test
    void requestAcceptListAndRemove() {
        User a = signup("가"), b = signup("나"), c = signup("다");
        MvcTestResult sent = post(a, "/api/v1/friends/requests", "{\"userId\":%d}".formatted(b.id));
        assertThat(sent).hasStatusOk();
        assertThat((String) JsonPath.read(body(sent), "$.data.relation")).isEqualTo("SENT");
        long requestId = ((Number) JsonPath.read(body(sent), "$.data.requestId")).longValue();
        // 같은 요청을 다시 보내도 한 줄
        assertThat(post(a, "/api/v1/friends/requests", "{\"userId\":%d}".formatted(b.id))).hasStatusOk();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM tbl_friendship WHERE requester_id = ?", Integer.class, a.id)).isEqualTo(1);

        assertThat(JsonPath.<List<Number>>read(body(get(a, "/api/v1/friends/requests")), "$.data.sent[*].userId")).extracting(Number::longValue).containsExactly(b.id);
        String received = body(get(b, "/api/v1/friends/requests"));
        assertThat(JsonPath.<List<Number>>read(received, "$.data.received[*].requestId")).extracting(Number::longValue).containsExactly(requestId);
        assertThat(JsonPath.<List<String>>read(received, "$.data.received[*].nickname")).containsExactly(a.name);
        // 보낸 사람 · 남은 승인할 수 없다 (없는 요청과 같게 404)
        assertThat(post(a, "/api/v1/friends/requests/" + requestId + "/accept", "")).hasStatus(404);
        assertThat(post(c, "/api/v1/friends/requests/" + requestId + "/accept", "")).hasStatus(404);

        MvcTestResult accepted = post(b, "/api/v1/friends/requests/" + requestId + "/accept", "");
        assertThat(accepted).hasStatusOk();
        assertThat((String) JsonPath.read(body(accepted), "$.data.relation")).isEqualTo("FRIEND");
        assertThat(post(b, "/api/v1/friends/requests/" + requestId + "/accept", "")).hasStatusOk();
        assertThat(post(b, "/api/v1/friends/requests/" + requestId + "/reject", "")).hasStatus(409);
        assertThat(friendIds(a)).containsExactly(b.id);
        assertThat(friendIds(b)).containsExactly(a.id);
        assertThat(JsonPath.<List<?>>read(body(get(b, "/api/v1/friends/requests")), "$.data.received")).isEmpty();

        // 삭제는 두 사람 모두에게서 빠진다. 다시 해도 그대로
        assertThat(delete(b, "/api/v1/friends/" + a.id)).hasStatus(204);
        assertThat(delete(b, "/api/v1/friends/" + a.id)).hasStatus(204);
        assertThat(friendIds(a)).isEmpty();
        // 끝난 관계는 새 요청으로 다시 쓴다 (한 줄 유지)
        assertThat((String) JsonPath.read(body(post(b, "/api/v1/friends/requests", "{\"userId\":%d}".formatted(a.id))), "$.data.relation")).isEqualTo("SENT");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM tbl_friendship WHERE user_low_id = ? AND user_high_id = ?", Integer.class,
                Math.min(a.id, b.id), Math.max(a.id, b.id))).isEqualTo(1);
        // 받은 요청을 삭제하면 거절, 보낸 요청을 삭제하면 취소
        assertThat(delete(a, "/api/v1/friends/" + b.id)).hasStatus(204);
        assertThat(status(a, b)).isEqualTo("REJECTED");
        post(a, "/api/v1/friends/requests", "{\"userId\":%d}".formatted(c.id));
        assertThat(delete(a, "/api/v1/friends/" + c.id)).hasStatus(204);
        assertThat(status(a, c)).isEqualTo("CANCELED");
    }

    @Test
    void rejectAndInvalidRequests() {
        User a = signup("거절"), b = signup("받음");
        assertThat(post(a, "/api/v1/friends/requests", "{\"userId\":%d}".formatted(a.id))).hasStatus(400);
        assertThat(post(a, "/api/v1/friends/requests", "{\"userId\":99999999}")).hasStatus(404);
        assertThat(post(a, "/api/v1/friends/requests", "{}")).hasStatus(400);
        assertThat(post(null, "/api/v1/friends/requests", "{\"userId\":%d}".formatted(b.id))).hasStatus(401);
        long id = ((Number) JsonPath.read(body(post(a, "/api/v1/friends/requests", "{\"userId\":%d}".formatted(b.id))), "$.data.requestId")).longValue();
        assertThat(post(b, "/api/v1/friends/requests/" + id + "/reject", "")).hasStatus(204);
        assertThat(post(b, "/api/v1/friends/requests/" + id + "/reject", "")).hasStatus(204);
        assertThat(post(b, "/api/v1/friends/requests/" + id + "/accept", "")).hasStatus(409);
        assertThat(friendIds(a)).isEmpty();
        // 거절은 보낸 사람에게 알리지 않는다: 보낸 목록에서 빠질 뿐
        assertThat(JsonPath.<List<?>>read(body(get(a, "/api/v1/friends/requests")), "$.data.sent")).isEmpty();
        assertThat(post(b, "/api/v1/friends/requests/99999999/accept", "")).hasStatus(404);
    }

    @Test
    void requestingBackMakesFriends() {
        User a = signup("서로"), b = signup("동시");
        post(a, "/api/v1/friends/requests", "{\"userId\":%d}".formatted(b.id));
        assertThat((String) JsonPath.read(body(post(b, "/api/v1/friends/requests", "{\"userId\":%d}".formatted(a.id))), "$.data.relation")).isEqualTo("FRIEND");
        assertThat(friendIds(a)).containsExactly(b.id);
    }

    /** FRD-IT-001: A→B · B→A 동시 요청이어도 관계는 한 줄 */
    @Test
    void simultaneousRequestsMakeOnePair() throws Exception {
        for (int round = 0; round < 5; round++) {
            User a = signup("동시A"), b = signup("동시B");
            CountDownLatch go = new CountDownLatch(1);
            CompletableFuture<Integer> ab = CompletableFuture.supplyAsync(() -> {
                await(go);
                return post(a, "/api/v1/friends/requests", "{\"userId\":%d}".formatted(b.id)).getResponse().getStatus();
            });
            CompletableFuture<Integer> ba = CompletableFuture.supplyAsync(() -> {
                await(go);
                return post(b, "/api/v1/friends/requests", "{\"userId\":%d}".formatted(a.id)).getResponse().getStatus();
            });
            go.countDown();
            assertThat(ab.get()).isEqualTo(200);
            assertThat(ba.get()).isEqualTo(200);
            assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM tbl_friendship WHERE user_low_id = ? AND user_high_id = ?", Integer.class,
                    Math.min(a.id, b.id), Math.max(a.id, b.id))).isEqualTo(1);
            assertThat(status(a, b)).isEqualTo("ACCEPTED");
        }
    }

    @Test
    void searchByNicknameOrFriendCode() {
        String tag = UUID.randomUUID().toString().substring(0, 6);
        User me = signup("찾는" + tag), x = signup("Runner" + tag), y = signup("runnerB" + tag), gone = signup("runner탈퇴" + tag);
        post(me, "/api/v1/friends/requests", "{\"userId\":%d}".formatted(y.id));
        assertThat(delete(gone, "/api/v1/users/me")).hasStatus(204);

        // 닉네임 일부(대소문자 무시). 나와 탈퇴한 사람은 빠진다. 관계가 붙는다
        String r = body(get(me, "/api/v1/users/search?q=RUNNER"));
        List<Number> ids = JsonPath.read(r, "$.data.items[*].userId");
        assertThat(ids).extracting(Number::longValue).contains(x.id, y.id).doesNotContain(me.id, gone.id);
        assertThat(JsonPath.<List<String>>read(r, "$.data.items[?(@.userId == %d)].relation".formatted(y.id))).containsExactly("SENT");
        assertThat(JsonPath.<List<String>>read(r, "$.data.items[?(@.userId == %d)].relation".formatted(x.id))).containsExactly("NONE");
        assertThat(JsonPath.<List<String>>read(body(get(y, "/api/v1/users/search?q=" + tag)), "$.data.items[?(@.userId == %d)].relation".formatted(me.id)))
                .containsExactly("RECEIVED");
        // 친구 코드: 정확히, 소문자 · RUN- 없이도. 코드가 맞는 사람이 맨 앞
        assertThat(firstId(get(me, "/api/v1/users/search?q=" + x.friendCode))).isEqualTo(x.id);
        assertThat(firstId(get(me, "/api/v1/users/search?q=" + x.friendCode.substring(4).toLowerCase()))).isEqualTo(x.id);
        // LIKE 특수 문자는 글자 그대로
        assertThat(JsonPath.<List<?>>read(body(get(me, "/api/v1/users/search?q=%25" + tag)), "$.data.items")).isEmpty();
        // 페이지
        MvcTestResult p1 = get(me, "/api/v1/users/search?size=1&q=unner" + "B" + tag);
        assertThat(JsonPath.<List<?>>read(body(p1), "$.data.items")).hasSize(1);
        assertThat(get(me, "/api/v1/users/search?q=")).hasStatus(400);
        assertThat(get(me, "/api/v1/users/search?q=a&size=51")).hasStatus(400);
        assertThat(get(me, "/api/v1/users/search?q=a&cursor=@@")).hasStatus(400);
        assertThat(get(null, "/api/v1/users/search?q=a")).hasStatus(401);
    }

    @Test
    void profileShowsRecordsOnlyToFriends() {
        User me = signup("프로필"), friend = signup("기록친구"), stranger = signup("모름");
        long course = course(friend);
        record(course, friend, 400, Instant.now().minusSeconds(3600));
        record(course, friend, 380, Instant.now());
        befriend(me, friend);

        String p = body(get(me, "/api/v1/users/" + friend.id));
        assertThat((String) JsonPath.read(p, "$.data.user.relation")).isEqualTo("FRIEND");
        assertThat((String) JsonPath.read(p, "$.data.user.nickname")).isEqualTo(friend.name);
        assertThat(JsonPath.<List<Integer>>read(p, "$.data.records[*].bestSec")).containsExactly(380);
        assertThat(JsonPath.<List<String>>read(p, "$.data.records[*].courseName")).containsExactly("친구 코스");
        assertThat((String) JsonPath.read(p, "$.data.lastRunAt")).isNotNull();
        // 친구가 아니면 이름과 관계만
        String s = body(get(stranger, "/api/v1/users/" + friend.id));
        assertThat((String) JsonPath.read(s, "$.data.user.relation")).isEqualTo("NONE");
        assertThat(JsonPath.<List<?>>read(s, "$.data.records")).isEmpty();
        assertThat((Object) JsonPath.read(s, "$.data.lastRunAt")).isNull();
        // 비공개 코스 기록은 보이지 않는다
        jdbc.update("UPDATE tbl_course SET visibility = 'PRIVATE' WHERE id = ?", course);
        assertThat(JsonPath.<List<?>>read(body(get(me, "/api/v1/users/" + friend.id)), "$.data.records")).isEmpty();
        assertThat(get(me, "/api/v1/users/99999999")).hasStatus(404);
        // 탈퇴하면 친구 목록 · 프로필에서 빠진다
        assertThat(delete(friend, "/api/v1/users/me")).hasStatus(204);
        assertThat(friendIds(me)).isEmpty();
        assertThat(get(me, "/api/v1/users/" + friend.id)).hasStatus(404);
    }

    // ── 함께 달리기 친구 초대 (TGT-002) ──

    @Test
    void hostInvitesFriendsWhoJoinWithoutLink() throws Exception {
        User host = signup("방장"), friend = signup("초대친구"), lazy = signup("안옴"), stranger = signup("남");
        befriend(host, friend);
        befriend(lazy, host);
        long room = ((Number) JsonPath.read(body(post(host, "/api/v1/live-runs", "{\"mode\":\"LIVE_RACE\",\"targetDistanceM\":5000}")), "$.data.id")).longValue();
        String path = "/api/v1/live-runs/" + room;

        // 친구만 초대한다
        assertThat(post(host, path + "/invite", "{\"userIds\":[%d]}".formatted(stranger.id))).hasStatus(403);
        assertThat(post(host, path + "/invite", "{\"userIds\":[]}")).hasStatus(400);
        assertThat(post(stranger, path + "/invite", "{\"userIds\":[%d]}".formatted(friend.id))).hasStatus(403);
        String invited = body(post(host, path + "/invite", "{\"userIds\":[%d,%d,%d]}".formatted(friend.id, lazy.id, friend.id)));
        assertThat(JsonPath.<List<String>>read(invited, "$.data.members[*].status")).containsExactly("JOINED", "INVITED", "INVITED");
        // 다시 초대해도 한 번
        assertThat(post(host, path + "/invite", "{\"userIds\":[%d]}".formatted(friend.id))).hasStatusOk();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM tbl_live_run_member WHERE room_id = ?", Integer.class, room)).isEqualTo(3);

        // 초대받은 친구: 목록에 방이 보이고, 링크 없이 보고 참가한다
        String list = body(get(friend, "/api/v1/live-runs"));
        assertThat(JsonPath.<List<Number>>read(list, "$.data[*].id")).extracting(Number::longValue).contains(room);
        assertThat(JsonPath.<List<String>>read(body(get(friend, path)), "$.data.members[?(@.isMe == true)].status")).containsExactly("INVITED");
        // 초대받은 사람은 참가 전에는 준비 · 초대할 수 없다
        assertThat(post(friend, path + "/ready", "{\"ready\":true}")).hasStatus(409);
        assertThat(post(friend, path + "/invite", "{\"userIds\":[%d]}".formatted(host.id))).hasStatus(409);
        assertThat(post(friend, path + "/join", "")).hasStatusOk();
        assertThat(JsonPath.<List<String>>read(body(get(friend, path)), "$.data.members[?(@.isMe == true)].status")).containsExactly("JOINED");
        // 남은 여전히 링크 없이 볼 수 없다
        assertThat(get(stranger, path)).hasStatus(404);

        // 참가하지 않은 초대는 출발을 막지 않고, 출발하면 방에서 빠진다
        post(host, path + "/ready", "{\"ready\":true}");
        post(friend, path + "/ready", "{\"ready\":true}");
        String status = "";
        for (int i = 0; i < 80 && !"RUNNING".equals(status); i++) {
            Thread.sleep(100);
            status = JsonPath.read(body(get(host, path)), "$.data.status");
        }
        assertThat(status).isEqualTo("RUNNING");
        assertThat(JsonPath.<List<Number>>read(body(get(host, path)), "$.data.members[*].userId")).extracting(Number::longValue).containsExactly(host.id, friend.id);
        assertThat(post(lazy, path + "/join", "")).hasStatus(404);
        assertThat(post(host, path + "/invite", "{\"userIds\":[%d]}".formatted(lazy.id))).hasStatus(409);
    }

    @Test
    void invitedFriendCanDecline() {
        User host = signup("거절방장"), friend = signup("거절친구");
        befriend(host, friend);
        long room = ((Number) JsonPath.read(body(post(host, "/api/v1/live-runs", "{\"mode\":\"TOGETHER\",\"targetDistanceM\":3000}")), "$.data.id")).longValue();
        post(host, "/api/v1/live-runs/" + room + "/invite", "{\"userIds\":[%d]}".formatted(friend.id));
        assertThat(post(friend, "/api/v1/live-runs/" + room + "/leave", "")).hasStatus(204);
        assertThat(JsonPath.<List<?>>read(body(get(friend, "/api/v1/live-runs")), "$.data[?(@.id == %d)]".formatted(room))).isEmpty();
        assertThat(get(friend, "/api/v1/live-runs/" + room)).hasStatus(404);
    }

    // ── 도우미 ──

    private void befriend(User a, User b) {
        long id = ((Number) JsonPath.read(body(post(a, "/api/v1/friends/requests", "{\"userId\":%d}".formatted(b.id))), "$.data.requestId")).longValue();
        assertThat(post(b, "/api/v1/friends/requests/" + id + "/accept", "")).hasStatusOk();
    }

    private List<Long> friendIds(User u) {
        return JsonPath.<List<Number>>read(body(get(u, "/api/v1/friends")), "$.data[*].userId").stream().map(Number::longValue).toList();
    }

    private String status(User a, User b) {
        return jdbc.queryForObject("SELECT status FROM tbl_friendship WHERE user_low_id = ? AND user_high_id = ?", String.class,
                Math.min(a.id, b.id), Math.max(a.id, b.id));
    }

    private static long firstId(MvcTestResult r) {
        return ((Number) JsonPath.read(body(r), "$.data.items[0].userId")).longValue();
    }

    private User signup(String nickname) {
        String id = UUID.randomUUID().toString().substring(0, 8);
        String nick = nickname + id;
        MvcTestResult r = post(null, "/api/v1/auth/signup", """
                {"email":"friend-%s@dallimo.test","password":"run12345","nickname":"%s","deviceId":"d"}""".formatted(id, nick));
        assertThat(r).hasStatus(201);
        String b = body(r);
        return new User(JsonPath.read(b, "$.data.accessToken"), ((Number) JsonPath.read(b, "$.data.user.userId")).longValue(), nick,
                JsonPath.read(b, "$.data.user.friendCode"));
    }

    /** 코스 한 개 (경로는 직접 넣는다. 기록 보기에는 코스 행만 있으면 된다) */
    private long course(User owner) {
        Instant now = Instant.now();
        jdbc.update("""
                INSERT INTO tbl_course (creator_id, name, distance_m, start_lat, start_lng, end_lat, end_lng, status, visibility, created_at, updated_at)
                VALUES (?, '친구 코스', 1000, 37.5, 127.0, 37.51, 127.0, 'NEW', 'PUBLIC', ?, ?)""", owner.id, Timestamp.from(now), Timestamp.from(now));
        return jdbc.queryForObject("SELECT MAX(id) FROM tbl_course WHERE creator_id = ?", Long.class, owner.id);
    }

    /** 검증이 만들 공식 기록을 직접 넣는다 (Run 한 줄 + 기록 한 줄) */
    private void record(long courseId, User user, int sec, Instant at) {
        String uuid = UUID.randomUUID().toString();
        jdbc.update("""
                INSERT INTO tbl_run (user_id, course_id, client_run_uuid, mode, status, started_at, ended_at, elapsed_seconds, distance_m,
                                     verification_status, created_at, updated_at)
                VALUES (?, ?, ?, 'COURSE', 'FINISHED', ?, ?, ?, 1000, 'VERIFIED', ?, ?)""",
                user.id, courseId, uuid, Timestamp.from(at.minusSeconds(sec)), Timestamp.from(at), sec, Timestamp.from(at), Timestamp.from(at));
        long runId = jdbc.queryForObject("SELECT id FROM tbl_run WHERE client_run_uuid = ?", Long.class, uuid);
        jdbc.update("""
                INSERT INTO tbl_course_record (course_id, run_id, user_id, duration_seconds, avg_pace_sec_per_km, match_rate, verified_at, created_at)
                VALUES (?, ?, ?, ?, 333, 99.0, ?, ?)""", courseId, runId, user.id, sec, Timestamp.from(at), Timestamp.from(at));
        jdbc.update(CourseBestProjection.REFRESH, courseId, user.id); // 검증이 같이 고치는 사용자별 최고 기록
    }

    private static void await(CountDownLatch latch) {
        try {
            latch.await();
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

    private MvcTestResult delete(User user, String uri) {
        var req = mvc.delete().uri(uri);
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
