package com.dallimo.dallimoserver.gamification.domain;

import java.util.ArrayList;
import java.util.List;

/**
 * 124장 Segment Attack 구간. 사용자 결정: 서버가 코스를 약 1km씩 자동으로 나눈다 (코스 주인이 정하지 않는다).
 * 구간 수 = 코스 길이(km)를 반올림한 값, 같은 길이로 나눈다. 2개보다 적으면(1.5km 미만) 코스 전체가 곧 구간이라 구간을 두지 않는다.
 */
public final class CourseSegments {

    public static final double TARGET_M = 1000;
    public static final int MIN_COUNT = 2;
    public static final int MAX_COUNT = 20;

    private CourseSegments() {
    }

    /** index는 0부터. startM · endM은 코스 경로 위 거리 */
    public record Segment(int index, double startM, double endM) {
        public double lengthM() {
            return endM - startM;
        }
    }

    public static int count(double courseLengthM) {
        int n = (int) Math.round(courseLengthM / TARGET_M);
        return n < MIN_COUNT ? 0 : Math.min(n, MAX_COUNT);
    }

    public static List<Segment> of(double courseLengthM) {
        int n = count(courseLengthM);
        List<Segment> out = new ArrayList<>(n);
        for (int i = 0; i < n; i++) out.add(new Segment(i, courseLengthM * i / n, courseLengthM * (i + 1) / n));
        return out;
    }
}
