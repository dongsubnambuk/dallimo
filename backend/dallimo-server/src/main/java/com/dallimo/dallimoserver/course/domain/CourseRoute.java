package com.dallimo.dallimoserver.course.domain;

import java.util.ArrayList;
import java.util.List;

/**
 * 코스 경로 정규화 (43.1장: source Run point를 그대로 복사하지 않고 코스용으로 정규화, 26장 "polyline을 일정 간격으로 정규화/샘플링").
 * 정상 point(RunMetrics 판정 통과)를 이은 선을 일정 간격으로 다시 찍는다. 기준값은 명세에 없어 정한 시작값이다 (backend/README).
 */
public final class CourseRoute {

    // 경로 point 간격(m). 뒤에 붙을 경로 매칭(WBS 5)이 점-선분 거리로 판정하기에 충분히 촘촘하게
    public static final double SAMPLE_M = 10;
    // 이보다 짧거나 정상 point가 적으면 코스로 만들지 않는다 (43.1장 "RunPoint가 충분하지 않으면 거부")
    public static final double MIN_DISTANCE_M = 500;
    public static final int MIN_POINTS = 10;
    // 목록 · 지도 표시용 점 수 (77장: 원본 전체를 그리지 않는다)
    public static final int SUMMARY_MAX_POINTS = 100;
    public static final int DETAIL_MAX_POINTS = 1000;
    // 고도 그래프 간격(m)과 고도 흔들림을 줄이는 이동평균 창
    static final double PROFILE_STEP_M = 40;
    static final int SMOOTH_WINDOW = 5;

    public record Point(double latitude, double longitude, Double altitudeM) {
    }

    public record Normalized(List<Point> points, int distanceM, Double elevationGainM) {
    }

    private CourseRoute() {
    }

    /** 정상 point로 코스 경로를 만든다. 부족하면 null */
    public static Normalized normalize(List<Point> accepted) {
        if (accepted.size() < MIN_POINTS) return null;
        List<Point> points = resample(accepted, SAMPLE_M);
        double length = lengthM(points);
        if (length < MIN_DISTANCE_M) return null;
        return new Normalized(points, (int) Math.round(length), elevationGain(points));
    }

    /** 선을 따라 stepM마다 점을 찍는다. 처음과 끝 점은 그대로 둔다. 고도는 양쪽 점에 있을 때만 선형 보간 */
    public static List<Point> resample(List<Point> line, double stepM) {
        List<Point> out = new ArrayList<>();
        if (line.isEmpty()) return out;
        out.add(line.get(0));
        double carried = 0;
        for (int i = 1; i < line.size(); i++) {
            Point a = line.get(i - 1);
            Point b = line.get(i);
            double seg = haversineM(a, b);
            if (seg == 0) continue;
            double at = stepM - carried;
            while (at <= seg) {
                out.add(interpolate(a, b, at / seg));
                at += stepM;
            }
            carried = seg - (at - stepM);
        }
        Point last = line.get(line.size() - 1);
        Point tail = out.get(out.size() - 1);
        if (haversineM(tail, last) > 0.5) out.add(last);
        return out;
    }

    public static double lengthM(List<Point> line) {
        double d = 0;
        for (int i = 1; i < line.size(); i++) d += haversineM(line.get(i - 1), line.get(i));
        return d;
    }

    /** 오르막 합(m). 고도가 없는 점이 하나라도 있으면 null */
    public static Double elevationGain(List<Point> line) {
        double[] alt = smoothedAltitudes(line);
        if (alt == null) return null;
        double gain = 0;
        for (int i = 1; i < alt.length; i++) gain += Math.max(0, alt[i] - alt[i - 1]);
        return gain;
    }

    /** 고도 그래프 [출발점부터 거리(m), 고도(m)]. 고도가 없으면 null */
    public static List<double[]> profile(List<Point> line) {
        double[] alt = smoothedAltitudes(line);
        if (alt == null) return null;
        List<double[]> out = new ArrayList<>();
        double dist = 0;
        double next = 0;
        for (int i = 0; i < line.size(); i++) {
            if (i > 0) dist += haversineM(line.get(i - 1), line.get(i));
            // 40m 눈금에 맞춘다 (계산 오차로 39.99m가 되어도 그 눈금으로 본다)
            if (dist >= next - 0.5 || i == line.size() - 1) {
                out.add(new double[]{Math.round(dist), Math.round(alt[i] * 10) / 10.0});
                while (next <= dist + 0.5) next += PROFILE_STEP_M;
            }
        }
        return out;
    }

    /** 표시용으로 점 수를 줄인다. 끝 점은 남긴다 */
    public static List<double[]> decimate(List<Point> line, int max) {
        List<double[]> out = new ArrayList<>();
        if (line.isEmpty()) return out;
        int step = Math.max(1, (int) Math.ceil(line.size() / (double) max));
        for (int i = 0; i < line.size(); i += step) out.add(new double[]{line.get(i).latitude(), line.get(i).longitude()});
        Point end = line.get(line.size() - 1);
        double[] tail = out.get(out.size() - 1);
        if (tail[0] != end.latitude() || tail[1] != end.longitude()) out.add(new double[]{end.latitude(), end.longitude()});
        return out;
    }

    public static double haversineM(double lat1, double lng1, double lat2, double lng2) {
        double r = 6_371_000;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double h = Math.pow(Math.sin(dLat / 2), 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) * Math.pow(Math.sin(dLng / 2), 2);
        return 2 * r * Math.asin(Math.sqrt(h));
    }

    static double haversineM(Point a, Point b) {
        return haversineM(a.latitude(), a.longitude(), b.latitude(), b.longitude());
    }

    private static Point interpolate(Point a, Point b, double t) {
        Double alt = a.altitudeM() != null && b.altitudeM() != null ? a.altitudeM() + (b.altitudeM() - a.altitudeM()) * t : null;
        return new Point(a.latitude() + (b.latitude() - a.latitude()) * t, a.longitude() + (b.longitude() - a.longitude()) * t, alt);
    }

    private static double[] smoothedAltitudes(List<Point> line) {
        if (line.isEmpty() || line.stream().anyMatch(p -> p.altitudeM() == null)) return null;
        int n = line.size();
        double[] out = new double[n];
        int half = SMOOTH_WINDOW / 2;
        for (int i = 0; i < n; i++) {
            double sum = 0;
            int count = 0;
            for (int j = Math.max(0, i - half); j <= Math.min(n - 1, i + half); j++) {
                sum += line.get(j).altitudeM();
                count++;
            }
            out[i] = sum / count;
        }
        return out;
    }
}
