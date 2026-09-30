package com.dallimo.dallimoserver.externalcourse.domain;

import tools.jackson.databind.JsonNode;

import java.util.ArrayList;
import java.util.List;

/**
 * 한국관광공사 두루누비 정보 서비스(공공데이터포털 15101974) courseList 응답(_type=json) 읽기.
 * 코스 경로는 gpxpath의 GPX 파일에 있다. 목록 값은 모두 문자열로 온다.
 */
public final class DurunubiParser {

    public static final String ATTRIBUTION = "한국관광공사 두루누비";
    public static final String LICENSE = "공공데이터포털 이용허락 제한 없음";
    // brdDiv: DNWW 걷기길 · DNBW 자전거길
    public static final String WALK = "DNWW";

    public record Item(String crsIdx, String name, Double distanceKm, String difficulty, String summary, String region, String gpxUrl,
                       String brdDiv) {
    }

    public record Page(String resultCode, String resultMsg, int totalCount, List<Item> items) {

        public boolean ok() {
            return "0000".equals(resultCode) || "00".equals(resultCode);
        }
    }

    private DurunubiParser() {
    }

    public static Page parse(JsonNode root) {
        JsonNode res = root.path("response");
        JsonNode header = res.path("header");
        JsonNode body = res.path("body");
        List<Item> items = new ArrayList<>();
        // 결과가 하나면 item이 배열이 아니라 객체로, 없으면 items가 빈 문자열로 온다
        JsonNode item = body.path("items").path("item");
        if (item.isArray()) {
            for (JsonNode i : item) items.add(item(i));
        } else if (item.isObject()) {
            items.add(item(item));
        }
        return new Page(header.path("resultCode").asString(""), header.path("resultMsg").asString(""), body.path("totalCount").asInt(0), items);
    }

    private static Item item(JsonNode i) {
        return new Item(text(i, "crsIdx"), text(i, "crsKorNm"), number(text(i, "crsDstnc")), difficulty(text(i, "crsLevel")),
                text(i, "crsSummary"), text(i, "sigun"), text(i, "gpxpath"), text(i, "brdDiv"));
    }

    /** crsLevel 1 · 2 · 3 → 달리모 난이도 */
    static String difficulty(String level) {
        if (level == null) return null;
        return switch (level) {
            case "1" -> "EASY";
            case "2" -> "MODERATE";
            case "3" -> "HARD";
            default -> null;
        };
    }

    private static String text(JsonNode n, String key) {
        JsonNode v = n.path(key);
        if (v.isMissingNode() || v.isNull()) return null;
        String s = v.asString("").trim();
        return s.isEmpty() ? null : s;
    }

    private static Double number(String s) {
        if (s == null) return null;
        try {
            return Double.parseDouble(s);
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
