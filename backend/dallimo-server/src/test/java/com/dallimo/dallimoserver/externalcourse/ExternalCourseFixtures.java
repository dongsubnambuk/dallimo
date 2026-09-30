package com.dallimo.dallimoserver.externalcourse;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

/** 외부 코스 테스트용 경로 · 응답 (Overpass JSON, GPX) */
final class ExternalCourseFixtures {

    static final double M_PER_DEG = 111_195.0;

    private ExternalCourseFixtures() {
    }

    /** 가운데를 도는 원 (닫힌 way). 둘레 = 2πr */
    static List<double[]> circle(double lat, double lng, double radiusM, int n) {
        List<double[]> out = new ArrayList<>();
        for (int i = 0; i <= n; i++) {
            double a = 2 * Math.PI * (i % n) / n;
            out.add(new double[]{lat + radiusM * Math.cos(a) / M_PER_DEG, lng + radiusM * Math.sin(a) / (M_PER_DEG * Math.cos(Math.toRadians(lat)))});
        }
        return out;
    }

    /** 북쪽으로 fromM부터 toM까지 곧은 선 */
    static List<double[]> north(double lat, double lng, double fromM, double toM, int n) {
        List<double[]> out = new ArrayList<>();
        for (int i = 0; i <= n; i++) out.add(new double[]{lat + (fromM + (toM - fromM) * i / n) / M_PER_DEG, lng});
        return out;
    }

    static List<double[]> reversed(List<double[]> line) {
        return new ArrayList<>(line.reversed());
    }

    static String geometry(List<double[]> line) {
        return line.stream().map(p -> String.format(Locale.ROOT, "{\"lat\":%.7f,\"lon\":%.7f}", p[0], p[1])).collect(Collectors.joining(",", "[", "]"));
    }

    static String way(long id, String tags, List<double[]> line) {
        return "{\"type\":\"way\",\"id\":%d,\"tags\":%s,\"geometry\":%s}".formatted(id, tags, geometry(line));
    }

    static String member(String role, List<double[]> line) {
        return "{\"type\":\"way\",\"ref\":1,\"role\":\"%s\",\"geometry\":%s}".formatted(role, geometry(line));
    }

    static String relation(long id, String tags, String... members) {
        return "{\"type\":\"relation\",\"id\":%d,\"tags\":%s,\"members\":[%s]}".formatted(id, tags, String.join(",", members));
    }

    static String overpass(String... elements) {
        return "{\"version\":0.6,\"elements\":[%s]}".formatted(String.join(",", elements));
    }

    static String gpx(String name, List<double[]> line, boolean ele) {
        String pts = line.stream().map(p -> String.format(Locale.ROOT, "<trkpt lat=\"%.7f\" lon=\"%.7f\">%s</trkpt>", p[0], p[1],
                ele ? "<ele>" + (40 + line.indexOf(p) % 7) + ".0</ele>" : "")).collect(Collectors.joining());
        return """
                <?xml version="1.0" encoding="UTF-8"?>
                <gpx version="1.1" creator="test" xmlns="http://www.topografix.com/GPX/1/1">
                  <metadata><name>%s</name></metadata>
                  <trk><name>%s</name><trkseg>%s</trkseg></trk>
                </gpx>
                """.formatted(name, name, pts);
    }
}
