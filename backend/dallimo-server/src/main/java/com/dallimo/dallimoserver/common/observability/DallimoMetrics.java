package com.dallimo.dallimoserver.common.observability;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.DistributionSummary;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * 18장 · 34장 관측성 지표 (Prometheus, /actuator/prometheus). API 응답시간 · 오류율(http.server.requests), DB 풀(hikaricp),
 * Redis(lettuce), JVM은 Spring Boot가 자동으로 잰다. 여기는 서비스 지표만 센다.
 * 태그에는 사용자 id · 위치 · 닉네임을 넣지 않는다 (34장: 개인정보를 관측성 데이터에 넣지 않는다). 값의 종류가 정해진 것만 태그로 쓴다
 */
@Component
public class DallimoMetrics {

    private final MeterRegistry registry;
    private final AtomicInteger liveConnections = new AtomicInteger();
    private final DistributionSummary gpsAccuracy;
    private final Counter gpsPoints;
    private final Timer liveLag;

    public DallimoMetrics(MeterRegistry registry) {
        this.registry = registry;
        Gauge.builder("dallimo.live.connections", liveConnections, AtomicInteger::get)
                .description("지금 열려 있는 실시간(STOMP) 연결 수").register(registry);
        gpsAccuracy = DistributionSummary.builder("dallimo.gps.accuracy").baseUnit("meters")
                .description("서버가 받은 GPS point의 정확도").serviceLevelObjectives(5, 10, 20, 50, 100).register(registry);
        gpsPoints = Counter.builder("dallimo.gps.points").description("서버가 받은 GPS point 수").register(registry);
        liveLag = Timer.builder("dallimo.live.state.lag").description("실시간 상태 메시지: 앱이 보낸 시각부터 서버가 받은 시각까지")
                .serviceLevelObjectives(Duration.ofMillis(250), Duration.ofMillis(500), Duration.ofSeconds(1), Duration.ofSeconds(3))
                .register(registry);
    }

    // ── Run ──────────────────────────────────────────────

    /** 새 Run (같은 clientRunUuid 재시도는 세지 않는다). 시작 대비 완료(run.finished)로 완료율 · 비정상 종료를 본다 */
    public void runStarted(String mode) {
        registry.counter("dallimo.run.started", "mode", mode).increment();
    }

    /** finish 요청 결과: FINISHED(확정) · FINISHING(빠진 Batch가 있어 확정 못 함) */
    public void runFinished(String mode, String status) {
        registry.counter("dallimo.run.finished", "mode", mode, "status", status).increment();
    }

    /** GPS Batch 결과: ACCEPTED · DUPLICATE(재전송) · CONFLICT · REJECTED(끝난 Run) */
    public void runBatch(String result) {
        registry.counter("dallimo.run.batch", "result", result).increment();
    }

    public void gpsPoint(Double accuracyM) {
        gpsPoints.increment();
        if (accuracyM != null && accuracyM >= 0) gpsAccuracy.record(accuracyM);
    }

    // ── Verification ─────────────────────────────────────

    /** outcome: VERIFIED · UNVERIFIED · REJECTED, reason: 실패 사유 코드(없으면 NONE), policy: 정책 버전 */
    public void verification(String outcome, String reason, String policy) {
        registry.counter("dallimo.verification", "outcome", outcome, "reason", reason == null ? "NONE" : reason, "policy", policy).increment();
    }

    // ── Live (WebSocket) ─────────────────────────────────

    public void liveConnected() {
        liveConnections.incrementAndGet();
        registry.counter("dallimo.live.connects").increment();
    }

    public void liveDisconnected(int closeCode) {
        liveConnections.updateAndGet(n -> Math.max(0, n - 1));
        registry.counter("dallimo.live.disconnects", "code", String.valueOf(closeCode)).increment();
    }

    public void liveStateLag(Duration lag) {
        // 기기 시계가 어긋난 값(음수 · 1분 넘게)은 버린다
        if (lag.isNegative() || lag.compareTo(Duration.ofMinutes(1)) > 0) return;
        liveLag.record(lag);
    }

    // ── Push ─────────────────────────────────────────────

    /** result: OK · FAILED · DEVICE_GONE(invalid token) */
    public void push(String type, String result) {
        registry.counter("dallimo.push", "type", type, "result", result).increment();
    }
}
