package com.dallimo.dallimoserver.admin;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 관리 웹 (FOUNDATION-DECISION-LOG 85항): 관리자 계정 로그인 · 회원 조회 · 정지 · 해제 · 조치 기록, 신고 검토 화면 정보.
 * MySQL(개발)과 MariaDB(운영) 양쪽에서 같은 결과여야 한다.
 */
@TestPropertySource(properties = "dallimo.admin.api-key=" + AdminUserApiContractTest.KEY)
abstract class AdminUserApiContractTest {

    static final String KEY = "admin-web-key";
    // 서버가 켜질 때 만드는 관리자 계정 (AdminAccountService, FOUNDATION-DECISION-LOG 86항)
    static final String BOSS = "admin@naver.com";
    static final String BOSS_PASSWORD = "admin2026x";
    static final Instant T0 = Instant.parse("2026-10-07T00:00:00Z");

    @Autowired
    MockMvcTester mvc;

    record User(String token, long id, String email, String nickname) {
    }

    @Test
    void adminLooksUpSuspendsAndRestoresUser() {
        User boss = bossLogin();
        User runner = signup("run");
        User reporter = signup("rep");
        long course = course(runner);
        assertThat(post(reporter.token, "/api/v1/courses/" + course + "/reports", "{\"reason\":\"DANGER\",\"content\":\"공사 중\"}")).hasStatus(204);

        // 관리자 확인: 관리자 계정 · 관리 키만
        assertThat(get(null, "/api/v1/admin/me")).hasStatus(403);
        assertThat(get(runner.token, "/api/v1/admin/me")).hasStatus(403);
        String me = body(get(boss.token, "/api/v1/admin/me"));
        assertThat(((Number) JsonPath.read(me, "$.data.userId")).longValue()).isEqualTo(boss.id);
        assertThat((String) JsonPath.read(me, "$.data.nickname")).isEqualTo(boss.nickname);
        assertThat((Object) JsonPath.read(body(key("GET", "/api/v1/admin/me", null)), "$.data.userId")).isNull();
        assertThat(get(runner.token, "/api/v1/admin/users")).hasStatus(403);
        // 같은 이메일로 앱에 가입해도 관리자가 아니다
        MvcTestResult same = post(null, "/api/v1/auth/signup", """
                {"email":"%s","password":"run12345","nickname":"사칭%s","deviceId":"d"}""".formatted(BOSS, UUID.randomUUID().toString().substring(0, 6)));
        if (same.getResponse().getStatus() == 409) same = login(BOSS, "run12345");
        assertThat(get(JsonPath.read(body(same), "$.data.accessToken"), "/api/v1/admin/me")).hasStatus(403);

        // 검색: 닉네임 일부 · 이메일 · 회원 id
        assertThat(searchIds(boss, "q=" + runner.nickname.substring(3))).contains(runner.id).doesNotContain(reporter.id);
        assertThat(searchIds(boss, "q=" + runner.email)).containsExactly(runner.id);
        assertThat(searchIds(boss, "q=" + runner.id)).contains(runner.id);
        assertThat(searchIds(boss, "q=%25")).doesNotContain(runner.id);
        String found = body(get(boss.token, "/api/v1/admin/users?q=" + runner.email));
        assertThat((String) JsonPath.read(found, "$.data.items[0].email")).isEqualTo(runner.email);
        assertThat((String) JsonPath.read(found, "$.data.items[0].status")).isEqualTo("ACTIVE");
        assertThat(((Number) JsonPath.read(found, "$.data.items[0].runCount")).intValue()).isEqualTo(1);
        assertThat((Object) JsonPath.read(found, "$.data.items[0].lastActiveAt")).isNotNull();

        // 최근 가입 순 · 다음 페이지
        String page1 = body(get(boss.token, "/api/v1/admin/users?size=1"));
        assertThat((Boolean) JsonPath.read(page1, "$.data.hasNext")).isTrue();
        long first = ((Number) JsonPath.read(page1, "$.data.items[0].id")).longValue();
        String page2 = body(get(boss.token, "/api/v1/admin/users?size=1&cursor=" + JsonPath.read(page1, "$.data.nextCursor")));
        assertThat(((Number) JsonPath.read(page2, "$.data.items[0].id")).longValue()).isLessThan(first);
        assertThat(get(boss.token, "/api/v1/admin/users?cursor=abc")).hasStatus(400);
        assertThat(get(boss.token, "/api/v1/admin/users?status=DELETED")).hasStatus(400);

        // 상세: 계정 · 통계 · 기기 · 달리기 · 만든 코스 · 받은 신고
        String detail = body(get(boss.token, "/api/v1/admin/users/" + runner.id));
        assertThat((String) JsonPath.read(detail, "$.data.account.email")).isEqualTo(runner.email);
        assertThat(((Number) JsonPath.read(detail, "$.data.stats.finishedRuns")).intValue()).isEqualTo(1);
        assertThat(((Number) JsonPath.read(detail, "$.data.stats.createdCourses")).intValue()).isEqualTo(1);
        assertThat((List<?>) JsonPath.read(detail, "$.data.devices")).hasSize(1);
        assertThat((String) JsonPath.read(detail, "$.data.runs[0].status")).isEqualTo("FINISHED");
        assertThat(((Number) JsonPath.read(detail, "$.data.runs[0].distanceM")).intValue()).isGreaterThan(800);
        assertThat(((Number) JsonPath.read(detail, "$.data.courses[0].totalReports")).intValue()).isEqualTo(1);
        assertThat((String) JsonPath.read(detail, "$.data.reportsReceived[0].reporterNickname")).isEqualTo(reporter.nickname);
        assertThat((String) JsonPath.read(detail, "$.data.reportsReceived[0].content")).isEqualTo("공사 중");
        String reporterDetail = body(get(boss.token, "/api/v1/admin/users/" + reporter.id));
        assertThat(((Number) JsonPath.read(reporterDetail, "$.data.reportsMade[0].courseId")).longValue()).isEqualTo(course);
        assertThat(get(boss.token, "/api/v1/admin/users/999999999")).hasStatus(404);
        // 관리자 계정은 회원 목록 · 상세에 없다
        assertThat(searchIds(boss, "q=" + boss.id)).doesNotContain(boss.id);
        assertThat(get(boss.token, "/api/v1/admin/users/" + boss.id)).hasStatus(404);

        // 정지: 사유 필수. 바로 로그아웃, 다시 로그인하면 정지 안내 (비밀번호가 틀리면 그대로 로그인 실패)
        assertThat(post(boss.token, "/api/v1/admin/users/" + runner.id + "/suspend", "{\"reason\":\" \"}")).hasStatus(400);
        String suspended = body(post(boss.token, "/api/v1/admin/users/" + runner.id + "/suspend", "{\"reason\":\"허위 코스 반복 등록\"}"));
        assertThat((String) JsonPath.read(suspended, "$.data.status")).isEqualTo("SUSPENDED");
        assertThat(get(runner.token, "/api/v1/users/me")).hasStatus(401);
        assertThat(login(runner.email, "run12345")).hasStatus(403).bodyJson().extractingPath("$.error.code").isEqualTo("ACCOUNT_SUSPENDED");
        assertThat(login(runner.email, "wrong-pass")).hasStatus(401).bodyJson().extractingPath("$.error.code").isEqualTo("INVALID_CREDENTIALS");
        assertThat(post(boss.token, "/api/v1/admin/users/" + runner.id + "/suspend", "{\"reason\":\"again\"}")).hasStatus(409);
        assertThat(post(boss.token, "/api/v1/admin/users/" + boss.id + "/suspend", "{\"reason\":\"self\"}")).hasStatus(404);
        assertThat(post(boss.token, "/api/v1/admin/users/" + reporter.id + "/unsuspend", "{\"reason\":\"x\"}")).hasStatus(409);
        assertThat(searchIds(boss, "status=SUSPENDED&size=100")).contains(runner.id).doesNotContain(reporter.id);
        // 정지해도 코스는 남는다
        assertThat(get(null, "/api/v1/courses/" + course)).hasStatusOk();

        // 해제 → 다시 로그인. 조치 기록은 최근 먼저, 누가 했는지 남는다
        assertThat((String) JsonPath.read(body(post(boss.token, "/api/v1/admin/users/" + runner.id + "/unsuspend", "{\"reason\":\"소명 확인\"}")),
                "$.data.status")).isEqualTo("ACTIVE");
        assertThat(login(runner.email, "run12345")).hasStatusOk();
        String actions = body(get(boss.token, "/api/v1/admin/users/" + runner.id));
        assertThat((List<String>) JsonPath.read(actions, "$.data.actions[*].action")).containsExactly("USER_UNSUSPEND", "USER_SUSPEND");
        assertThat((String) JsonPath.read(actions, "$.data.actions[1].reason")).isEqualTo("허위 코스 반복 등록");
        assertThat((String) JsonPath.read(actions, "$.data.actions[1].actor")).isEqualTo("user:" + boss.id);
        assertThat((String) JsonPath.read(actions, "$.data.actions[1].actorName")).isEqualTo(boss.nickname);

        // 관리 키로도 조치할 수 있다 (actor = key)
        assertThat(key("POST", "/api/v1/admin/users/" + runner.id + "/suspend", "{\"reason\":\"스크립트\"}")).hasStatusOk();
        assertThat((String) JsonPath.read(body(get(boss.token, "/api/v1/admin/users/" + runner.id)), "$.data.actions[0].actor")).isEqualTo("key");

        // 신고 검토: 관리자 계정으로 목록 · 상세(이름 · 만든 사람 · 경로) · 처리
        String queue = body(get(boss.token, "/api/v1/admin/courses/reported?status=NEW&size=200"));
        assertThat((List<Number>) JsonPath.read(queue, "$.data[?(@.id == " + course + ")].creatorId")).extracting(Number::longValue).containsExactly(runner.id);
        String reports = body(get(boss.token, "/api/v1/admin/courses/" + course + "/reports"));
        assertThat((String) JsonPath.read(reports, "$.data.name")).isEqualTo("관리 코스");
        assertThat(((Number) JsonPath.read(reports, "$.data.creatorId")).longValue()).isEqualTo(runner.id);
        assertThat((String) JsonPath.read(reports, "$.data.creatorStatus")).isEqualTo("SUSPENDED");
        assertThat(((Number) JsonPath.read(reports, "$.data.distanceM")).intValue()).isGreaterThan(800);
        assertThat((List<?>) JsonPath.read(reports, "$.data.route")).hasSizeGreaterThan(10).hasSizeLessThanOrEqualTo(300);
        assertThat(post(boss.token, "/api/v1/admin/courses/" + course + "/moderation", "{\"action\":\"HIDE\",\"note\":\"위험 구간\"}")).hasStatusOk();
        assertThat(get(null, "/api/v1/courses/" + course)).hasStatus(403);
    }

    // ── helpers ──

    private List<Long> searchIds(User admin, String query) {
        List<Number> ids = JsonPath.read(body(get(admin.token, "/api/v1/admin/users?" + query)), "$.data.items[*].id");
        return ids.stream().map(Number::longValue).toList();
    }

    /** 관리자 계정. 처음이면 비밀번호를 정하고, 같은 DB를 쓰는 다른 테스트가 이미 정했으면 로그인 */
    private User bossLogin() {
        String setup = body(get(null, "/api/v1/admin/setup"));
        assertThat((String) JsonPath.read(setup, "$.data.email")).isEqualTo(BOSS);
        MvcTestResult r;
        if ((Boolean) JsonPath.read(setup, "$.data.needed")) {
            // 비밀번호 규칙 (앱과 같다)
            assertThat(post(null, "/api/v1/admin/setup", "{\"password\":\"short\",\"deviceId\":\"admin-web\"}")).hasStatus(400);
            r = post(null, "/api/v1/admin/setup", "{\"password\":\"%s\",\"deviceId\":\"admin-web\"}".formatted(BOSS_PASSWORD));
            assertThat((Boolean) JsonPath.read(body(get(null, "/api/v1/admin/setup")), "$.data.needed")).isFalse();
        } else {
            r = adminLogin(BOSS, BOSS_PASSWORD);
        }
        assertThat(r).hasStatusOk();
        // 한 번 정하면 다시 정할 수 없다. 틀린 비밀번호 · 앱 로그인으로는 들어오지 못한다
        assertThat(post(null, "/api/v1/admin/setup", "{\"password\":\"other2026x\",\"deviceId\":\"x\"}")).hasStatus(409);
        assertThat(adminLogin(BOSS, "wrong2026x")).hasStatus(401);
        assertThat(login(BOSS, BOSS_PASSWORD)).hasStatus(401);
        // 이메일은 대소문자 · 앞뒤 공백 무시. 같은 기기로 다시 로그인하면 이전 세션은 끊기므로 이 토큰을 쓴다
        r = adminLogin("Admin@Naver.com ", BOSS_PASSWORD);
        assertThat(r).hasStatusOk();
        String b = body(r);
        return new User(JsonPath.read(b, "$.data.accessToken"), ((Number) JsonPath.read(b, "$.data.user.userId")).longValue(), BOSS,
                JsonPath.read(b, "$.data.user.nickname"));
    }

    private User signup(String prefix) {
        String id = UUID.randomUUID().toString().substring(0, 8);
        String email = "adm-" + prefix + "-" + id + "@dallimo.test";
        String nickname = prefix + "회원" + id;
        MvcTestResult r = post(null, "/api/v1/auth/signup", """
                {"email":"%s","password":"run12345","nickname":"%s","deviceId":"d"}""".formatted(email, nickname));
        assertThat(r).hasStatus(201);
        String b = body(r);
        return new User(JsonPath.read(b, "$.data.accessToken"), ((Number) JsonPath.read(b, "$.data.user.userId")).longValue(), email, nickname);
    }

    private MvcTestResult adminLogin(String email, String password) {
        return post(null, "/api/v1/admin/login", """
                {"email":"%s","password":"%s","deviceId":"admin-web"}""".formatted(email, password));
    }

    private MvcTestResult login(String email, String password) {
        return post(null, "/api/v1/auth/login", """
                {"email":"%s","password":"%s","deviceId":"admin-web"}""".formatted(email, password));
    }

    /** 북쪽으로 초속 3m × 300초 기록으로 만든 코스 */
    private long course(User owner) {
        ThreadLocalRandom r = ThreadLocalRandom.current();
        double[] at = {r.nextDouble(-60, 60), r.nextDouble(-170, 170)};
        MvcTestResult c = post(owner.token, "/api/v1/runs", """
                {"clientRunUuid":"%s","mode":"FREE","startedAt":"%s"}""".formatted(UUID.randomUUID(), T0));
        assertThat(c).hasStatus(201);
        long runId = ((Number) JsonPath.read(body(c), "$.data.runId")).longValue();
        String pts = IntStream.rangeClosed(1, 300).mapToObj(s -> """
                {"seq":%d,"latitude":%.7f,"longitude":%.7f,"accuracyM":5.0,"recordedAt":"%s"}"""
                .formatted(s, at[0] + (s - 1) * 3.0 / 111_195.0, at[1], T0.plusSeconds(s - 1))).collect(Collectors.joining(","));
        assertThat(post(owner.token, "/api/v1/runs/" + runId + "/points", """
                {"batchUuid":"%s","fromSeq":1,"toSeq":300,"points":[%s]}""".formatted(UUID.randomUUID(), pts))).hasStatusOk();
        assertThat(post(owner.token, "/api/v1/runs/" + runId + "/finish", """
                {"endedAt":"%s","lastSeq":300,"activeSeconds":300}""".formatted(T0.plusSeconds(300)))).hasStatusOk();
        MvcTestResult created = post(owner.token, "/api/v1/courses", """
                {"sourceRunId":%d,"name":"관리 코스","tags":[]}""".formatted(runId));
        assertThat(created).hasStatus(201);
        return ((Number) JsonPath.read(body(created), "$.data.id")).longValue();
    }

    private MvcTestResult key(String method, String uri, String json) {
        var req = "POST".equals(method) ? mvc.post().uri(uri).contentType(MediaType.APPLICATION_JSON).content(json) : mvc.get().uri(uri);
        return req.header("X-Admin-Key", KEY).exchange();
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
