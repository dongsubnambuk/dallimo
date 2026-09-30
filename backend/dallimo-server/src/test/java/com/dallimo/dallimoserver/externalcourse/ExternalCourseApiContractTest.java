package com.dallimo.dallimoserver.externalcourse;

import com.jayway.jsonpath.JsonPath;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import org.springframework.test.web.servlet.request.MockMultipartHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import static com.dallimo.dallimoserver.externalcourse.ExternalCourseFixtures.circle;
import static com.dallimo.dallimoserver.externalcourse.ExternalCourseFixtures.gpx;
import static com.dallimo.dallimoserver.externalcourse.ExternalCourseFixtures.member;
import static com.dallimo.dallimoserver.externalcourse.ExternalCourseFixtures.north;
import static com.dallimo.dallimoserver.externalcourse.ExternalCourseFixtures.overpass;
import static com.dallimo.dallimoserver.externalcourse.ExternalCourseFixtures.relation;
import static com.dallimo.dallimoserver.externalcourse.ExternalCourseFixtures.reversed;
import static com.dallimo.dallimoserver.externalcourse.ExternalCourseFixtures.way;
import static org.assertj.core.api.Assertions.assertThat;

/**
 * 외부 추천 코스 가져오기 (FOUNDATION-DECISION-LOG 52항). MySQL(개발)과 MariaDB(운영) 양쪽에서 같은 결과여야 한다.
 * Overpass · 두루누비 · Open-Meteo는 이 테스트가 띄운 가짜 서버가 대신한다 (응답 모양은 각 API 문서 기준).
 */
abstract class ExternalCourseApiContractTest {

    static final String KEY = "test-admin-key";
    // 두루누비 인증키에 + · / · = 가 들어 있어도 한 번만 인코딩해서 보내야 한다
    static final String SERVICE_KEY = "ab+c/d==";
    static final double LAT = 33.45;
    static final double LNG = 126.55;
    static final HttpServer STUB = stub();

    @Autowired
    MockMvcTester mvc;

    @DynamicPropertySource
    static void externalApis(DynamicPropertyRegistry r) {
        String base = "http://127.0.0.1:" + STUB.getAddress().getPort();
        r.add("dallimo.external-courses.admin-key", () -> KEY);
        r.add("dallimo.external-courses.osm.overpass-url", () -> base + "/overpass");
        r.add("dallimo.external-courses.durunubi.base-url", () -> base + "/durunubi");
        r.add("dallimo.external-courses.durunubi.service-key", () -> SERVICE_KEY);
        r.add("dallimo.external-courses.elevation.enabled", () -> "true");
        r.add("dallimo.external-courses.elevation.url", () -> base + "/elevation");
    }

    @Test
    void importsOsmDurunubiAndGpxOnce() {
        // 관리 키
        assertThat(osm(null, "{\"south\":33.4,\"west\":126.5,\"north\":33.5,\"east\":126.6}")).hasStatus(403);
        assertThat(osm("wrong", "{\"south\":33.4,\"west\":126.5,\"north\":33.5,\"east\":126.6}")).hasStatus(403);
        // 박스가 크거나 뒤집혔으면 400
        assertThat(osm(KEY, "{\"south\":33.0,\"west\":126.0,\"north\":34.0,\"east\":127.0}")).hasStatus(400);
        assertThat(osm(KEY, "{\"south\":33.5,\"west\":126.5,\"north\":33.4,\"east\":126.6}")).hasStatus(400);

        // OSM: relation 1개 + 둘레길 1개, 짧은 둘레길은 코스가 아니다
        String first = body(osm(KEY, "{\"south\":33.4,\"west\":126.5,\"north\":33.5,\"east\":126.6}"));
        assertThat((Integer) JsonPath.read(first, "$.data.fetched")).isEqualTo(3);
        assertThat((Integer) JsonPath.read(first, "$.data.created")).isEqualTo(2);
        assertThat((Integer) JsonPath.read(first, "$.data.skippedInvalid")).isEqualTo(1);
        assertThat((List<?>) JsonPath.read(first, "$.data.errors")).isEmpty();
        List<Number> osmIds = JsonPath.read(first, "$.data.courseIds");

        // 다시 가져와도 같은 원본은 한 번만
        String again = body(osm(KEY, "{\"south\":33.4,\"west\":126.5,\"north\":33.5,\"east\":126.6}"));
        assertThat((Integer) JsonPath.read(again, "$.data.created")).isZero();
        assertThat((Integer) JsonPath.read(again, "$.data.skippedExisting")).isEqualTo(2);

        // 상세: 만든 사람 달리모, 출처 표시, 고도는 고도 API로 채운다
        String river = body(mvc.get().uri("/api/v1/courses/" + osmIds.get(0).longValue()).exchange());
        assertThat((String) JsonPath.read(river, "$.data.name")).isEqualTo("제주 해안 달리기길");
        assertThat((String) JsonPath.read(river, "$.data.creatorName")).isEqualTo("달리모");
        assertThat((String) JsonPath.read(river, "$.data.source.kind")).isEqualTo("OSM");
        assertThat((String) JsonPath.read(river, "$.data.source.attribution")).isEqualTo("© OpenStreetMap contributors");
        assertThat((String) JsonPath.read(river, "$.data.source.license")).isEqualTo("ODbL 1.0");
        assertThat((String) JsonPath.read(river, "$.data.source.url")).isEqualTo("https://www.openstreetmap.org/relation/101");
        assertThat((Integer) JsonPath.read(river, "$.data.distanceM")).isBetween(1195, 1205);
        assertThat((List<?>) JsonPath.read(river, "$.data.elevationProfile")).isNotEmpty();
        // 목록에도 출처 종류
        String nearby = body(mvc.get().uri("/api/v1/courses/nearby?lat=" + LAT + "&lng=" + LNG + "&radius=3000").exchange());
        List<String> sources = JsonPath.read(nearby, "$.data.items[?(@.id == " + osmIds.get(1) + ")].source");
        assertThat(sources).containsExactly("OSM");

        // 두루누비: 걷기길 1개만 (자전거길 · 긴 길은 건너뛴다)
        String d = body(admin("/api/v1/admin/external-courses/durunubi", KEY));
        assertThat((Integer) JsonPath.read(d, "$.data.fetched")).isEqualTo(3);
        assertThat((Integer) JsonPath.read(d, "$.data.created")).isEqualTo(1);
        assertThat((Integer) JsonPath.read(d, "$.data.skippedInvalid")).isEqualTo(2);
        // 길 목록 2쪽의 호출 한도 오류(XML)는 코드 · 안내와 함께 남는다
        List<String> errors = JsonPath.read(d, "$.data.errors");
        assertThat(errors).singleElement().asString().contains("길 목록 응답 22 LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR").contains("하루 1,000건");
        long olle = ((Number) JsonPath.<List<Number>>read(d, "$.data.courseIds").get(0)).longValue();
        String o = body(mvc.get().uri("/api/v1/courses/" + olle).exchange());
        assertThat((String) JsonPath.read(o, "$.data.source.kind")).isEqualTo("DURUNUBI");
        assertThat((String) JsonPath.read(o, "$.data.source.attribution")).isEqualTo("한국관광공사 두루누비");
        assertThat((String) JsonPath.read(o, "$.data.difficulty")).isEqualTo("MODERATE");
        assertThat((String) JsonPath.read(o, "$.data.region")).isEqualTo("제주 서귀포시");
        assertThat((String) JsonPath.read(o, "$.data.description")).isEqualTo("바닷가를 따라 걷는 길\n쉬운 구간");
        assertThat((List<String>) JsonPath.read(o, "$.data.tags")).containsExactly("제주 올레길", "순환형");
        assertThat((String) JsonPath.read(o, "$.data.status")).isEqualTo("NEW");
        assertThat(body(admin("/api/v1/admin/external-courses/durunubi", KEY))).contains("\"skippedExisting\":1");

        // GPX: 이미 있는 둘레길과 같은 자리 · 길이면 건너뛴다
        byte[] loop = gpx("같은 둘레길", circle(LAT + 0.01, LNG, 250, 36), false).getBytes(StandardCharsets.UTF_8);
        assertThat(body(gpxUpload(KEY, loop, "산림청 숲길"))).contains("\"skippedDuplicate\":1");
        byte[] trail = gpx("숲길 1구간", north(LAT + 0.2, LNG + 0.2, 0, 2500, 25), true).getBytes(StandardCharsets.UTF_8);
        String g = body(gpxUpload(KEY, trail, "산림청 숲길"));
        assertThat((Integer) JsonPath.read(g, "$.data.created")).isEqualTo(1);
        long forest = ((Number) JsonPath.<List<Number>>read(g, "$.data.courseIds").get(0)).longValue();
        String f = body(mvc.get().uri("/api/v1/courses/" + forest).exchange());
        assertThat((String) JsonPath.read(f, "$.data.name")).isEqualTo("숲길 1구간");
        assertThat((String) JsonPath.read(f, "$.data.source.kind")).isEqualTo("GPX");
        assertThat((String) JsonPath.read(f, "$.data.source.attribution")).isEqualTo("산림청 숲길");
        // 같은 파일은 한 번만, 출처가 없거나 GPX가 아니면 400
        assertThat(body(gpxUpload(KEY, trail, "산림청 숲길"))).contains("\"skippedExisting\":1");
        assertThat(gpxUpload(KEY, trail, null)).hasStatus(400);
        assertThat(gpxUpload(KEY, "hello".getBytes(StandardCharsets.UTF_8), "출처")).hasStatus(400);
        assertThat(gpxUpload(null, trail, "산림청 숲길")).hasStatus(403);
    }

    // ── 가짜 외부 서버 ──

    private static HttpServer stub() {
        try {
            HttpServer s = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            s.createContext("/overpass", ex -> {
                String form = new String(ex.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
                if (!"POST".equals(ex.getRequestMethod()) || !form.startsWith("data=")) {
                    send(ex, 400, "bad");
                    return;
                }
                send(ex, 200, overpass(
                        relation(101, "{\"type\":\"route\",\"route\":\"running\",\"name\":\"Jeju Coast Run\",\"name:ko\":\"제주 해안 달리기길\"}",
                                member("", north(LAT, LNG, 0, 600, 6)), member("", reversed(north(LAT, LNG, 600, 1200, 6)))),
                        way(202, "{\"highway\":\"footway\",\"name\":\"연못 둘레길\"}", circle(LAT + 0.01, LNG, 250, 36)),
                        way(303, "{\"highway\":\"footway\",\"name\":\"작은 연못\"}", circle(LAT + 0.02, LNG, 60, 12))));
            });
            // 인증키 · 걷기길 · JSON 요청이 맞아야 답한다. 공공데이터포털 오류는 XML로만 온다 (매뉴얼 v4.1)
            s.createContext("/durunubi/routeList", ex -> {
                if (!durunubiQueryOk(ex)) return;
                // 길 목록 2쪽은 호출 한도 초과 → 길 이름 일부 없이도 코스는 가져온다
                if (ex.getRequestURI().getRawQuery().contains("pageNo=2")) {
                    send(ex, 403, portalError("22", "LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR"));
                    return;
                }
                send(ex, 200, """
                        {"response":{"header":{"resultCode":"0000","resultMsg":"OK"},"body":{"items":{"item":[
                          {"routeIdx":"T_ROUTE_TEST1","themeNm":"제주 올레길","linemsg":"바닷길","brdDiv":"DNWW"}
                        ]},"numOfRows":100,"pageNo":1,"totalCount":150}}}""");
            });
            s.createContext("/durunubi/courseList", ex -> {
                if (!durunubiQueryOk(ex)) return;
                String gpx = "http://127.0.0.1:" + ex.getLocalAddress().getPort() + "/gpx/olle.gpx";
                send(ex, 200, """
                        {"response":{"header":{"resultCode":"0000","resultMsg":"OK"},"body":{"items":{"item":[
                          {"routeIdx":"T_ROUTE_TEST1","crsIdx":"T_CRS_TEST1","crsKorNm":"올레 테스트 코스","crsDstnc":"1.5","crsTotlRqrmHour":"30","crsLevel":"2","crsCycle":"순환형","crsContents":"<p>바닷가를 따라 걷는 길</p><br>쉬운 구간","crsSummary":"- 개요","sigun":"제주 서귀포시","brdDiv":"DNWW","gpxpath":"%s"},
                          {"crsIdx":"T_CRS_BIKE","crsKorNm":"자전거길","crsDstnc":"12","crsLevel":"1","brdDiv":"DNBW","gpxpath":"%s"},
                          {"crsIdx":"T_CRS_LONG","crsKorNm":"긴 종주길","crsDstnc":"45.2","crsLevel":"3","brdDiv":"DNWW","gpxpath":"%s"}
                        ]},"numOfRows":100,"pageNo":1,"totalCount":3}}}""".formatted(gpx, gpx, gpx));
            });
            s.createContext("/gpx/olle.gpx", ex -> send(ex, 200, gpx("올레", north(LAT - 0.1, LNG + 0.1, 0, 1500, 15), true)));
            s.createContext("/elevation", ex -> {
                String query = ex.getRequestURI().getQuery();
                String lat = query.replaceAll(".*latitude=([^&]*).*", "$1");
                int n = lat.split(",").length;
                send(ex, 200, IntStream.range(0, n).mapToObj(i -> String.format(Locale.ROOT, "%.1f", 30.0 + i % 5))
                        .collect(Collectors.joining(",", "{\"elevation\":[", "]}")));
            });
            s.start();
            return s;
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    private static boolean durunubiQueryOk(HttpExchange ex) throws IOException {
        String query = ex.getRequestURI().getRawQuery();
        if (query == null || !query.contains("serviceKey=ab%2Bc%2Fd%3D%3D") || !query.contains("_type=json") || !query.contains("brdDiv=DNWW")
                || !query.contains("MobileOS=ETC") || !query.contains("MobileApp=DALLIMO")) {
            send(ex, 403, portalError("30", "SERVICE_KEY_IS_NOT_REGISTERED_ERROR"));
            return false;
        }
        return true;
    }

    private static String portalError(String code, String message) {
        return """
                <OpenAPI_ServiceResponse><cmmMsgHeader><errMsg>SERVICE ERROR</errMsg><returnAuthMsg>%s</returnAuthMsg>\
                <returnReasonCode>%s</returnReasonCode></cmmMsgHeader></OpenAPI_ServiceResponse>""".formatted(message, code);
    }

    private static void send(HttpExchange ex, int status, String body) throws IOException {
        byte[] b = body.getBytes(StandardCharsets.UTF_8);
        ex.getResponseHeaders().add("Content-Type", body.startsWith("<OpenAPI") ? "text/xml" : body.startsWith("<") ? "application/gpx+xml" : "application/json");
        ex.sendResponseHeaders(status, b.length);
        ex.getResponseBody().write(b);
        ex.close();
    }

    // ── helpers ──

    private MvcTestResult osm(String key, String json) {
        var req = mvc.post().uri("/api/v1/admin/external-courses/osm").contentType(MediaType.APPLICATION_JSON).content(json);
        if (key != null) req = req.header("X-Admin-Key", key);
        return req.exchange();
    }

    private MvcTestResult admin(String uri, String key) {
        var req = mvc.post().uri(uri);
        if (key != null) req = req.header("X-Admin-Key", key);
        return req.exchange();
    }

    private MvcTestResult gpxUpload(String key, byte[] file, String attribution) {
        MockMultipartHttpServletRequestBuilder req = MockMvcRequestBuilders.multipart("/api/v1/admin/external-courses/gpx");
        req.file(new MockMultipartFile("file", "course.gpx", "application/gpx+xml", file));
        if (attribution != null) req.param("attribution", attribution);
        if (key != null) req.header("X-Admin-Key", key);
        return mvc.perform(req);
    }

    private static String body(MvcTestResult r) {
        try {
            return r.getResponse().getContentAsString(StandardCharsets.UTF_8);
        } catch (java.io.UnsupportedEncodingException e) {
            throw new IllegalStateException(e);
        }
    }
}
