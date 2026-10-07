package com.dallimo.dallimoserver.common.observability;

import com.dallimo.dallimoserver.TestcontainersConfiguration;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
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
 * 18장 관측성 지표: /actuator/prometheus는 METRICS_TOKEN(Bearer)으로만 열리고, 러닝 · GPS Batch · API 응답시간 지표가 쌓인다 (결정 로그 77항).
 * 테스트는 지표 내보내기를 기본으로 끄므로 Prometheus만 켠다
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest(properties = {"dallimo.metrics.token=test-metrics-token", "management.prometheus.metrics.export.enabled=true"})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class MetricsEndpointTest {

    static final Instant T0 = Instant.parse("2026-09-29T00:00:00Z");

    @Autowired
    MockMvcTester mvc;

    @Test
    void prometheusNeedsMetricsToken() {
        assertThat(mvc.get().uri("/actuator/prometheus").exchange()).hasStatus(401);
        assertThat(mvc.get().uri("/actuator/prometheus").header("Authorization", "Bearer wrong").exchange()).hasStatus(401);
        // 사용자 Access Token으로도 열리지 않는다
        assertThat(mvc.get().uri("/actuator/prometheus").header("Authorization", "Bearer " + signup()).exchange()).hasStatus(401);
        assertThat(mvc.get().uri("/actuator/prometheus").header("Authorization", "Bearer test-metrics-token").exchange()).hasStatusOk();
    }

    @Test
    void runFlowShowsUpInMetrics() {
        String token = signup();
        ThreadLocalRandom r = ThreadLocalRandom.current();
        run(token, new double[]{r.nextDouble(-60, 60), r.nextDouble(-170, 170)});

        String body = body(mvc.get().uri("/actuator/prometheus").header("Authorization", "Bearer test-metrics-token").exchange());
        assertThat(body)
                .containsPattern("dallimo_run_started_total\\{[^}]*mode=\"FREE\"[^}]*} [1-9]")
                .containsPattern("dallimo_run_batch_total\\{[^}]*result=\"ACCEPTED\"[^}]*} [1-9]")
                .containsPattern("dallimo_run_batch_total\\{[^}]*result=\"DUPLICATE\"[^}]*} [1-9]")
                .containsPattern("dallimo_run_finished_total\\{[^}]*mode=\"FREE\"[^}]*status=\"FINISHED\"[^}]*} [1-9]")
                .containsPattern("dallimo_gps_points_total\\{[^}]*} [1-9]")
                .contains("dallimo_gps_accuracy_meters_bucket")
                .contains("dallimo_live_connections")
                // API 응답시간 (endpoint별 histogram) · DB 풀
                .containsPattern("http_server_requests_seconds_bucket\\{[^}]*uri=\"/api/v1/runs/\\{runId}/points\"")
                .contains("hikaricp_connections_active")
                .contains("application=\"dallimo-server\"");
        // 태그에 사용자 · 좌표를 넣지 않는다
        assertThat(body).doesNotContain("userId").doesNotContain("latitude");
    }

    // ── helpers ──

    /** 북쪽으로 초속 3m × 60초 자유 달리기 */
    private void run(String token, double[] at) {
        MvcTestResult c = post(token, "/api/v1/runs", """
                {"clientRunUuid":"%s","mode":"FREE","startedAt":"%s"}""".formatted(UUID.randomUUID(), T0));
        assertThat(c).hasStatus(201);
        long runId = ((Number) JsonPath.read(body(c), "$.data.runId")).longValue();
        String pts = IntStream.rangeClosed(1, 60).mapToObj(s -> String.format(Locale.ROOT,
                "{\"seq\":%d,\"latitude\":%.7f,\"longitude\":%.7f,\"accuracyM\":8.0,\"recordedAt\":\"%s\"}",
                s, at[0] + (s - 1) * 3.0 / 111_195.0, at[1], T0.plusSeconds(s - 1))).collect(Collectors.joining(","));
        String batch = "{\"batchUuid\":\"%s\",\"fromSeq\":1,\"toSeq\":60,\"points\":[%s]}".formatted(UUID.randomUUID(), pts);
        assertThat(post(token, "/api/v1/runs/" + runId + "/points", batch)).hasStatusOk();
        assertThat(post(token, "/api/v1/runs/" + runId + "/points", batch)).hasStatusOk();
        assertThat(post(token, "/api/v1/runs/" + runId + "/finish", """
                {"endedAt":"%s","lastSeq":60,"activeSeconds":60}""".formatted(T0.plusSeconds(60)))).hasStatusOk();
    }

    private String signup() {
        String id = UUID.randomUUID().toString().substring(0, 8);
        MvcTestResult r = post(null, "/api/v1/auth/signup", """
                {"email":"metrics-%s@dallimo.test","password":"run12345","nickname":"지표%s","deviceId":"d"}""".formatted(id, id));
        assertThat(r).hasStatus(201);
        return JsonPath.read(body(r), "$.data.accessToken");
    }

    private MvcTestResult post(String token, String uri, String json) {
        var req = mvc.post().uri(uri).contentType(MediaType.APPLICATION_JSON).content(json);
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
