package com.dallimo.dallimoserver.verification;

import com.dallimo.dallimoserver.course.domain.CourseRoute;
import com.dallimo.dallimoserver.running.domain.RunPoint;
import com.dallimo.dallimoserver.verification.domain.CheckResult;
import com.dallimo.dallimoserver.verification.domain.CourseVerifier;
import com.dallimo.dallimoserver.verification.domain.FailureReason;
import com.dallimo.dallimoserver.verification.domain.VerificationOutcome;
import com.dallimo.dallimoserver.verification.domain.VerificationPolicy;
import com.dallimo.dallimoserver.verification.domain.VerificationResult;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 26장 완주 검증. 좌표는 기준점에서 동(x) · 북(y)으로 m 단위로 만든다.
 * 53장 CRS-IT-001(정상 완주) · 002(중간 생략) · 003(비정상 속도)를 순수 로직으로 먼저 확인한다.
 */
class CourseVerifierTest {

    static final double LAT0 = 35.8, LNG0 = 128.6;
    static final double M_PER_DEG = 111_195;
    static final Instant T0 = Instant.parse("2026-09-29T00:00:00Z");
    static final VerificationPolicy POLICY = VerificationPolicy.CURRENT;

    // 북쪽으로 900m 직선 코스
    static final List<double[]> LINE = List.of(xy(0, 0), xy(0, 900));
    // 한 변 250m 사각 루프 (출발 = 도착)
    static final List<double[]> LOOP = List.of(xy(0, 0), xy(250, 0), xy(250, 250), xy(0, 250), xy(0, 0));

    @Test
    void straightCourseWithWarmUpAndCoolDownIsVerified() {
        // CRS-IT-001: 출발 30m 전에서 시작해 코스를 달리고 도착 뒤 100m 더 달림 (초속 3m)
        Run run = new Run().along(List.of(xy(0, -30), xy(0, 1000)), 3);
        VerificationResult r = verify(LINE, run.points);
        assertThat(r.outcome()).isEqualTo(VerificationOutcome.VERIFIED);
        assertThat(r.failureReason()).isNull();
        assertThat(r.matchRate()).isEqualTo(100.0);
        // 공식 기록은 출발점~도착점 사이만 (900m / 3m/s = 300초)
        assertThat(r.recordSeconds()).isBetween(299, 301);
        assertThat(List.of(r.start(), r.end(), r.distance(), r.route(), r.speed())).containsOnly(CheckResult.PASS);
    }

    @Test
    void loopCourseTwoLapsRecordsFirstLap() {
        // 출발 = 도착인 루프: 출발하자마자 도착으로 보지 않고, 두 바퀴 달려도 첫 바퀴가 기록
        List<double[]> twoLaps = new ArrayList<>(LOOP);
        twoLaps.addAll(LOOP.subList(1, LOOP.size()));
        VerificationResult r = verify(LOOP, new Run().along(twoLaps, 3).points);
        assertThat(r.outcome()).isEqualTo(VerificationOutcome.VERIFIED);
        assertThat(r.recordSeconds()).isBetween(331, 336);
    }

    @Test
    void pausesAreNotCounted() {
        // 450m 지점에서 90초 멈춤 (point 없음) → 기록은 달린 시간만
        Run run = new Run().along(List.of(xy(0, 0), xy(0, 450)), 3).pause(90).along(List.of(xy(0, 450), xy(0, 900)), 3);
        VerificationResult r = verify(LINE, run.points);
        assertThat(r.outcome()).isEqualTo(VerificationOutcome.VERIFIED);
        assertThat(r.recordSeconds()).isBetween(299, 302);
    }

    @Test
    void shortcutIsUnverified() {
        // CRS-IT-002: 사각 루프에서 대각선으로 질러감 → 거리가 모자람
        VerificationResult r = verify(LOOP, new Run().along(List.of(xy(0, 0), xy(250, 0), xy(0, 250), xy(0, 0)), 3).points);
        assertThat(r.outcome()).isEqualTo(VerificationOutcome.UNVERIFIED);
        assertThat(r.failureReason()).isEqualTo(FailureReason.DISTANCE_SHORT);
        assertThat(r.recordSeconds()).isNull();
    }

    @Test
    void detourIsRouteMismatch() {
        // 한 변을 120m 바깥 길로 돌아감 → 거리는 충분하지만 코스를 따라 달리지 않음
        List<double[]> detour = List.of(xy(0, 0), xy(250, 0), xy(250, 250), xy(250, 370), xy(0, 370), xy(0, 250), xy(0, 0));
        VerificationResult r = verify(LOOP, new Run().along(detour, 3).points);
        assertThat(r.outcome()).isEqualTo(VerificationOutcome.UNVERIFIED);
        assertThat(r.failureReason()).isEqualTo(FailureReason.ROUTE_MISMATCH);
        assertThat(r.distance()).isEqualTo(CheckResult.PASS);
        assertThat(r.matchRate()).isBetween(70.0, 85.0);
    }

    @Test
    void vehicleSpeedIsRejected() {
        // CRS-IT-003: 초속 10m(시속 36km)로 코스를 지남. 순간 이동 기준(12m/s)보다 느려 거리에는 들어가지만 이어진 속도로 거부
        VerificationResult r = verify(LINE, new Run().along(LINE, 10).points);
        assertThat(r.outcome()).isEqualTo(VerificationOutcome.REJECTED);
        assertThat(r.failureReason()).isEqualTo(FailureReason.SPEED_ANOMALY);
        assertThat(r.speed()).isEqualTo(CheckResult.FAIL);
        assertThat(r.recordSeconds()).isNull();
    }

    @Test
    void shortSprintIsNotRejected() {
        // 20초 전력 질주(초속 8m)는 30초 평균 기준을 넘지 않는다
        Run run = new Run().along(List.of(xy(0, 0), xy(0, 300)), 3).along(List.of(xy(0, 300), xy(0, 460)), 8).along(List.of(xy(0, 460), xy(0, 900)), 3);
        assertThat(verify(LINE, run.points).outcome()).isEqualTo(VerificationOutcome.VERIFIED);
    }

    @Test
    void startingAwayFromStartIsUnverified() {
        VerificationResult r = verify(LINE, new Run().along(List.of(xy(0, 150), xy(0, 900)), 3).points);
        assertThat(r.failureReason()).isEqualTo(FailureReason.START_NOT_NEAR);
        assertThat(r.end()).isEqualTo(CheckResult.SKIPPED);
    }

    @Test
    void stoppingHalfwayIsUnverified() {
        VerificationResult r = verify(LINE, new Run().along(List.of(xy(0, 0), xy(0, 450)), 3).points);
        assertThat(r.failureReason()).isEqualTo(FailureReason.END_NOT_REACHED);
        assertThat(r.recordSeconds()).isNull();
    }

    @Test
    void missingDataIsUnverified() {
        assertThat(verify(LINE, new Run().at(xy(0, 0)).points).failureReason()).isEqualTo(FailureReason.GPS_INSUFFICIENT);
        assertThat(CourseVerifier.verify(List.of(), new Run().along(LINE, 3).points, POLICY).failureReason()).isEqualTo(FailureReason.COURSE_UNAVAILABLE);
    }

    @Test
    void lowAccuracyPointsAreIgnored() {
        // 정확도가 나쁜 point가 섞여도(20m 초과) 판정에서 빠진다
        Run run = new Run().along(LINE, 3);
        List<RunPoint> noisy = new ArrayList<>();
        for (RunPoint p : run.points) {
            noisy.add(p);
            if (p.seq() % 10 == 0) noisy.add(new RunPoint(p.seq() * 1000, p.latitude() + 0.01, p.longitude(), null, 80.0, null, p.recordedAt().plusMillis(500)));
        }
        noisy.sort((a, b) -> a.recordedAt().compareTo(b.recordedAt()));
        assertThat(verify(LINE, noisy).outcome()).isEqualTo(VerificationOutcome.VERIFIED);
    }

    @Test
    void sameInputSameResult() {
        List<RunPoint> pts = new Run().along(LOOP, 3).points;
        assertThat(verify(LOOP, pts)).isEqualTo(verify(LOOP, pts));
    }

    // ── helpers ──

    static double[] xy(double x, double y) {
        return new double[]{x, y};
    }

    static CourseRoute.Point toPoint(double[] xy) {
        return new CourseRoute.Point(LAT0 + xy[1] / M_PER_DEG, LNG0 + xy[0] / (M_PER_DEG * Math.cos(Math.toRadians(LAT0))), null);
    }

    static VerificationResult verify(List<double[]> corners, List<RunPoint> run) {
        List<CourseRoute.Point> course = CourseRoute.resample(corners.stream().map(CourseVerifierTest::toPoint).toList(), CourseRoute.SAMPLE_M);
        return CourseVerifier.verify(course, run, POLICY);
    }

    /** 1초마다 한 point, 정확도 5m */
    static final class Run {
        final List<RunPoint> points = new ArrayList<>();
        double sec = 0;

        Run at(double[] p) {
            add(p);
            return this;
        }

        Run pause(int seconds) {
            sec += seconds;
            return this;
        }

        /** 꺾은선을 따라 speed(m/s)로 */
        Run along(List<double[]> line, double speed) {
            for (int i = 1; i < line.size(); i++) {
                double[] a = line.get(i - 1), b = line.get(i);
                double len = Math.hypot(b[0] - a[0], b[1] - a[1]);
                if (points.isEmpty()) add(a);
                int steps = (int) Math.round(len / speed);
                for (int k = 1; k <= steps; k++) {
                    sec += 1;
                    add(new double[]{a[0] + (b[0] - a[0]) * k / steps, a[1] + (b[1] - a[1]) * k / steps});
                }
            }
            return this;
        }

        private void add(double[] xy) {
            CourseRoute.Point p = toPoint(xy);
            points.add(new RunPoint(points.size() + 1, p.latitude(), p.longitude(), null, 5.0, null, T0.plusMillis(Math.round(sec * 1000))));
        }
    }
}
