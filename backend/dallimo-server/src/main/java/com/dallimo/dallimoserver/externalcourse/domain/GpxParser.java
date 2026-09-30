package com.dallimo.dallimoserver.externalcourse.domain;

import com.dallimo.dallimoserver.course.domain.CourseRoute;

import javax.xml.stream.XMLInputFactory;
import javax.xml.stream.XMLStreamConstants;
import javax.xml.stream.XMLStreamException;
import javax.xml.stream.XMLStreamReader;
import java.io.ByteArrayInputStream;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * GPX 1.0 · 1.1 읽기 (두루누비 코스 GPX, 관리자가 올린 GPX). trkseg마다 trkpt를 순서대로 읽고, trk가 없으면 rte의 rtept를 쓴다.
 * 끝과 시작이 이어진(JOIN_M 안) 조각은 한 선으로 잇고, 떨어진 조각은 다른 선으로 둔다.
 * 실제 두루누비 GPX 중에는 트랙이 두 개(코스 + 이웃 코스 · 우회로)인 파일이 있어서 이어 붙이면 경로가 두 배가 된다.
 * ele가 있으면 고도로 쓴다. 외부 파일이라 DTD · 외부 엔티티는 읽지 않는다.
 */
public final class GpxParser {

    // 이 거리 안에서 끝나고 시작하는 조각은 한 선으로 본다
    static final double JOIN_M = 50;

    /** lines: 이어진 조각끼리 이은 선들 (파일 순서) */
    public record Gpx(String name, List<List<CourseRoute.Point>> lines) {

        /** 코스로 쓸 선. 기대 길이(목록의 코스 길이)를 알면 가장 가까운 선, 모르면 첫 선. 없으면 빈 목록 */
        public List<CourseRoute.Point> line(Double expectedM) {
            if (lines.isEmpty()) return List.of();
            if (expectedM == null) return lines.get(0);
            return lines.stream().min(Comparator.comparingDouble(l -> Math.abs(CourseRoute.lengthM(l) - expectedM))).orElseThrow();
        }
    }

    private GpxParser() {
    }

    /** 읽을 수 없는 파일이면 IllegalArgumentException */
    public static Gpx parse(byte[] bytes) {
        XMLInputFactory f = XMLInputFactory.newFactory();
        f.setProperty(XMLInputFactory.SUPPORT_DTD, false);
        f.setProperty(XMLInputFactory.IS_SUPPORTING_EXTERNAL_ENTITIES, false);
        List<List<CourseRoute.Point>> track = new ArrayList<>();
        List<List<CourseRoute.Point>> route = new ArrayList<>();
        String name = null;
        try {
            XMLStreamReader r = f.createXMLStreamReader(new ByteArrayInputStream(bytes));
            String parent = null;
            Double lat = null;
            Double lon = null;
            Double ele = null;
            String pointKind = null;
            while (r.hasNext()) {
                int e = r.next();
                if (e == XMLStreamConstants.START_ELEMENT) {
                    String local = r.getLocalName();
                    switch (local) {
                        case "trkpt", "rtept" -> {
                            pointKind = local;
                            lat = number(r.getAttributeValue(null, "lat"));
                            lon = number(r.getAttributeValue(null, "lon"));
                            ele = null;
                        }
                        case "ele" -> {
                            if (pointKind != null) ele = number(r.getElementText());
                        }
                        case "name" -> {
                            // 첫 trk · rte · metadata 이름
                            if (name == null && pointKind == null && ("trk".equals(parent) || "rte".equals(parent) || "metadata".equals(parent))) {
                                String t = r.getElementText().trim();
                                if (!t.isEmpty()) name = t;
                            }
                        }
                        case "trkseg" -> track.add(new ArrayList<>());
                        case "rte" -> {
                            parent = local;
                            route.add(new ArrayList<>());
                        }
                        case "trk", "metadata" -> parent = local;
                        default -> {
                        }
                    }
                } else if (e == XMLStreamConstants.END_ELEMENT) {
                    String local = r.getLocalName();
                    if (local.equals(pointKind)) {
                        if (lat != null && lon != null && valid(lat, lon)) {
                            List<List<CourseRoute.Point>> parts = local.equals("trkpt") ? track : route;
                            // trkseg 없이 trkpt가 오는 파일도 받는다
                            if (parts.isEmpty()) parts.add(new ArrayList<>());
                            parts.get(parts.size() - 1).add(new CourseRoute.Point(lat, lon, ele));
                        }
                        pointKind = null;
                    }
                }
            }
        } catch (XMLStreamException | RuntimeException e) {
            throw new IllegalArgumentException("GPX 파일을 읽을 수 없어요.", e);
        }
        List<List<CourseRoute.Point>> parts = track.stream().anyMatch(t -> !t.isEmpty()) ? track : route;
        return new Gpx(name, join(parts));
    }

    /** 앞 선의 끝과 이어지는 조각은 붙이고(겹친 점은 한 번), 아니면 새 선 */
    static List<List<CourseRoute.Point>> join(List<List<CourseRoute.Point>> parts) {
        List<List<CourseRoute.Point>> lines = new ArrayList<>();
        for (List<CourseRoute.Point> part : parts) {
            if (part.isEmpty()) continue;
            List<CourseRoute.Point> last = lines.isEmpty() ? null : lines.get(lines.size() - 1);
            if (last != null && gap(last.get(last.size() - 1), part.get(0)) <= JOIN_M) {
                last.addAll(gap(last.get(last.size() - 1), part.get(0)) < 1 ? part.subList(1, part.size()) : part);
            } else {
                lines.add(new ArrayList<>(part));
            }
        }
        return lines.stream().filter(l -> l.size() >= 2).map(List::copyOf).toList();
    }

    private static double gap(CourseRoute.Point a, CourseRoute.Point b) {
        return CourseRoute.haversineM(a.latitude(), a.longitude(), b.latitude(), b.longitude());
    }

    static boolean valid(double lat, double lon) {
        return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180 && !(lat == 0 && lon == 0);
    }

    private static Double number(String s) {
        if (s == null) return null;
        try {
            double v = Double.parseDouble(s.trim());
            return Double.isFinite(v) ? v : null;
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
