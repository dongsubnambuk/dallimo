package com.dallimo.dallimoserver.externalcourse.domain;

import com.dallimo.dallimoserver.course.domain.CourseRoute;

import java.util.ArrayList;
import java.util.List;

/**
 * 외부 경로를 코스로 만들 때의 기준. 사용자 코스와 같은 10m 간격으로 다시 찍는다 (CourseRoute.SAMPLE_M).
 * 사용자 코스와 달리 원본 point가 성겨도 된다 (닫힌 호수 둘레길 way는 꼭짓점 몇 개뿐일 수 있다).
 */
public final class ExternalCoursePolicy {

    private final int minDistanceM;
    private final int maxDistanceM;

    public ExternalCoursePolicy(int minDistanceM, int maxDistanceM) {
        this.minDistanceM = minDistanceM;
        this.maxDistanceM = maxDistanceM;
    }

    public boolean lengthOk(double lengthM) {
        return lengthM >= minDistanceM && lengthM <= maxDistanceM;
    }

    /** 코스 경로. 너무 짧거나 길면 null */
    public CourseRoute.Normalized normalize(List<CourseRoute.Point> line) {
        if (line.size() < 2) return null;
        List<CourseRoute.Point> points = CourseRoute.resample(line, CourseRoute.SAMPLE_M);
        double length = CourseRoute.lengthM(points);
        if (!lengthOk(length)) return null;
        return new CourseRoute.Normalized(points, (int) Math.round(length), CourseRoute.elevationGain(points));
    }

    /** 고도를 물어볼 point 위치: every개마다 하나, 마지막 point는 꼭 */
    public static List<Integer> elevationSamples(int size, int every) {
        List<Integer> out = new ArrayList<>();
        for (int i = 0; i < size; i += every) out.add(i);
        if (out.get(out.size() - 1) != size - 1) out.add(size - 1);
        return out;
    }

    /** 표본 고도를 사이 point에 선형으로 나눠 채운 경로 */
    public static CourseRoute.Normalized withElevation(CourseRoute.Normalized route, List<Integer> samples, double[] altitudes) {
        List<CourseRoute.Point> in = route.points();
        List<CourseRoute.Point> out = new ArrayList<>(in.size());
        int s = 0;
        for (int i = 0; i < in.size(); i++) {
            while (s < samples.size() - 1 && samples.get(s + 1) < i) s++;
            int a = samples.get(s);
            int b = samples.get(Math.min(s + 1, samples.size() - 1));
            double t = b == a ? 0 : (i - a) / (double) (b - a);
            double alt = altitudes[s] + (altitudes[Math.min(s + 1, altitudes.length - 1)] - altitudes[s]) * Math.min(1, Math.max(0, t));
            CourseRoute.Point p = in.get(i);
            out.add(new CourseRoute.Point(p.latitude(), p.longitude(), Math.round(alt * 100) / 100.0));
        }
        return new CourseRoute.Normalized(out, route.distanceM(), CourseRoute.elevationGain(out));
    }
}
