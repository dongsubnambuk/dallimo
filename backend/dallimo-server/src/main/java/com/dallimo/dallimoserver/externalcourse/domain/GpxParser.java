package com.dallimo.dallimoserver.externalcourse.domain;

import com.dallimo.dallimoserver.course.domain.CourseRoute;

import javax.xml.stream.XMLInputFactory;
import javax.xml.stream.XMLStreamConstants;
import javax.xml.stream.XMLStreamException;
import javax.xml.stream.XMLStreamReader;
import java.io.ByteArrayInputStream;
import java.util.ArrayList;
import java.util.List;

/**
 * GPX 1.0 · 1.1 읽기 (두루누비 코스 GPX, 관리자가 올린 GPX). trk의 trkpt를 순서대로 잇고, trk가 없으면 rte의 rtept를 쓴다.
 * ele가 있으면 고도로 쓴다. 외부 파일이라 DTD · 외부 엔티티는 읽지 않는다.
 */
public final class GpxParser {

    public record Gpx(String name, List<CourseRoute.Point> points) {
    }

    private GpxParser() {
    }

    /** 읽을 수 없는 파일이면 IllegalArgumentException */
    public static Gpx parse(byte[] bytes) {
        XMLInputFactory f = XMLInputFactory.newFactory();
        f.setProperty(XMLInputFactory.SUPPORT_DTD, false);
        f.setProperty(XMLInputFactory.IS_SUPPORTING_EXTERNAL_ENTITIES, false);
        List<CourseRoute.Point> track = new ArrayList<>();
        List<CourseRoute.Point> route = new ArrayList<>();
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
                        case "trk", "rte", "metadata" -> parent = local;
                        default -> {
                        }
                    }
                } else if (e == XMLStreamConstants.END_ELEMENT) {
                    String local = r.getLocalName();
                    if (local.equals(pointKind)) {
                        if (lat != null && lon != null && valid(lat, lon)) {
                            (local.equals("trkpt") ? track : route).add(new CourseRoute.Point(lat, lon, ele));
                        }
                        pointKind = null;
                    }
                }
            }
        } catch (XMLStreamException | RuntimeException e) {
            throw new IllegalArgumentException("GPX 파일을 읽을 수 없어요.", e);
        }
        return new Gpx(name, track.isEmpty() ? route : track);
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
