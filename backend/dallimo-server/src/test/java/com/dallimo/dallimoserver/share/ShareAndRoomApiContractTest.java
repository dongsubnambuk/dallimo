package com.dallimo.dallimoserver.share;

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
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 공유 링크 (SHR-001~004) · 함께 달리기 방 대기실 (45장). MySQL(개발)과 MariaDB(운영) 양쪽에서 같은 결과여야 한다.
 * 초대는 방 초대 링크(share_code)로만 들어온다: 링크 → 방 보기 → 참가 → 준비 → 서버가 출발.
 */
abstract class ShareAndRoomApiContractTest {

    @Autowired
    MockMvcTester mvc;

    @Autowired
    JdbcTemplate jdbc;

    static final Instant T0 = Instant.parse("2026-09-29T00:00:00Z");

    record User(String token, long id, String name) {
    }

    // ── 공유 링크 ──

    @Test
    void runLinkIsStableAndResolvesWithoutPath() {
        User me = signup("<b>러너</b>");
        long run = finishedRun(me, 300);
        MvcTestResult first = post(me, "/api/v1/shares", "{\"type\":\"RUN\",\"referenceId\":%d}".formatted(run));
        assertThat(first).hasStatus(201);
        String code = JsonPath.read(body(first), "$.data.code");
        assertThat(code).matches("[a-z2-9]{10}");
        assertThat((String) JsonPath.read(body(first), "$.data.url")).endsWith("/s/" + code).startsWith("http");
        // 같은 대상은 같은 링크
        assertThat((String) JsonPath.read(body(post(me, "/api/v1/shares", "{\"type\":\"RUN\",\"referenceId\":%d}".formatted(run))), "$.data.code")).isEqualTo(code);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM tbl_share_link WHERE creator_id = ?", Integer.class, me.id)).isEqualTo(1);

        // 로그인 없이 해석. 기록 숫자만, 경로는 없다 (사용자 결정)
        String r = body(get(null, "/api/v1/shares/" + code));
        assertThat((String) JsonPath.read(r, "$.data.type")).isEqualTo("RUN");
        assertThat((String) JsonPath.read(r, "$.data.preview.sharerName")).isEqualTo(me.name);
        assertThat((Integer) JsonPath.read(r, "$.data.preview.distanceM")).isBetween(890, 900);
        assertThat((Integer) JsonPath.read(r, "$.data.preview.elapsedSeconds")).isEqualTo(299);
        assertThat(r).doesNotContain("path").doesNotContain("latitude");
        assertThat(get(null, "/api/v1/shares/nosuchcode1")).hasStatus(404);

        // 공유 페이지: 앱 링크 · 미리보기 태그 · 이름은 escape
        MvcTestResult page = get(null, "/s/" + code);
        assertThat(page).hasStatusOk();
        String html = body(page);
        assertThat(page.getResponse().getContentType()).startsWith("text/html");
        assertThat(html).contains("dallimo://share/" + code).contains("og:title").contains(me.name.replace("<", "&lt;").replace(">", "&gt;") + "님의 달리기 기록").doesNotContain("<b>러너</b>");
        assertThat(html).contains("자유 달리기 · 0.9km · 4:59");
        assertThat(get(null, "/s/nosuchcode1")).hasStatus(404);
        // 이상한 경로는 막는다 (Spring 방화벽 400 또는 코드 형식 404)
        assertThat(get(null, "/s/..%2F..%2Fetc").getResponse().getStatus()).isIn(400, 404);
        // App Link 값이 없으면 확인 파일도 없다 (AppLinksTest에서 값이 있을 때)
        assertThat(get(null, "/.well-known/apple-app-site-association").getResponse().getStatus()).isEqualTo(404);
        assertThat(get(null, "/.well-known/assetlinks.json").getResponse().getStatus()).isEqualTo(404);
    }

    @Test
    void onlyOwnerCanShareAndTypesAreChecked() {
        User me = signup(null), other = signup(null);
        long mine = finishedRun(me, 300);
        assertThat(post(other, "/api/v1/shares", "{\"type\":\"RUN\",\"referenceId\":%d}".formatted(mine))).hasStatus(403);
        assertThat(post(null, "/api/v1/shares", "{\"type\":\"RUN\",\"referenceId\":%d}".formatted(mine))).hasStatus(401);
        // 도전 공유는 보낸 사람 · 받은 사람만 (없거나 남의 도전은 404, ChallengeApiContractTest에서 판정까지 확인)
        assertThat(post(me, "/api/v1/shares", "{\"type\":\"CHALLENGE\",\"referenceId\":99999999}")).hasStatus(404);
        assertThat(post(me, "/api/v1/shares", "{\"type\":\"RUN\",\"referenceId\":99999999}")).hasStatus(404);
        assertThat(post(me, "/api/v1/shares", "{\"type\":\"WHAT\",\"referenceId\":1}")).hasStatus(400);
        // 코스 공유
        long course = course(me, mine);
        String c = body(post(other, "/api/v1/shares", "{\"type\":\"COURSE\",\"referenceId\":%d}".formatted(course)));
        String r = body(get(null, "/api/v1/shares/" + JsonPath.read(c, "$.data.code")));
        assertThat(((Number) JsonPath.read(r, "$.data.courseId")).longValue()).isEqualTo(course);
        assertThat((String) JsonPath.read(r, "$.data.preview.courseName")).isEqualTo("공유 코스");
    }

    // ── 함께 달리기 방: 초대 링크로 참가 ──

    @Test
    void inviteLinkLetsGuestJoinAndServerStartsWhenAllReady() {
        User host = signup(null), guest = signup(null), late = signup(null);
        long room = createRoom(host, "{\"mode\":\"LIVE_RACE\",\"targetDistanceM\":5000}");
        String roomPath = "/api/v1/live-runs/" + room;

        // 방 id만으로는 볼 수 없다
        assertThat(get(guest, roomPath)).hasStatus(404);
        assertThat(post(guest, "/api/v1/shares", "{\"type\":\"LIVE_ROOM\",\"referenceId\":%d}".formatted(room))).hasStatus(403);
        // 방장이 초대 링크를 만든다
        String code = JsonPath.read(body(post(host, "/api/v1/shares", "{\"type\":\"LIVE_ROOM\",\"referenceId\":%d}".formatted(room))), "$.data.code");
        String resolved = body(get(null, "/api/v1/shares/" + code));
        assertThat((String) JsonPath.read(resolved, "$.data.type")).isEqualTo("LIVE_ROOM");
        assertThat(((Number) JsonPath.read(resolved, "$.data.referenceId")).longValue()).isEqualTo(room);
        assertThat((String) JsonPath.read(resolved, "$.data.preview.liveMode")).isEqualTo("LIVE_RACE");
        assertThat((Integer) JsonPath.read(resolved, "$.data.preview.memberCount")).isEqualTo(1);
        assertThat(body(get(null, "/s/" + code))).contains(host.name + "님이 함께 달리기에 초대했어요").contains("5km 레이스");

        // 링크로 보면 내 줄이 INVITED (참가 버튼)
        String seen = body(get(guest, roomPath + "?inviteCode=" + code));
        assertThat(JsonPath.<List<String>>read(seen, "$.data.members[?(@.isMe == true)].status")).containsExactly("INVITED");
        assertThat(post(guest, roomPath + "/join", "{\"inviteCode\":\"wrongcode1\"}")).hasStatus(404);
        String joined = body(post(guest, roomPath + "/join", "{\"inviteCode\":\"%s\"}".formatted(code)));
        assertThat(JsonPath.<List<String>>read(joined, "$.data.members[*].status")).containsExactly("JOINED", "JOINED");
        assertThat(JsonPath.<List<Boolean>>read(joined, "$.data.members[*].isHost")).containsExactly(true, false);
        // 다시 참가해도 한 번
        assertThat(post(guest, roomPath + "/join", "{\"inviteCode\":\"%s\"}".formatted(code))).hasStatusOk();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM tbl_live_run_member WHERE room_id = ?", Integer.class, room)).isEqualTo(2);
        // 참가한 뒤에는 코드 없이 본다, 내 방 목록에도 있다
        assertThat(get(guest, roomPath)).hasStatusOk();
        assertThat(JsonPath.<List<Number>>read(body(get(guest, "/api/v1/live-runs")), "$.data[*].id")).extracting(Number::longValue).contains(room);

        // 둘 다 준비 → READY + 출발 시각 → 5초 뒤 RUNNING (서버가 정한다)
        assertThat((String) JsonPath.read(body(post(host, roomPath + "/ready", "{\"ready\":true}")), "$.data.status")).isEqualTo("WAITING");
        String ready = body(post(guest, roomPath + "/ready", "{\"ready\":true}"));
        assertThat((String) JsonPath.read(ready, "$.data.status")).isEqualTo("READY");
        Instant startsAt = Instant.parse(JsonPath.read(ready, "$.data.startsAt"));
        Instant serverTime = Instant.parse(JsonPath.read(ready, "$.data.serverTime"));
        assertThat(java.time.Duration.between(serverTime, startsAt).toMillis()).isBetween(4000L, 5000L);
        sleep(5300);
        String running = body(get(host, roomPath));
        assertThat((String) JsonPath.read(running, "$.data.status")).isEqualTo("RUNNING");
        assertThat(JsonPath.<List<String>>read(running, "$.data.members[*].status")).containsExactly("RUNNING", "RUNNING");
        // 시작한 방에는 더 못 들어온다 (45.1장)
        assertThat(post(late, roomPath + "/join", "{\"inviteCode\":\"%s\"}".formatted(code))).hasStatus(409);
        // 결과는 실시간 경쟁 단계 전이라 없다
        assertThat(get(host, roomPath + "/result")).hasStatus(404);
        // 달리는 중 나가면 DNF
        assertThat(post(guest, roomPath + "/leave", "")).hasStatus(204);
        assertThat(JsonPath.<List<String>>read(body(get(host, roomPath)), "$.data.members[*].status")).containsExactly("RUNNING", "DNF");
    }

    @Test
    void unreadyLeaveAndCancelBeforeStart() {
        User host = signup(null), guest = signup(null);
        long room = createRoom(host, "{\"mode\":\"TIME_ATTACK\",\"targetSeconds\":1800}");
        String roomPath = "/api/v1/live-runs/" + room;
        String code = JsonPath.read(body(post(host, "/api/v1/shares", "{\"type\":\"LIVE_ROOM\",\"referenceId\":%d}".formatted(room))), "$.data.code");
        post(guest, roomPath + "/join", "{\"inviteCode\":\"%s\"}".formatted(code));
        post(host, roomPath + "/ready", "{}");
        assertThat((String) JsonPath.read(body(post(guest, roomPath + "/ready", "{}")), "$.data.status")).isEqualTo("READY");
        // 출발 전 준비를 풀면 다시 대기
        String back = body(post(guest, roomPath + "/ready", "{\"ready\":false}"));
        assertThat((String) JsonPath.read(back, "$.data.status")).isEqualTo("WAITING");
        assertThat((Object) JsonPath.read(back, "$.data.startsAt")).isNull();
        // 참가자는 나가면 빠지고, 방장은 나가지 않고 취소한다
        assertThat(post(host, roomPath + "/leave", "")).hasStatus(409);
        assertThat(post(guest, roomPath + "/cancel", "")).hasStatus(403);
        assertThat(post(guest, roomPath + "/leave", "")).hasStatus(204);
        assertThat(JsonPath.<List<Map<String, Object>>>read(body(get(host, roomPath)), "$.data.members")).hasSize(1);
        assertThat(post(host, roomPath + "/cancel", "")).hasStatus(204);
        assertThat((String) JsonPath.read(body(get(host, roomPath)), "$.data.status")).isEqualTo("CANCELED");
        assertThat(post(guest, roomPath + "/join", "{\"inviteCode\":\"%s\"}".formatted(code))).hasStatus(409);
        assertThat(JsonPath.<List<Number>>read(body(get(host, "/api/v1/live-runs")), "$.data[*].id")).extracting(Number::longValue).doesNotContain(room);
    }

    @Test
    void roomRulesFollowSpec() {
        User host = signup(null);
        // 45.1장: LIVE_RACE는 목표 거리만, TIME_ATTACK은 목표 시간만
        assertThat(post(host, "/api/v1/live-runs", "{\"mode\":\"LIVE_RACE\",\"targetDistanceM\":5000,\"targetSeconds\":1800}")).hasStatus(400);
        assertThat(post(host, "/api/v1/live-runs", "{\"mode\":\"TIME_ATTACK\"}")).hasStatus(400);
        assertThat(post(host, "/api/v1/live-runs", "{\"mode\":\"TOGETHER\"}")).hasStatus(400);
        assertThat(post(host, "/api/v1/live-runs", "{\"mode\":\"LIVE_RACE\",\"targetDistanceM\":100}")).hasStatus(400);
        assertThat(post(host, "/api/v1/live-runs", "{\"mode\":\"LIVE_RACE\",\"targetDistanceM\":5000,\"scheduledAt\":\"2020-01-01T00:00:00Z\"}")).hasStatus(400);
        assertThat(post(host, "/api/v1/live-runs", "{\"mode\":\"LIVE_RACE\",\"targetDistanceM\":5000,\"courseId\":99999999}")).hasStatus(404);
        assertThat(post(null, "/api/v1/live-runs", "{\"mode\":\"LIVE_RACE\",\"targetDistanceM\":5000}")).hasStatus(401);
        // 예약 시각 전에는 모두 준비해도 출발하지 않는다
        User guest = signup(null);
        String later = Instant.now().plusSeconds(3600).toString();
        long room = createRoom(host, "{\"mode\":\"TOGETHER\",\"targetDistanceM\":3000,\"scheduledAt\":\"%s\"}".formatted(later));
        String code = JsonPath.read(body(post(host, "/api/v1/shares", "{\"type\":\"LIVE_ROOM\",\"referenceId\":%d}".formatted(room))), "$.data.code");
        post(guest, "/api/v1/live-runs/" + room + "/join", "{\"inviteCode\":\"%s\"}".formatted(code));
        post(host, "/api/v1/live-runs/" + room + "/ready", "{}");
        String r = body(post(guest, "/api/v1/live-runs/" + room + "/ready", "{}"));
        assertThat((String) JsonPath.read(r, "$.data.status")).isEqualTo("WAITING");
        assertThat((String) JsonPath.read(r, "$.data.scheduledAt")).isNotNull();
    }

    // ── helpers ──

    private long createRoom(User host, String json) {
        MvcTestResult r = post(host, "/api/v1/live-runs", json);
        assertThat(r).hasStatus(201);
        String b = body(r);
        assertThat(JsonPath.<List<String>>read(b, "$.data.members[*].status")).containsExactly("JOINED");
        return ((Number) JsonPath.read(b, "$.data.id")).longValue();
    }

    private User signup(String nickname) {
        String id = UUID.randomUUID().toString().substring(0, 8);
        String nick = nickname == null ? "공유" + id : nickname + id;
        MvcTestResult r = post(null, "/api/v1/auth/signup", """
                {"email":"share-%s@dallimo.test","password":"run12345","nickname":"%s","deviceId":"d"}""".formatted(id, nick));
        assertThat(r).hasStatus(201);
        String b = body(r);
        return new User(JsonPath.read(b, "$.data.accessToken"), ((Number) JsonPath.read(b, "$.data.user.userId")).longValue(), nick);
    }

    private long course(User owner, long runId) {
        MvcTestResult r = post(owner, "/api/v1/courses", "{\"sourceRunId\":%d,\"name\":\"공유 코스\",\"tags\":[]}".formatted(runId));
        assertThat(r).hasStatus(201);
        return ((Number) JsonPath.read(body(r), "$.data.id")).longValue();
    }

    /** 북쪽으로 초속 3m */
    private long finishedRun(User user, int points) {
        ThreadLocalRandom rnd = ThreadLocalRandom.current();
        double lat = rnd.nextDouble(-60, 60), lng = rnd.nextDouble(-170, 170);
        MvcTestResult c = post(user, "/api/v1/runs", """
                {"clientRunUuid":"%s","mode":"FREE","startedAt":"%s"}""".formatted(UUID.randomUUID(), T0));
        long runId = ((Number) JsonPath.read(body(c), "$.data.runId")).longValue();
        String pts = IntStream.rangeClosed(1, points).mapToObj(s -> """
                {"seq":%d,"latitude":%.7f,"longitude":%.7f,"accuracyM":5.0,"recordedAt":"%s"}"""
                .formatted(s, lat + (s - 1) * 3 / 111_195.0, lng, T0.plusSeconds(s - 1))).collect(Collectors.joining(","));
        post(user, "/api/v1/runs/" + runId + "/points", """
                {"batchUuid":"%s","fromSeq":1,"toSeq":%d,"points":[%s]}""".formatted(UUID.randomUUID(), points, pts));
        post(user, "/api/v1/runs/" + runId + "/finish", """
                {"endedAt":"%s","lastSeq":%d,"activeSeconds":%d}""".formatted(T0.plusSeconds(points), points, points - 1));
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
