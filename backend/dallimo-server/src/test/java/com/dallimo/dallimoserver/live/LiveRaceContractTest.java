package com.dallimo.dallimoserver.live;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.messaging.converter.JacksonJsonMessageConverter;
import org.springframework.messaging.simp.stomp.StompFrameHandler;
import org.springframework.messaging.simp.stomp.StompHeaders;
import org.springframework.messaging.simp.stomp.StompSession;
import org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter;
import org.springframework.web.socket.WebSocketHttpHeaders;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;

import java.lang.reflect.Type;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.function.Predicate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * WBS 11 실시간 경쟁 (8장 · 30장 · 46장, 17.3장 PoC 03). 실제 서버 포트에 STOMP로 붙는다.
 * 마감 · 연결 끊김 시간은 테스트에서 짧게 줄였다 (하위 클래스 @TestPropertySource).
 */
abstract class LiveRaceContractTest {

    @LocalServerPort
    int port;

    @Autowired
    JdbcTemplate jdbc;

    final HttpClient http = HttpClient.newHttpClient();
    final List<StompSession> sessions = new ArrayList<>();

    record User(String token, long id) {
    }

    record Conn(StompSession session, BlockingQueue<Map<String, Object>> topic, BlockingQueue<Map<String, Object>> me) {
    }

    @AfterEach
    void close() {
        sessions.forEach(s -> {
            if (s.isConnected()) s.disconnect();
        });
    }

    @Test
    void raceStatesStaleSeqFinishAndDeadline() throws Exception {
        User host = signup(), guest = signup();
        long room = runningRoom(host, guest, "{\"mode\":\"LIVE_RACE\",\"targetDistanceM\":1000}");
        Conn h = connect(host, room), g = connect(guest, room);

        // 구독하면 최신 snapshot (SYNC_STATE)
        Map<String, Object> sync = await(g.me(), e -> "SYNC_STATE".equals(e.get("type")));
        assertThat(sync.get("status")).isEqualTo("RUNNING");
        assertThat(members(sync)).hasSize(2).allSatisfy(m -> assertThat(m.get("status")).isEqualTo("RUNNING"));

        // 상태를 보내면 방 전체가 받는다
        send(h, room, 1, 300, 100, "RUNNING");
        Map<String, Object> state = await(g.topic(), e -> "MEMBER_STATE".equals(e.get("type")) && distanceOf(e, host.id) == 300);
        assertThat(members(state)).anySatisfy(m -> assertThat(m).containsEntry("userId", (int) host.id).containsEntry("elapsedSec", 100));
        // 30.3장: 같거나 작은 seq는 무시
        send(h, room, 1, 999, 110, "RUNNING");
        send(h, room, 2, 400, 130, "RUNNING");
        Map<String, Object> next = await(g.topic(), e -> "MEMBER_STATE".equals(e.get("type")) && distanceOf(e, host.id) != 300);
        assertThat(distanceOf(next, host.id)).isEqualTo(400);

        // 레이스에서는 응원하지 않는다
        g.session().send("/app/live-runs/" + room + "/cheer", Map.of("toUserId", host.id));
        assertThat(await(g.me(), e -> "ERROR".equals(e.get("type")))).containsEntry("code", "RUN_INVALID_STATE");

        // 완주: 목표 거리에 닿았다
        send(h, room, 3, 1000, 300, "FINISHED");
        Map<String, Object> finished = await(g.topic(), e -> "MEMBER_FINISHED".equals(e.get("type")));
        assertThat(finished).containsEntry("userId", (int) host.id).containsEntry("finishSec", 300);
        // 게스트는 끝내지 못함 → 첫 완주 + 마감 시간(테스트 3초) 뒤 서버가 DNF로 마감
        send(g, room, 1, 500, 280, "RUNNING");
        Map<String, Object> end = await(h.topic(), e -> "ROOM_FINISHED".equals(e.get("type")));
        List<Map<String, Object>> entries = JsonPath.read(end, "$.result.entries");
        assertThat(entries).extracting(e -> e.get("userId"), e -> e.get("rank"), e -> e.get("status"), e -> e.get("timeSec"))
                .containsExactly(org.assertj.core.groups.Tuple.tuple((int) host.id, 1, "FINISHED", 300),
                        org.assertj.core.groups.Tuple.tuple((int) guest.id, null, "DNF", null));

        // REST 결과도 같다 (46.1장 서버 finalization), 방은 FINISHED
        String result = get(guest, "/api/v1/live-runs/" + room + "/result");
        assertThat(JsonPath.<List<Integer>>read(result, "$.data.entries[*].rank")).containsExactly(1, null);
        assertThat(JsonPath.<List<Boolean>>read(result, "$.data.entries[*].isMe")).containsExactly(false, true);
        assertThat((String) JsonPath.read(get(host, "/api/v1/live-runs/" + room), "$.data.status")).isEqualTo("FINISHED");
        assertThat(jdbc.queryForObject("SELECT final_distance_m FROM tbl_live_run_member WHERE room_id = ? AND user_id = ?", Integer.class, room, guest.id))
                .isEqualTo(500);

        // SCR-T01 최근 결과: 끝난 방이 내 순위 · 완주 여부와 함께 나온다
        String hostRecent = get(host, "/api/v1/live-runs/recent");
        assertThat(JsonPath.<List<Integer>>read(hostRecent, "$.data[*].roomId")).containsExactly((int) room);
        assertThat((Integer) JsonPath.read(hostRecent, "$.data[0].myRank")).isEqualTo(1);
        assertThat((Boolean) JsonPath.read(hostRecent, "$.data[0].myFinished")).isTrue();
        assertThat((Integer) JsonPath.read(hostRecent, "$.data[0].memberCount")).isEqualTo(2);
        assertThat((String) JsonPath.read(hostRecent, "$.data[0].mode")).isEqualTo("LIVE_RACE");
        String guestRecent = get(guest, "/api/v1/live-runs/recent");
        assertThat((Object) JsonPath.read(guestRecent, "$.data[0].myRank")).isNull();
        assertThat((Boolean) JsonPath.read(guestRecent, "$.data[0].myFinished")).isFalse();
        // 끝나지 않은 방은 최근 결과에 없다
        User other = signup();
        runningRoom(other, signup(), "{\"mode\":\"LIVE_RACE\",\"targetDistanceM\":1000}");
        assertThat(JsonPath.<List<Object>>read(get(other, "/api/v1/live-runs/recent"), "$.data")).isEmpty();
    }

    @Test
    void disconnectIsShownAndReconnectRestores() throws Exception {
        User host = signup(), guest = signup();
        long room = runningRoom(host, guest, "{\"mode\":\"TOGETHER\",\"targetDistanceM\":3000}");
        Conn h = connect(host, room), g = connect(guest, room);
        await(g.me(), e -> "SYNC_STATE".equals(e.get("type")));
        // 방장만 계속 소식을 보낸다. 게스트는 조용함 → 연결 끊김(테스트 2초)
        long until = System.currentTimeMillis() + 6000;
        Map<String, Object> dropped = null;
        while (System.currentTimeMillis() < until && dropped == null) {
            h.session().send("/app/live-runs/" + room + "/heartbeat", Map.of());
            Map<String, Object> e = h.topic().poll(500, TimeUnit.MILLISECONDS);
            if (e != null && "MEMBER_CONNECTION".equals(e.get("type")) && Boolean.FALSE.equals(e.get("connected"))) dropped = e;
        }
        assertThat(dropped).isNotNull().containsEntry("userId", (int) guest.id);
        Map<String, Object> shown = await(h.topic(), e -> "MEMBER_STATE".equals(e.get("type")));
        assertThat(members(shown)).anySatisfy(m -> assertThat(m).containsEntry("userId", (int) guest.id).containsEntry("status", "DISCONNECTED"));
        // 다시 소식을 보내면 다시 연결됨
        g.session().send("/app/live-runs/" + room + "/heartbeat", Map.of());
        assertThat(await(h.topic(), e -> "MEMBER_CONNECTION".equals(e.get("type")) && Boolean.TRUE.equals(e.get("connected"))))
                .containsEntry("userId", (int) guest.id);

        // 응원: 방 전체가 받는다. 10초 안에 다시 보내면 버린다
        h.session().send("/app/live-runs/" + room + "/cheer", Map.of("toUserId", guest.id));
        Map<String, Object> cheer = await(g.topic(), e -> "CHEER".equals(e.get("type")));
        assertThat(cheer).containsEntry("fromUserId", (int) host.id).containsEntry("toUserId", (int) guest.id);
        assertThat((String) cheer.get("fromName")).isNotBlank();
        h.session().send("/app/live-runs/" + room + "/cheer", Map.of());
        Thread.sleep(800);
        assertThat(g.topic().stream().filter(e -> "CHEER".equals(e.get("type")))).isEmpty();
        // 참가자가 아닌 사람에게는 응원할 수 없다
        g.session().send("/app/live-runs/" + room + "/cheer", Map.of("toUserId", 99999999));
        assertThat(await(g.me(), e -> "ERROR".equals(e.get("type")))).containsEntry("code", "VALIDATION_ERROR");

        // 함께 달리기: 한 명 완주 + 한 명 나감(DNF) → 모두 끝나 바로 마감, 순위 없음
        send(h, room, 1, 3000, 1000, "FINISHED");
        post(guest, "/api/v1/live-runs/" + room + "/leave", "");
        Map<String, Object> end = await(h.topic(), e -> "ROOM_FINISHED".equals(e.get("type")));
        assertThat(JsonPath.<List<Object>>read(end, "$.result.entries[*].rank")).containsOnlyNulls();
        assertThat(JsonPath.<List<String>>read(end, "$.result.entries[*].status")).containsExactlyInAnyOrder("FINISHED", "DNF");
    }

    @Test
    void timeAttackRanksByDistanceAtDeadlineAndLinksPersonalRun() throws Exception {
        User host = signup(), guest = signup();
        long room = runningRoom(host, guest, "{\"mode\":\"TIME_ATTACK\",\"targetSeconds\":300}");
        // 출발을 250초 전으로: 마감(300초 + 1초) 전이라 상태를 받는다
        backdate(room, 250);
        // 개인 Run을 방에 잇는다 (45.1장)
        String created = post(guest, "/api/v1/runs", """
                {"clientRunUuid":"%s","mode":"TIME_ATTACK","liveRoomId":%d,"startedAt":"%s"}""".formatted(UUID.randomUUID(), room, Instant.now()));
        long guestRun = ((Number) JsonPath.read(created, "$.data.runId")).longValue();
        Conn h = connect(host, room), g = connect(guest, room);
        await(h.me(), e -> "SYNC_STATE".equals(e.get("type")));
        send(h, room, 1, 900, 280, "RUNNING");
        send(g, room, 1, 1100, 290, "RUNNING");
        await(h.topic(), e -> "MEMBER_STATE".equals(e.get("type")) && distanceOf(e, guest.id) == 1100 && distanceOf(e, host.id) == 900);
        // 출발을 400초 전으로: 목표 시간(300초) + 마감 여유가 지났다 → 다음 확인 때 거리로 순위
        backdate(room, 400);
        Map<String, Object> end = await(h.topic(), e -> "ROOM_FINISHED".equals(e.get("type")));
        List<Map<String, Object>> entries = JsonPath.read(end, "$.result.entries");
        assertThat(entries).extracting(e -> e.get("userId"), e -> e.get("rank"), e -> e.get("distanceM"))
                .containsExactly(org.assertj.core.groups.Tuple.tuple((int) guest.id, 1, 1100), org.assertj.core.groups.Tuple.tuple((int) host.id, 2, 900));
        assertThat(((Number) JsonPath.read(get(guest, "/api/v1/live-runs/" + room + "/result"), "$.data.myRunId")).longValue()).isEqualTo(guestRun);
    }

    @Test
    void onlyMembersCanConnectToRoom() throws Exception {
        User host = signup(), guest = signup(), stranger = signup();
        long room = runningRoom(host, guest, "{\"mode\":\"LIVE_RACE\",\"targetDistanceM\":1000}");
        // 토큰 없이는 연결되지 않는다
        assertThatThrownBy(() -> connectRaw(null)).isInstanceOf(Exception.class);
        // 참가자가 아니면 방 구독이 끊긴다
        StompSession s = connectRaw(stranger.token);
        BlockingQueue<Map<String, Object>> q = new LinkedBlockingQueue<>();
        s.subscribe("/topic/live-runs/" + room, frames(q));
        long until = System.currentTimeMillis() + 3000;
        while (s.isConnected() && System.currentTimeMillis() < until) Thread.sleep(100);
        assertThat(s.isConnected()).isFalse();
        // 결과는 참가자만, 끝나기 전에는 없음
        assertThat(status(get(stranger, "/api/v1/live-runs/" + room + "/result"))).isEqualTo(404);
        assertThat(status(get(host, "/api/v1/live-runs/" + room + "/result"))).isEqualTo(404);
    }

    // ── helpers ──

    /** 방 만들기 → 초대 링크 → 참가 → 둘 다 준비 → 서버가 출발. 출발 시각은 400초 전으로 당긴다(보내는 시간 값이 잘리지 않게) */
    private long runningRoom(User host, User guest, String json) throws Exception {
        long room = ((Number) JsonPath.read(post(host, "/api/v1/live-runs", json), "$.data.id")).longValue();
        String code = JsonPath.read(post(host, "/api/v1/shares", "{\"type\":\"LIVE_ROOM\",\"referenceId\":%d}".formatted(room)), "$.data.code");
        post(guest, "/api/v1/live-runs/" + room + "/join", "{\"inviteCode\":\"%s\"}".formatted(code));
        post(host, "/api/v1/live-runs/" + room + "/ready", "{}");
        post(guest, "/api/v1/live-runs/" + room + "/ready", "{}");
        long until = System.currentTimeMillis() + 10_000;
        while (System.currentTimeMillis() < until) {
            if ("RUNNING".equals(JsonPath.read(get(host, "/api/v1/live-runs/" + room), "$.data.status"))) break;
            Thread.sleep(300);
        }
        assertThat((String) JsonPath.read(get(host, "/api/v1/live-runs/" + room), "$.data.status")).isEqualTo("RUNNING");
        backdate(room, 400);
        return room;
    }

    /** 출발 시각을 앞으로 당긴다 (서버가 보고된 시간을 출발 뒤 흐른 시간으로 자르므로) */
    private void backdate(long room, int seconds) {
        jdbc.update("UPDATE tbl_live_run_room SET started_at = ? WHERE id = ?", Timestamp.from(Instant.now().minusSeconds(seconds)), room);
    }

    private Conn connect(User user, long room) throws Exception {
        StompSession s = connectRaw(user.token);
        BlockingQueue<Map<String, Object>> me = new LinkedBlockingQueue<>();
        BlockingQueue<Map<String, Object>> topic = new LinkedBlockingQueue<>();
        s.subscribe("/user/queue/live-runs", frames(me));
        Thread.sleep(200);
        s.subscribe("/topic/live-runs/" + room, frames(topic));
        return new Conn(s, topic, me);
    }

    private StompSession connectRaw(String token) throws Exception {
        WebSocketStompClient client = new WebSocketStompClient(new StandardWebSocketClient());
        client.setMessageConverter(new JacksonJsonMessageConverter());
        StompHeaders headers = new StompHeaders();
        if (token != null) headers.add("Authorization", "Bearer " + token);
        StompSession s = client.connectAsync("ws://localhost:" + port + "/ws", new WebSocketHttpHeaders(), headers, new StompSessionHandlerAdapter() {
        }).get(5, TimeUnit.SECONDS);
        sessions.add(s);
        return s;
    }

    private static StompFrameHandler frames(BlockingQueue<Map<String, Object>> q) {
        return new StompFrameHandler() {
            @Override
            public Type getPayloadType(StompHeaders headers) {
                return Map.class;
            }

            @Override
            @SuppressWarnings("unchecked")
            public void handleFrame(StompHeaders headers, Object payload) {
                q.add((Map<String, Object>) payload);
            }
        };
    }

    private static void send(Conn c, long room, long seq, int distance, int elapsed, String status) {
        c.session().send("/app/live-runs/" + room + "/state", Map.of("type", "RUN_STATE", "seq", seq, "distanceM", distance,
                "elapsedSeconds", elapsed, "currentPaceSecPerKm", 330, "status", status, "sentAt", Instant.now().toString()));
    }

    private static Map<String, Object> await(BlockingQueue<Map<String, Object>> q, Predicate<Map<String, Object>> match) throws InterruptedException {
        long until = System.currentTimeMillis() + 10_000;
        while (System.currentTimeMillis() < until) {
            Map<String, Object> e = q.poll(200, TimeUnit.MILLISECONDS);
            if (e != null && match.test(e)) return e;
        }
        throw new AssertionError("기다린 메시지가 오지 않았어요");
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> members(Map<String, Object> e) {
        return (List<Map<String, Object>>) e.get("members");
    }

    private static int distanceOf(Map<String, Object> e, long userId) {
        return members(e).stream().filter(m -> ((Number) m.get("userId")).longValue() == userId)
                .map(m -> ((Number) m.get("distanceM")).intValue()).findFirst().orElse(-1);
    }

    private User signup() throws Exception {
        String id = UUID.randomUUID().toString().substring(0, 8);
        String b = post(null, "/api/v1/auth/signup", """
                {"email":"live-%s@dallimo.test","password":"run12345","nickname":"라이브%s","deviceId":"d"}""".formatted(id, id));
        return new User(JsonPath.read(b, "$.data.accessToken"), ((Number) JsonPath.read(b, "$.data.user.userId")).longValue());
    }

    private String post(User user, String path, String json) throws Exception {
        var req = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path)).header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json));
        if (user != null) req.header("Authorization", "Bearer " + user.token);
        HttpResponse<String> r = http.send(req.build(), HttpResponse.BodyHandlers.ofString());
        assertThat(r.statusCode()).as(path + " " + r.body()).isLessThan(300);
        return r.body();
    }

    private String get(User user, String path) throws Exception {
        return http.send(HttpRequest.newBuilder(URI.create("http://localhost:" + port + path)).header("Authorization", "Bearer " + user.token).build(),
                HttpResponse.BodyHandlers.ofString()).body();
    }

    private int status(String body) {
        return body.contains("\"success\":false") ? (body.contains("RESOURCE_NOT_FOUND") || body.contains("NOT_FOUND") ? 404 : 400) : 200;
    }
}
