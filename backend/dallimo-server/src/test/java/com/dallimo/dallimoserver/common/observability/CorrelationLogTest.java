package com.dallimo.dallimoserver.common.observability;

import com.dallimo.dallimoserver.TestcontainersConfiguration;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 명세 21.1장 관측성 "Run 생성 → 업로드 → Finish → Verification의 상관관계 추적 가능 (request/run correlation log)", 34장 키.
 * 요청 id(X-Request-Id)는 응답 헤더로 돌아오고, 로그 줄마다 [req · user · run]이 찍히며, 커밋 뒤 비동기 검증 로그도 finish 요청 id를 잇는다.
 * GPS 좌표는 로그에 남지 않는다.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@ExtendWith(OutputCaptureExtension.class)
class CorrelationLogTest {

    static final Instant T0 = Instant.parse("2026-09-29T00:00:00Z");

    @Autowired
    MockMvcTester mvc;

    @Test
    void requestIdComesBackOrIsCreated() {
        assertThat(mvc.get().uri("/actuator/health").header("X-Request-Id", "app-req-0001").exchange().getResponse().getHeader("X-Request-Id"))
                .isEqualTo("app-req-0001");
        // 모양이 틀리거나 없으면 새로 만든다
        String bad = mvc.get().uri("/actuator/health").header("X-Request-Id", "bad id!\nx").exchange().getResponse().getHeader("X-Request-Id");
        assertThat(bad).matches("[0-9a-f-]{36}");
        assertThat(mvc.get().uri("/actuator/health").exchange().getResponse().getHeader("X-Request-Id")).matches("[0-9a-f-]{36}");
    }

    @Test
    void runFlowIsTraceableFromCreateToVerification(CapturedOutput out) throws InterruptedException {
        String token = signup();
        long user = userId(token);
        ThreadLocalRandom r = ThreadLocalRandom.current();
        double[] at = {r.nextDouble(-60, 60), r.nextDouble(-170, 170)};
        long source = run(token, null, at, "src");
        MvcTestResult c = post(token, "/api/v1/courses", "{\"sourceRunId\":%d,\"name\":\"추적 코스\",\"tags\":[]}".formatted(source), "req-course-0001");
        assertThat(c).hasStatus(201);
        long course = ((Number) JsonPath.read(body(c), "$.data.id")).longValue();

        long runId = run(token, course, at, "run");
        String prefix = "[req=%s-%s user=%d run=%d]";
        assertThat(out.getOut()).contains(prefix.formatted("req", "run-create", user, runId) + " ")
                .contains("run.create clientRunUuid=")
                .contains(prefix.formatted("req", "run-batch", user, runId))
                .containsPattern("run\\.batch runId=" + runId + " batchUuid=\\S+ fromSeq=1 toSeq=300 count=300 result=ACCEPTED lastSeq=300")
                .containsPattern("run\\.batch runId=" + runId + " batchUuid=\\S+ fromSeq=1 toSeq=300 result=DUPLICATE lastSeq=300")
                .contains(prefix.formatted("req", "run-finish", user, runId))
                .contains("run.finish runId=" + runId + " status=FINISHED lastSeq=300");
        // 커밋 뒤 비동기 검증도 finish 요청 id로
        for (int i = 0; i < 100 && !out.getOut().contains("run.verification runId=" + runId); i++) Thread.sleep(100);
        assertThat(out.getOut()).containsPattern("\\[req=req-run-finish user=" + user + " run=" + runId + "][^\\n]*run\\.verification runId=" + runId
                + " courseId=" + course + " outcome=VERIFIED policyVersion=\\S+ matchRate=\\S+ failureReason=null");
        // 좌표는 남기지 않는다
        assertThat(out.getOut()).doesNotContain(String.format(Locale.ROOT, "%.5f", at[0])).doesNotContain(String.format(Locale.ROOT, "%.5f", at[1]));
    }

    // ── helpers ──

    /** 북쪽으로 초속 3m × 300초. 요청 id: req-{tag}-create · req-{tag}-batch · req-{tag}-finish */
    private long run(String token, Long courseId, double[] at, String tag) {
        MvcTestResult c = post(token, "/api/v1/runs", """
                {"clientRunUuid":"%s","mode":"%s","courseId":%s,"startedAt":"%s"}"""
                .formatted(UUID.randomUUID(), courseId == null ? "FREE" : "COURSE", courseId, T0), "req-" + tag + "-create");
        assertThat(c).hasStatus(201);
        long runId = ((Number) JsonPath.read(body(c), "$.data.runId")).longValue();
        String pts = IntStream.rangeClosed(1, 300).mapToObj(s -> String.format(Locale.ROOT,
                "{\"seq\":%d,\"latitude\":%.7f,\"longitude\":%.7f,\"accuracyM\":5.0,\"recordedAt\":\"%s\"}",
                s, at[0] + (s - 1) * 3.0 / 111_195.0, at[1], T0.plusSeconds(s - 1))).collect(Collectors.joining(","));
        String batch = "{\"batchUuid\":\"%s\",\"fromSeq\":1,\"toSeq\":300,\"points\":[%s]}".formatted(UUID.randomUUID(), pts);
        assertThat(post(token, "/api/v1/runs/" + runId + "/points", batch, "req-" + tag + "-batch")).hasStatusOk();
        // 응답을 못 받은 앱의 재전송
        assertThat(post(token, "/api/v1/runs/" + runId + "/points", batch, "req-" + tag + "-batch-retry")).hasStatusOk();
        assertThat(post(token, "/api/v1/runs/" + runId + "/finish", """
                {"endedAt":"%s","lastSeq":300,"activeSeconds":300}""".formatted(T0.plusSeconds(300)), "req-" + tag + "-finish")).hasStatusOk();
        return runId;
    }

    private String signup() {
        String id = UUID.randomUUID().toString().substring(0, 8);
        MvcTestResult r = post(null, "/api/v1/auth/signup", """
                {"email":"trace-%s@dallimo.test","password":"run12345","nickname":"추적%s","deviceId":"d"}""".formatted(id, id), null);
        assertThat(r).hasStatus(201);
        return JsonPath.read(body(r), "$.data.accessToken");
    }

    private long userId(String token) {
        return ((Number) JsonPath.read(body(mvc.get().uri("/api/v1/users/me").header("Authorization", "Bearer " + token).exchange()), "$.data.userId")).longValue();
    }

    private MvcTestResult post(String token, String uri, String json, String requestId) {
        var req = mvc.post().uri(uri).contentType(MediaType.APPLICATION_JSON).content(json);
        if (token != null) req = req.header("Authorization", "Bearer " + token);
        if (requestId != null) req = req.header("X-Request-Id", requestId);
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
