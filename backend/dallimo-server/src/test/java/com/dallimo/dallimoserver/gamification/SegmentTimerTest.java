package com.dallimo.dallimoserver.gamification;

import com.dallimo.dallimoserver.course.domain.CourseRoute;
import com.dallimo.dallimoserver.gamification.domain.CourseSegments;
import com.dallimo.dallimoserver.gamification.domain.SegmentTimer;
import com.dallimo.dallimoserver.running.domain.RunPoint;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** 124장 Segment Attack: 코스를 약 1km씩 나누고 인증된 러닝에서 구간 기록을 잰다 */
class SegmentTimerTest {

    static final double LAT = 35.8, LNG = 128.6, M = 111_195.0;
    static final Instant T0 = Instant.parse("2026-09-29T00:00:00Z");

    @Test
    void segmentsAreAboutOneKilometer() {
        assertThat(CourseSegments.of(1400)).isEmpty();
        assertThat(CourseSegments.of(1909)).extracting(CourseSegments.Segment::lengthM).containsExactly(954.5, 954.5);
        assertThat(CourseSegments.of(4600)).hasSize(5);
        assertThat(CourseSegments.of(42_195)).hasSize(20);
        List<CourseSegments.Segment> s = CourseSegments.of(3000);
        assertThat(s.get(1).startM()).isEqualTo(1000);
        assertThat(s.get(2).endM()).isEqualTo(3000);
    }

    @Test
    void straightRunAtFourMetersPerSecond() {
        List<CourseRoute.Point> route = north(2000);
        List<RunPoint> run = run(0, 500, 4.0, 0, -1);
        List<Integer> t = SegmentTimer.time(route, run, CourseSegments.of(2000));
        assertThat(t).hasSize(2);
        assertThat(t.get(0)).isBetween(249, 251);
        assertThat(t.get(1)).isBetween(249, 251);
    }

    @Test
    void pauseIsNotCounted() {
        // 1300m 지점(325초)에서 60초 멈춤 (point 없음)
        List<RunPoint> run = run(0, 500, 4.0, 0, 325);
        List<Integer> t = SegmentTimer.time(north(2000), run, CourseSegments.of(2000));
        assertThat(t.get(1)).isBetween(249, 251);
    }

    @Test
    void stoppingEarlyLeavesLaterSegmentsEmpty() {
        List<Integer> t = SegmentTimer.time(north(3000), run(0, 400, 4.0, 0, -1), CourseSegments.of(3000));
        assertThat(t.get(0)).isBetween(249, 251);
        assertThat(t.get(1)).isNull();
        assertThat(t.get(2)).isNull();
    }

    @Test
    void finishingInsideEndRadiusCompletesLastSegment() {
        // 1970m(끝 30m 전)에서 멈춰도 마지막 구간을 끝낸 것으로 본다
        List<Integer> t = SegmentTimer.time(north(2000), run(0, 493, 4.0, 0, -1), CourseSegments.of(2000));
        assertThat(t.get(1)).isNotNull();
    }

    @Test
    void loopCourseDoesNotJumpToTheEndAtStart() {
        // 동서 500m · 남북 500m 사각형 한 바퀴(2000m), 출발 = 도착
        List<CourseRoute.Point> loop = new ArrayList<>();
        double[][] corners = {{0, 0}, {0, 500}, {500, 500}, {500, 0}, {0, 0}};
        for (int c = 1; c < corners.length; c++) {
            for (int i = 0; i < 50; i++) {
                double f = i / 50.0;
                double n = corners[c - 1][0] + (corners[c][0] - corners[c - 1][0]) * f;
                double e = corners[c - 1][1] + (corners[c][1] - corners[c - 1][1]) * f;
                loop.add(at(n, e));
            }
        }
        loop.add(at(0, 0));
        List<CourseRoute.Point> route = CourseRoute.resample(loop, CourseRoute.SAMPLE_M);
        List<RunPoint> run = new ArrayList<>();
        for (int s = 0; s <= 500; s++) {
            double d = s * 4.0;
            CourseRoute.Point p = along(loop, d);
            run.add(new RunPoint(s + 1, p.latitude(), p.longitude(), null, 5.0, null, T0.plusSeconds(s)));
        }
        List<Integer> t = SegmentTimer.time(route, run, CourseSegments.of(CourseRoute.lengthM(route)));
        assertThat(t).hasSize(2);
        assertThat(t.get(0)).isBetween(245, 255);
        assertThat(t.get(1)).isBetween(245, 255);
    }

    @Test
    void sameInputSameResult() {
        List<RunPoint> run = run(0, 500, 4.0, 0, 200);
        assertThat(SegmentTimer.time(north(2000), run, CourseSegments.of(2000))).isEqualTo(SegmentTimer.time(north(2000), run, CourseSegments.of(2000)));
    }

    // ── helpers ──

    static CourseRoute.Point at(double northM, double eastM) {
        return new CourseRoute.Point(LAT + northM / M, LNG + eastM / (M * Math.cos(Math.toRadians(LAT))), null);
    }

    static List<CourseRoute.Point> north(double length) {
        return CourseRoute.resample(Arrays.asList(at(0, 0), at(length, 0)), CourseRoute.SAMPLE_M);
    }

    static CourseRoute.Point along(List<CourseRoute.Point> line, double d) {
        double acc = 0;
        for (int i = 1; i < line.size(); i++) {
            double seg = CourseRoute.haversineM(line.get(i - 1).latitude(), line.get(i - 1).longitude(), line.get(i).latitude(), line.get(i).longitude());
            if (acc + seg >= d) {
                double f = seg == 0 ? 0 : (d - acc) / seg;
                return new CourseRoute.Point(line.get(i - 1).latitude() + (line.get(i).latitude() - line.get(i - 1).latitude()) * f,
                        line.get(i - 1).longitude() + (line.get(i).longitude() - line.get(i - 1).longitude()) * f, null);
            }
            acc += seg;
        }
        return line.get(line.size() - 1);
    }

    /** 북쪽으로 speed m/s, 1초마다 point. pauseAt초에서 60초 동안 point 없이 멈춘다(-1이면 없음) */
    static List<RunPoint> run(int from, int to, double speed, double eastM, int pauseAt) {
        List<RunPoint> out = new ArrayList<>();
        int clock = 0;
        for (int s = from; s <= to; s++) {
            if (s == pauseAt) clock += 60;
            CourseRoute.Point p = at(s * speed, eastM);
            out.add(new RunPoint(s + 1, p.latitude(), p.longitude(), null, 5.0, null, T0.plusSeconds(s + clock)));
        }
        return out;
    }
}
