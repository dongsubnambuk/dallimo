package com.dallimo.dallimoserver.workout;

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
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 인터벌 달리기 (123장 Training, 126장 Workout API). 인터벌 저장 · 고치기(버전) · 복제 · 지우기, 달린 기록의 구간 결과.
 * MySQL(개발)과 MariaDB(운영) 양쪽에서 같은 결과여야 한다.
 */
abstract class WorkoutApiContractTest {

    @Autowired
    MockMvcTester mvc;

    @Autowired
    JdbcTemplate jdbc;

    static final Instant T0 = Instant.parse("2026-09-01T00:00:00Z");

    record User(String token, long id) {
    }

    /** 123.2장 예시: 몸풀기 1km → (빠르게 400m 목표 1:30 → 천천히 200m 최대 1:30) × 5 → 마무리 1km */
    static String example(String name, int repeat) {
        return """
                {"name":"%s","description":"트랙 400m","blocks":[
                  {"type":"STEP","steps":[{"stepType":"WARMUP","endConditionType":"DISTANCE","endConditionValue":1000}]},
                  {"type":"REPEAT","repeatCount":%d,"steps":[
                    {"stepType":"WORK","endConditionType":"DISTANCE","endConditionValue":400,"targetType":"TARGET_TIME","targetMin":90,"targetMax":90},
                    {"stepType":"RECOVERY","endConditionType":"DISTANCE","endConditionValue":200,"targetType":"TARGET_TIME","targetMax":90}]},
                  {"type":"STEP","steps":[{"stepType":"COOLDOWN","endConditionType":"DISTANCE","endConditionValue":1000}]}]}"""
                .formatted(name, repeat);
    }

    @Test
    void saveEditDuplicateDelete() {
        User me = signup(), other = signup();
        MvcTestResult created = post(me, "/api/v1/workouts", example("400m 인터벌", 5));
        assertThat(created).hasStatus(201);
        String b = body(created);
        long id = ((Number) JsonPath.read(b, "$.data.id")).longValue();
        assertThat((Integer) JsonPath.read(b, "$.data.version")).isEqualTo(1);
        assertThat((String) JsonPath.read(b, "$.data.description")).isEqualTo("트랙 400m");
        assertThat(JsonPath.<List<String>>read(b, "$.data.blocks[*].type")).containsExactly("STEP", "REPEAT", "STEP");
        assertThat(JsonPath.<List<Integer>>read(b, "$.data.blocks[*].repeatCount")).containsExactly(1, 5, 1);
        assertThat(JsonPath.<List<String>>read(b, "$.data.blocks[1].steps[*].stepType")).containsExactly("WORK", "RECOVERY");
        assertThat((Integer) JsonPath.read(b, "$.data.blocks[1].steps[0].targetMin")).isEqualTo(90);
        assertThat((Object) JsonPath.read(b, "$.data.blocks[1].steps[1].targetMin")).isNull();
        assertThat((Integer) JsonPath.read(b, "$.data.blocks[1].steps[1].targetMax")).isEqualTo(90);
        assertThat((Integer) JsonPath.read(b, "$.data.runCount")).isZero();

        // 고치면 버전이 오른다
        String edited = body(put(me, "/api/v1/workouts/" + id, example("400m × 6", 6)));
        assertThat((Integer) JsonPath.read(edited, "$.data.version")).isEqualTo(2);
        assertThat((Integer) JsonPath.read(edited, "$.data.blocks[1].repeatCount")).isEqualTo(6);
        assertThat((String) JsonPath.read(body(get(me, "/api/v1/workouts/" + id)), "$.data.name")).isEqualTo("400m × 6");

        // 복제: 같은 구성, 새 인터벌 (버전 1)
        MvcTestResult dup = post(me, "/api/v1/workouts/" + id + "/duplicate", "");
        assertThat(dup).hasStatus(201);
        long copy = ((Number) JsonPath.read(body(dup), "$.data.id")).longValue();
        assertThat(copy).isNotEqualTo(id);
        assertThat((String) JsonPath.read(body(dup), "$.data.name")).isEqualTo("400m × 6 복사본");
        assertThat((Integer) JsonPath.read(body(dup), "$.data.version")).isEqualTo(1);
        assertThat((Integer) JsonPath.read(body(dup), "$.data.blocks[1].repeatCount")).isEqualTo(6);

        // 목록: 최근에 만든 · 고친 것 먼저
        assertThat(JsonPath.<List<Number>>read(body(get(me, "/api/v1/workouts")), "$.data[*].id")).extracting(Number::longValue).containsExactly(copy, id);

        // 남의 인터벌은 보거나 고칠 수 없다
        assertThat(get(other, "/api/v1/workouts/" + id)).hasStatus(403);
        assertThat(put(other, "/api/v1/workouts/" + id, example("남의 것", 3))).hasStatus(403);
        assertThat(delete(other, "/api/v1/workouts/" + id)).hasStatus(403);
        assertThat(post(other, "/api/v1/workouts/" + id + "/duplicate", "")).hasStatus(403);
        assertThat(JsonPath.<List<?>>read(body(get(other, "/api/v1/workouts")), "$.data")).isEmpty();

        // 지우면 목록 · 보기에서 빠진다
        assertThat(delete(me, "/api/v1/workouts/" + id)).hasStatus(204);
        assertThat(get(me, "/api/v1/workouts/" + id)).hasStatus(404);
        assertThat(JsonPath.<List<Number>>read(body(get(me, "/api/v1/workouts")), "$.data[*].id")).extracting(Number::longValue).containsExactly(copy);
        assertThat(get(null, "/api/v1/workouts")).hasStatus(401);
    }

    @Test
    void rejectsInvalidWorkouts() {
        User me = signup();
        String step = "{\"type\":\"STEP\",\"steps\":[%s]}";
        String[] invalid = {
                // 시간 구간에 목표 시간
                wrap(step.formatted("{\"stepType\":\"WORK\",\"endConditionType\":\"TIME\",\"endConditionValue\":60,\"targetType\":\"TARGET_TIME\",\"targetMax\":60}")),
                // 반복 1회
                wrap("{\"type\":\"REPEAT\",\"repeatCount\":1,\"steps\":[{\"stepType\":\"WORK\",\"endConditionType\":\"DISTANCE\",\"endConditionValue\":400}]}"),
                // 반복이 아닌 묶음에 구간 두 개
                wrap(step.formatted("{\"stepType\":\"WORK\",\"endConditionType\":\"DISTANCE\",\"endConditionValue\":400},{\"stepType\":\"RECOVERY\",\"endConditionType\":\"DISTANCE\",\"endConditionValue\":200}")),
                // 너무 짧은 거리
                wrap(step.formatted("{\"stepType\":\"WORK\",\"endConditionType\":\"DISTANCE\",\"endConditionValue\":10}")),
                // 직접 넘기는 구간에 값
                wrap(step.formatted("{\"stepType\":\"WORK\",\"endConditionType\":\"MANUAL\",\"endConditionValue\":100}")),
                // 목표 최소 > 최대
                wrap(step.formatted("{\"stepType\":\"WORK\",\"endConditionType\":\"DISTANCE\",\"endConditionValue\":400,\"targetType\":\"TARGET_PACE\",\"targetMin\":300,\"targetMax\":280}")),
                // 목표 종류 없이 값
                wrap(step.formatted("{\"stepType\":\"WORK\",\"endConditionType\":\"DISTANCE\",\"endConditionValue\":400,\"targetMax\":280}")),
                // 페이스 범위 밖
                wrap(step.formatted("{\"stepType\":\"WORK\",\"endConditionType\":\"TIME\",\"endConditionValue\":60,\"targetType\":\"TARGET_PACE\",\"targetMin\":30}")),
                // 빈 구성, 빈 이름
                "{\"name\":\"빈 것\",\"blocks\":[]}",
                example("  ", 5),
                // 반복을 풀면 200개 넘음 (10개 × 30회)
                wrap("{\"type\":\"REPEAT\",\"repeatCount\":30,\"steps\":[" + IntStream.range(0, 10)
                        .mapToObj(i -> "{\"stepType\":\"WORK\",\"endConditionType\":\"TIME\",\"endConditionValue\":30}").collect(Collectors.joining(",")) + "]}"),
        };
        for (String json : invalid) {
            MvcTestResult r = post(me, "/api/v1/workouts", json);
            assertThat(r).as(json).hasStatus(400);
            assertThat((String) JsonPath.read(body(r), "$.error.code")).isEqualTo("VALIDATION_ERROR");
        }
        // 직접 넘기는 구간 + 목표 페이스, 시간 구간 + 목표 페이스 범위는 된다
        assertThat(post(me, "/api/v1/workouts", wrap(step.formatted(
                "{\"stepType\":\"WORK\",\"endConditionType\":\"MANUAL\",\"targetType\":\"TARGET_PACE\",\"targetMin\":280,\"targetMax\":300}")))).hasStatus(201);
        assertThat(post(me, "/api/v1/workouts", wrap(step.formatted(
                "{\"stepType\":\"WORK\",\"endConditionType\":\"TIME\",\"endConditionValue\":60,\"targetType\":\"TARGET_PACE\",\"targetMax\":300}")))).hasStatus(201);

        // 한 사람 50개까지
        Timestamp now = Timestamp.from(Instant.now());
        for (int i = 0; i < 48; i++) {
            jdbc.update("INSERT INTO tbl_workout_template (user_id, name, version, created_at, updated_at) VALUES (?, ?, 1, ?, ?)", me.id, "채움" + i, now, now);
        }
        MvcTestResult full = post(me, "/api/v1/workouts", example("51번째", 3));
        assertThat(full).hasStatus(400);
        assertThat((String) JsonPath.read(body(full), "$.error.message")).contains("50개");
    }

    @Test
    void intervalRunKeepsStepResultsAndVersion() {
        User me = signup(), other = signup();
        long id = ((Number) JsonPath.read(body(post(me, "/api/v1/workouts", example("400m 인터벌", 2))), "$.data.id")).longValue();

        // 인터벌 달리기: 인터벌 id · 버전과 함께 만들고, 끝낼 때 구간 결과를 보낸다
        long runId = createRun(me, "INTERVAL", """
                {"templateId":%d,"version":1,"name":"400m 인터벌"}""".formatted(id));
        String steps = """
                [{"stepType":"WARMUP","endConditionType":"DISTANCE","endConditionValue":1000,"distanceM":1000,"elapsedSeconds":350,"completed":true},
                 {"stepType":"WORK","endConditionType":"DISTANCE","endConditionValue":400,"targetType":"TARGET_TIME","targetMin":90,"targetMax":90,
                  "repeatIndex":1,"repeatCount":2,"distanceM":400,"elapsedSeconds":88,"completed":true},
                 {"stepType":"RECOVERY","endConditionType":"DISTANCE","endConditionValue":200,"targetType":"TARGET_TIME","targetMax":90,
                  "repeatIndex":1,"repeatCount":2,"distanceM":150,"elapsedSeconds":70,"completed":false}]""";
        String finished = body(finish(me, runId, 300, steps));
        assertThat((String) JsonPath.read(finished, "$.data.status")).isEqualTo("FINISHED");
        // 다시 보내도 한 번만 저장된다
        assertThat(finish(me, runId, 300, steps)).hasStatusOk();

        String detail = body(get(me, "/api/v1/runs/" + runId));
        assertThat((String) JsonPath.read(detail, "$.data.summary.mode")).isEqualTo("INTERVAL");
        assertThat((String) JsonPath.read(detail, "$.data.summary.workoutName")).isEqualTo("400m 인터벌");
        assertThat(((Number) JsonPath.read(detail, "$.data.workout.templateId")).longValue()).isEqualTo(id);
        assertThat((Integer) JsonPath.read(detail, "$.data.workout.version")).isEqualTo(1);
        assertThat(JsonPath.<List<String>>read(detail, "$.data.workout.steps[*].stepType")).containsExactly("WARMUP", "WORK", "RECOVERY");
        assertThat(JsonPath.<List<Integer>>read(detail, "$.data.workout.steps[*].elapsedSeconds")).containsExactly(350, 88, 70);
        assertThat(JsonPath.<List<Boolean>>read(detail, "$.data.workout.steps[*].completed")).containsExactly(true, true, false);
        assertThat((Integer) JsonPath.read(detail, "$.data.workout.steps[1].repeatIndex")).isEqualTo(1);
        assertThat((Object) JsonPath.read(detail, "$.data.workout.steps[0].repeatIndex")).isNull();
        assertThat((Integer) JsonPath.read(detail, "$.data.workout.steps[1].targetMin")).isEqualTo(90);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM tbl_run_workout_step WHERE run_id = ?", Integer.class, runId)).isEqualTo(3);

        // 인터벌 목록: 끝낸 달리기 수 · 마지막 달린 때
        String listed = body(get(me, "/api/v1/workouts/" + id));
        assertThat((Integer) JsonPath.read(listed, "$.data.runCount")).isEqualTo(1);
        assertThat((String) JsonPath.read(listed, "$.data.lastRunAt")).isNotNull();

        // 인터벌을 고쳐도 지난 기록은 그때 구성 그대로
        put(me, "/api/v1/workouts/" + id, example("바꾼 이름", 5));
        String again = body(get(me, "/api/v1/runs/" + runId));
        assertThat((String) JsonPath.read(again, "$.data.workout.name")).isEqualTo("400m 인터벌");
        assertThat((Integer) JsonPath.read(again, "$.data.workout.version")).isEqualTo(1);
        assertThat(JsonPath.<List<?>>read(again, "$.data.workout.steps")).hasSize(3);

        // 추천 인터벌(저장하지 않은 것)은 이름만으로 달린다
        long recommended = createRun(me, "INTERVAL", "{\"name\":\"1분 빠르게 × 8\"}");
        assertThat(finish(me, recommended, 120, "[]")).hasStatusOk();
        // 최근 인터벌 달리기: INTERVAL만
        createRunFinished(me, "FREE");
        String recent = body(get(me, "/api/v1/runs?mode=INTERVAL"));
        assertThat(JsonPath.<List<String>>read(recent, "$.data.items[*].workoutName")).containsExactly("1분 빠르게 × 8", "400m 인터벌");
        assertThat(JsonPath.<List<String>>read(body(get(me, "/api/v1/runs")), "$.data.items[*].mode")).containsExactly("FREE", "INTERVAL", "INTERVAL");
        assertThat((Object) JsonPath.read(body(get(me, "/api/v1/runs/" + recommended)), "$.data.workout.templateId")).isNull();

        // 지운 인터벌이어도 지난 기록 · 새 기록을 이을 수 있다 (달리는 동안 지웠을 수 있다)
        delete(me, "/api/v1/workouts/" + id);
        assertThat(post(me, "/api/v1/runs", runJson("INTERVAL", "{\"templateId\":%d,\"version\":2,\"name\":\"x\"}".formatted(id)))).hasStatus(201);

        // 없는 버전 · 남의 인터벌 → 404, 인터벌 없는 인터벌 달리기 · 인터벌 있는 자유 달리기 → 400
        assertThat(post(me, "/api/v1/runs", runJson("INTERVAL", "{\"templateId\":%d,\"version\":9,\"name\":\"x\"}".formatted(id)))).hasStatus(404);
        assertThat(post(other, "/api/v1/runs", runJson("INTERVAL", "{\"templateId\":%d,\"version\":1,\"name\":\"x\"}".formatted(id)))).hasStatus(404);
        assertThat(post(me, "/api/v1/runs", runJson("INTERVAL", null))).hasStatus(400);
        assertThat(post(me, "/api/v1/runs", runJson("FREE", "{\"name\":\"x\"}"))).hasStatus(400);
        assertThat(post(me, "/api/v1/runs", runJson("INTERVAL", "{\"templateId\":%d,\"name\":\"x\"}".formatted(id)))).hasStatus(404);

        // 자유 달리기에 구간 결과 → 400, 반복 값이 틀린 구간 결과 → 400 (둘 다 기록은 그대로)
        long free = createRun(me, "FREE", null);
        uploadPoints(me, free, 60);
        assertThat(finish(me, free, 60, steps)).hasStatus(400);
        long bad = createRun(me, "INTERVAL", "{\"name\":\"x\"}");
        uploadPoints(me, bad, 60);
        assertThat(finish(me, bad, 60, """
                [{"stepType":"WORK","endConditionType":"DISTANCE","endConditionValue":400,"repeatIndex":3,"repeatCount":2,
                  "distanceM":400,"elapsedSeconds":90,"completed":true}]""")).hasStatus(400);
        assertThat((String) JsonPath.read(body(get(me, "/api/v1/runs/" + bad)), "$.data.summary.status")).isEqualTo("RUNNING");
    }

    // ── 도우미 ──

    private static String wrap(String block) {
        return "{\"name\":\"확인\",\"blocks\":[" + block + "]}";
    }

    private String runJson(String mode, String workout) {
        return """
                {"clientRunUuid":"%s","mode":"%s","startedAt":"%s","workout":%s}""".formatted(UUID.randomUUID(), mode, T0, workout);
    }

    private long createRun(User user, String mode, String workout) {
        MvcTestResult c = post(user, "/api/v1/runs", runJson(mode, workout));
        assertThat(c).hasStatus(201);
        return ((Number) JsonPath.read(body(c), "$.data.runId")).longValue();
    }

    private void createRunFinished(User user, String mode) {
        long runId = createRun(user, mode, null);
        uploadPoints(user, runId, 60);
        assertThat(finish(user, runId, 60, null)).hasStatusOk();
    }

    private void uploadPoints(User user, long runId, int points) {
        String pts = IntStream.rangeClosed(1, points).mapToObj(s -> """
                {"seq":%d,"latitude":%.7f,"longitude":128.62,"accuracyM":5.0,"recordedAt":"%s"}"""
                .formatted(s, 35.83 + (s - 1) * 3.0 / 111_195.0, T0.plusSeconds(s - 1))).collect(Collectors.joining(","));
        assertThat(post(user, "/api/v1/runs/" + runId + "/points", """
                {"batchUuid":"%s","fromSeq":1,"toSeq":%d,"points":[%s]}""".formatted(UUID.randomUUID(), points, pts))).hasStatusOk();
    }

    /** 끝내기. 아직 point가 없으면 먼저 올린다 */
    private MvcTestResult finish(User user, long runId, int points, String steps) {
        Integer have = jdbc.queryForObject("SELECT COUNT(*) FROM tbl_run_point WHERE run_id = ?", Integer.class, runId);
        if (have == null || have == 0) uploadPoints(user, runId, points);
        return post(user, "/api/v1/runs/" + runId + "/finish", """
                {"endedAt":"%s","lastSeq":%d,"activeSeconds":%d,"workoutSteps":%s}""".formatted(T0.plusSeconds(points), points, points, steps));
    }

    private User signup() {
        String id = UUID.randomUUID().toString().substring(0, 8);
        MvcTestResult r = post(null, "/api/v1/auth/signup", """
                {"email":"workout-%s@dallimo.test","password":"run12345","nickname":"인터벌%s","deviceId":"d"}""".formatted(id, id));
        assertThat(r).hasStatus(201);
        String b = body(r);
        return new User(JsonPath.read(b, "$.data.accessToken"), ((Number) JsonPath.read(b, "$.data.user.userId")).longValue());
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
