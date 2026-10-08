package com.dallimo.dallimoserver.running;

import com.dallimo.dallimoserver.running.domain.RunMetrics;
import com.dallimo.dallimoserver.running.domain.RunPoint;
import com.dallimo.dallimoserver.running.domain.RunSource;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

/** 서버 거리 계산 (51장). 북쪽으로 초속 3m */
class RunMetricsTest {

    static final Instant T0 = Instant.parse("2026-09-29T00:00:00Z");
    static final double STEP = 3 / 111_320.0;

    static List<RunPoint> straight(int n) {
        List<RunPoint> pts = new ArrayList<>();
        for (int i = 0; i < n; i++) pts.add(new RunPoint(i + 1, 35.8 + i * STEP, 128.6, null, 5.0, 3.0, T0.plusSeconds(i)));
        return pts;
    }

    @Test
    void sumsDistanceAndSplits() {
        RunMetrics.Result r = RunMetrics.compute(straight(700)); // 699 구간 × 3m ≈ 2097m
        assertThat(r.distanceM()).isCloseTo(2097, within(3.0));
        assertThat(r.splits()).hasSize(2);
        assertThat(r.splits().get(0).sec()).isBetween(332, 335); // 1000m / 3m/s
        assertThat(r.path().size()).isLessThanOrEqualTo(401);
    }

    @Test
    void skipsLowAccuracyAndJumps() {
        List<RunPoint> pts = new ArrayList<>(straight(100));
        RunPoint p = pts.get(50);
        pts.set(50, new RunPoint(p.seq(), p.latitude() + 0.01, p.longitude(), null, 5.0, null, p.recordedAt())); // 1km 순간 이동
        RunPoint q = pts.get(70);
        pts.set(70, new RunPoint(q.seq(), q.latitude(), q.longitude(), null, 45.0, null, q.recordedAt())); // 정확도 낮음
        double d = RunMetrics.compute(pts).distanceM();
        // 99구간(297m)에서 튄 점 앞뒤 2구간, 정확도 낮은 점 앞뒤 2구간을 뺀다
        assertThat(d).isCloseTo(297 - 12, within(2.0));
    }

    @Test
    void importedRouteIsNotFilteredByAccuracyButStillByJumps() {
        // FOUNDATION-DECISION-LOG 92항: 건강 앱 경로는 정확도가 없거나 커도 쓴다. 순간 이동은 그대로 뺀다
        List<RunPoint> pts = new ArrayList<>();
        for (RunPoint p : straight(100)) pts.add(new RunPoint(p.seq(), p.latitude(), p.longitude(), null, p.seq() % 2 == 0 ? null : 35.0, null, p.recordedAt()));
        assertThat(RunMetrics.compute(pts, RunSource.DALLIMO).accepted()).isEmpty();
        assertThat(RunMetrics.compute(pts, RunSource.APPLE_HEALTH).distanceM()).isCloseTo(297, within(2.0));
        RunPoint p = pts.get(50);
        pts.set(50, new RunPoint(p.seq(), p.latitude() + 0.01, p.longitude(), null, null, null, p.recordedAt())); // 1km 순간 이동
        assertThat(RunMetrics.compute(pts, RunSource.APPLE_HEALTH).distanceM()).isCloseTo(297 - 6, within(2.0));
    }

    @Test
    void longGapIsTreatedAsPause() {
        List<RunPoint> pts = new ArrayList<>(straight(20));
        // 일시정지 중 300m 걸은 뒤 재개 (60초 공백)
        RunPoint last = pts.get(pts.size() - 1);
        for (int i = 0; i < 20; i++) {
            pts.add(new RunPoint(21 + i, last.latitude() + (100 + i) * STEP, 128.6, null, 5.0, 3.0, last.recordedAt().plusSeconds(60 + i)));
        }
        assertThat(RunMetrics.compute(pts).distanceM()).isCloseTo(19 * 3 + 19 * 3, within(2.0));
    }

    @Test
    void paceNeedsEnoughDistance() {
        assertThat(RunMetrics.avgPace(40, 30)).isNull();
        assertThat(RunMetrics.avgPace(1000, 300)).isEqualTo(300);
    }
}
