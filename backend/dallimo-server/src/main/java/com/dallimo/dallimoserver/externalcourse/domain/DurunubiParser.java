package com.dallimo.dallimoserver.externalcourse.domain;

import tools.jackson.databind.JsonNode;

import java.util.ArrayList;
import java.util.List;
import java.util.function.Function;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 한국관광공사 두루누비 정보 서비스(공공데이터포털 15101974, TourAPI 활용매뉴얼(두루누비) v4.1) 응답 읽기.
 * - routeList(길 목록): 길 고유번호 → 길 이름 (예: 해파랑길)
 * - courseList(코스 목록): 코스 고유번호 · 이름 · 길이(km) · 난이도 · 순환형태 · 설명 · 행정구역 · GPX 경로
 * 목록 값은 모두 문자열로 온다. 공공데이터포털 오류(인증키 · 호출 한도)는 _type=json이어도 XML로만 온다.
 */
public final class DurunubiParser {

    public static final String ATTRIBUTION = "한국관광공사 두루누비";
    public static final String LICENSE = "공공데이터포털 이용허락 제한 없음";
    // brdDiv: DNWW 걷기길 · DNBW 자전거길
    public static final String WALK = "DNWW";
    // crsCycle 순환형태
    static final String LOOP = "순환형";

    public record Route(String routeIdx, String name, String brdDiv) {
    }

    public record Item(String crsIdx, String routeIdx, String name, Double distanceKm, String difficulty, boolean loop, String description,
                       String region, String gpxUrl, String brdDiv) {
    }

    public record Page<T>(String resultCode, String resultMsg, int totalCount, List<T> items) {

        /** 제공기관 정상 코드 0000(매뉴얼 예제) · 00(코드표) */
        public boolean ok() {
            return "0000".equals(resultCode) || "00".equals(resultCode);
        }
    }

    private DurunubiParser() {
    }

    public static Page<Route> routes(JsonNode root) {
        return page(root, i -> new Route(text(i, "routeIdx"), text(i, "themeNm"), text(i, "brdDiv")));
    }

    public static Page<Item> courses(JsonNode root) {
        return page(root, i -> new Item(text(i, "crsIdx"), text(i, "routeIdx"), text(i, "crsKorNm"), number(text(i, "crsDstnc")),
                difficulty(text(i, "crsLevel")), LOOP.equals(text(i, "crsCycle")),
                // 코스 설명(문장)이 없으면 코스 개요(- 항목들)
                text(i, "crsContents") != null ? text(i, "crsContents") : text(i, "crsSummary"),
                text(i, "sigun"), text(i, "gpxpath"), text(i, "brdDiv")));
    }

    /**
     * XML 응답. 공공데이터포털 오류(&lt;OpenAPI_ServiceResponse&gt;의 returnReasonCode · returnAuthMsg)나
     * 제공기관 오류(&lt;response&gt;&lt;header&gt;의 resultCode · resultMsg). 목록은 읽지 않는다(JSON으로 요청한다)
     */
    public static <T> Page<T> xml(String body) {
        String code = tag(body, "returnReasonCode");
        String msg = tag(body, "returnAuthMsg");
        if (code == null) {
            code = tag(body, "resultCode");
            msg = tag(body, "resultMsg");
        }
        if (msg == null) msg = tag(body, "errMsg");
        return new Page<>(code == null ? "XML" : code, msg == null ? "알 수 없는 XML 응답" : msg, 0, List.of());
    }

    private static <T> Page<T> page(JsonNode root, Function<JsonNode, T> read) {
        JsonNode res = root.path("response");
        JsonNode header = res.path("header");
        JsonNode body = res.path("body");
        List<T> items = new ArrayList<>();
        // 결과가 하나면 item이 배열이 아니라 객체로, 없으면 items가 빈 문자열로 온다
        JsonNode item = body.path("items").path("item");
        if (item.isArray()) {
            for (JsonNode i : item) items.add(read.apply(i));
        } else if (item.isObject()) {
            items.add(read.apply(item));
        }
        return new Page<>(header.path("resultCode").asString(""), header.path("resultMsg").asString(""), body.path("totalCount").asInt(0), items);
    }

    /** crsLevel 1(하) · 2(중) · 3(상) → 달리모 난이도 */
    static String difficulty(String level) {
        if (level == null) return null;
        return switch (level) {
            case "1" -> "EASY";
            case "2" -> "MODERATE";
            case "3" -> "HARD";
            default -> null;
        };
    }

    private static String tag(String xml, String name) {
        Matcher m = Pattern.compile("<" + name + ">\\s*([^<]*?)\\s*</" + name + ">").matcher(xml);
        return m.find() && !m.group(1).isEmpty() ? m.group(1) : null;
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
