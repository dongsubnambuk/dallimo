package com.dallimo.dallimoserver.externalcourse.domain;

import com.dallimo.dallimoserver.course.domain.CourseRoute;
import com.dallimo.dallimoserver.course.domain.CourseSource;
import tools.jackson.databind.JsonNode;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * OpenStreetMap Overpass API 응답(out geom) → 코스 후보.
 * - route relation(running · foot · hiking · fitness_trail): 멤버 way를 멤버 순서대로 이어 붙인다. 끊긴 곳이 있으면 버린다
 * - 이름 있는 닫힌 보행로 way(호수 · 공원 둘레길): way 그대로
 * 이름이 없거나 통행이 막힌 길(access=private · no, foot=no)은 버린다.
 */
public final class OverpassParser {

    public static final String ATTRIBUTION = "© OpenStreetMap contributors";
    public static final String LICENSE = "ODbL 1.0";
    // relation 멤버 way 끝과 다음 way 시작이 이만큼 떨어져 있으면 이어진 길로 보지 않는다
    static final double MAX_GAP_M = 30;
    // 본 경로가 아닌 멤버 (갈림길 · 접근로 · 정류장)
    static final Set<String> SKIP_ROLES = Set.of("alternative", "excursion", "approach", "connection", "platform", "stop", "guidepost");

    private OverpassParser() {
    }

    /** 이 박스 안의 후보를 찾는 Overpass QL (south, west, north, east) */
    public static String query(double south, double west, double north, double east, int timeoutSec) {
        String bbox = String.format(Locale.ROOT, "%.6f,%.6f,%.6f,%.6f", south, west, north, east);
        return """
                [out:json][timeout:%d];
                (
                  relation["type"="route"]["route"~"^(running|foot|hiking|fitness_trail)$"]["name"](%s);
                  way["highway"~"^(footway|path|pedestrian|track|cycleway)$"]["name"](if:is_closed())(%s);
                );
                out geom;
                """.formatted(timeoutSec, bbox, bbox);
    }

    public static List<ExternalCourse> parse(JsonNode root) {
        List<ExternalCourse> out = new ArrayList<>();
        for (JsonNode el : root.path("elements")) {
            String type = el.path("type").asString("");
            long id = el.path("id").asLong(0);
            JsonNode tags = el.path("tags");
            String name = name(tags);
            if (id == 0 || name == null || blocked(tags)) continue;
            List<CourseRoute.Point> line = switch (type) {
                case "relation" -> relationLine(el.path("members"));
                case "way" -> geometry(el.path("geometry"));
                default -> null;
            };
            if (line == null || line.size() < 2) continue;
            String ref = type + "/" + id;
            out.add(new ExternalCourse(CourseSource.OSM, ref, name, text(tags, "description"), null, null, List.of(), line,
                    ATTRIBUTION, LICENSE, "https://www.openstreetmap.org/" + ref));
        }
        return out;
    }

    /** 멤버 way를 순서대로 잇는다. 필요하면 뒤집어 붙이고, 이어지지 않으면 null */
    static List<CourseRoute.Point> relationLine(JsonNode members) {
        List<List<CourseRoute.Point>> ways = new ArrayList<>();
        for (JsonNode m : members) {
            if (!"way".equals(m.path("type").asString("")) || SKIP_ROLES.contains(m.path("role").asString(""))) continue;
            List<CourseRoute.Point> g = geometry(m.path("geometry"));
            if (g.size() >= 2) ways.add(g);
        }
        return stitch(ways);
    }

    static List<CourseRoute.Point> stitch(List<List<CourseRoute.Point>> ways) {
        if (ways.isEmpty()) return null;
        List<CourseRoute.Point> chain = new ArrayList<>(ways.get(0));
        for (int i = 1; i < ways.size(); i++) {
            List<CourseRoute.Point> w = ways.get(i);
            CourseRoute.Point first = w.get(0);
            CourseRoute.Point last = w.get(w.size() - 1);
            if (i == 1) {
                // 첫 way의 방향은 두 번째 way에 닿는 쪽이 끝이 되게
                double headGap = Math.min(dist(chain.get(0), first), dist(chain.get(0), last));
                double tailGap = Math.min(dist(chain.get(chain.size() - 1), first), dist(chain.get(chain.size() - 1), last));
                if (headGap < tailGap) chain = new ArrayList<>(chain.reversed());
            }
            CourseRoute.Point end = chain.get(chain.size() - 1);
            double toFirst = dist(end, first);
            double toLast = dist(end, last);
            if (Math.min(toFirst, toLast) > MAX_GAP_M) return null;
            List<CourseRoute.Point> next = toFirst <= toLast ? w : w.reversed();
            chain.addAll(dist(end, next.get(0)) < 1 ? next.subList(1, next.size()) : next);
        }
        return chain;
    }

    static List<CourseRoute.Point> geometry(JsonNode geometry) {
        List<CourseRoute.Point> out = new ArrayList<>();
        for (JsonNode p : geometry) {
            if (p == null || p.isNull() || !p.has("lat") || !p.has("lon")) continue;
            double lat = p.path("lat").asDouble();
            double lon = p.path("lon").asDouble();
            if (GpxParser.valid(lat, lon)) out.add(new CourseRoute.Point(lat, lon, null));
        }
        return out;
    }

    static String name(JsonNode tags) {
        return text(tags, "name");
    }

    static boolean blocked(JsonNode tags) {
        String access = text(tags, "access");
        String foot = text(tags, "foot");
        return "private".equals(access) || "no".equals(access) || "no".equals(foot);
    }

    // 한국어 값(key:ko)이 있으면 그것을 쓴다
    private static String text(JsonNode tags, String key) {
        String ko = tags.path(key + ":ko").asString(null);
        String v = ko != null && !ko.isBlank() ? ko : tags.path(key).asString(null);
        return v == null || v.isBlank() ? null : v.trim();
    }

    private static double dist(CourseRoute.Point a, CourseRoute.Point b) {
        return CourseRoute.haversineM(a.latitude(), a.longitude(), b.latitude(), b.longitude());
    }
}
