package com.dallimo.dallimoserver.course;

import com.dallimo.dallimoserver.course.domain.CourseRoute;
import com.dallimo.dallimoserver.course.domain.CourseRoute.Point;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

class CourseRouteTest {

    // 북쪽으로 stepM 간격 n개, 고도는 0.1m씩 오른다
    private static List<Point> north(int n, double stepM, boolean altitude) {
        List<Point> out = new ArrayList<>();
        for (int i = 0; i < n; i++) out.add(new Point(35.8 + i * stepM / 111_195.0, 128.6, altitude ? 50 + i * 0.1 : null));
        return out;
    }

    @Test
    void resamplesEvenlyAndKeepsEnds() {
        // 3m 간격 301개 = 900m → 10m 간격 91개
        List<Point> line = north(301, 3, true);
        List<Point> out = CourseRoute.resample(line, 10);
        assertThat(out).hasSize(91);
        assertThat(out.get(0)).isEqualTo(line.get(0));
        assertThat(out.get(out.size() - 1).latitude()).isCloseTo(line.get(300).latitude(), within(1e-7));
        for (int i = 1; i < out.size(); i++) {
            double gap = CourseRoute.haversineM(out.get(i - 1).latitude(), out.get(i - 1).longitude(), out.get(i).latitude(), out.get(i).longitude());
            assertThat(gap).isCloseTo(10, within(0.05));
        }
        // 고도 보간: 30m 지점(원래 10번째 점) = 51.0
        assertThat(out.get(3).altitudeM()).isCloseTo(51.0, within(0.01));
    }

    @Test
    void sparseLongSegmentsAreFilled() {
        // 100m 간격 6개 = 500m → 51개
        assertThat(CourseRoute.resample(north(6, 100, false), 10)).hasSize(51);
    }

    @Test
    void normalizeRejectsShortOrFewPoints() {
        assertThat(CourseRoute.normalize(north(9, 100, false))).as("정상 point 10개 미만").isNull();
        assertThat(CourseRoute.normalize(north(100, 4, false))).as("500m 미만 (396m)").isNull();
        CourseRoute.Normalized ok = CourseRoute.normalize(north(200, 3, true));
        assertThat(ok).isNotNull();
        assertThat(ok.distanceM()).isEqualTo(597);
        // 실제 오르막 19.9m. 이동평균(5점)이 양 끝 두 점씩의 기울기를 줄여 약 0.6m 적게 나온다
        assertThat(ok.elevationGainM()).isBetween(19.0, 19.9);
    }

    @Test
    void noAltitudeMeansNoProfile() {
        List<Point> line = CourseRoute.resample(north(200, 3, false), 10);
        assertThat(CourseRoute.elevationGain(line)).isNull();
        assertThat(CourseRoute.profile(line)).isNull();
        List<double[]> profile = CourseRoute.profile(CourseRoute.resample(north(200, 3, true), 10));
        assertThat(profile.get(0)[0]).isZero();
        assertThat(profile.get(1)[0]).isEqualTo(40);
        assertThat(profile.get(profile.size() - 1)[0]).isEqualTo(597);
    }

    @Test
    void decimateKeepsEnd() {
        List<Point> line = north(1001, 1, false);
        List<double[]> out = CourseRoute.decimate(line, 100);
        assertThat(out.size()).isLessThanOrEqualTo(101);
        assertThat(out.get(out.size() - 1)[0]).isEqualTo(line.get(1000).latitude());
    }
}
