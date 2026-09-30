package com.dallimo.dallimoserver.externalcourse.infrastructure;

import com.dallimo.dallimoserver.externalcourse.application.ExternalCourseProperties;
import com.dallimo.dallimoserver.externalcourse.domain.DurunubiParser;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.function.Function;
import java.util.regex.Pattern;

/**
 * 한국관광공사 두루누비 정보 서비스 (공공데이터포털 15101974, TourAPI 활용매뉴얼(두루누비) v4.1).
 * 길 목록(routeList) · 코스 목록(courseList) · 코스 GPX 파일.
 * 인증키는 포털의 Encoding 키 · Decoding 키 어느 쪽이든 받아 한 번만 인코딩해서 보낸다 (+ · / · = 가 그대로 가거나 두 번 인코딩되면 키가 틀렸다고 한다).
 * 오류 응답은 HTTP 상태와 관계없이 본문을 읽는다 (공공데이터포털 오류는 XML로만 온다).
 */
@Component
public class DurunubiClient {

    // GPX 한 개 최대 크기
    static final int MAX_GPX_BYTES = 5 * 1024 * 1024;
    private static final Pattern ENCODED = Pattern.compile("%[0-9A-Fa-f]{2}");

    private record Raw(int status, String body) {
    }

    private final ExternalCourseProperties.Durunubi props;
    private final RestClient http;
    private final JsonMapper json;

    public DurunubiClient(ExternalCourseProperties props, JsonMapper json) {
        this.props = props.durunubi();
        this.json = json;
        this.http = ExternalHttp.client(props.userAgent(), this.props.timeout());
    }

    public DurunubiParser.Page<DurunubiParser.Route> routeList(int pageNo) {
        return call("routeList", pageNo, DurunubiParser::routes);
    }

    public DurunubiParser.Page<DurunubiParser.Item> courseList(int pageNo) {
        return call("courseList", pageNo, DurunubiParser::courses);
    }

    private <T> DurunubiParser.Page<T> call(String operation, int pageNo, Function<JsonNode, DurunubiParser.Page<T>> parse) {
        UriComponentsBuilder b = UriComponentsBuilder.fromUriString(props.baseUrl() + "/" + operation)
                .queryParam("serviceKey", "{key}")
                .queryParam("numOfRows", props.pageSize())
                .queryParam("pageNo", pageNo)
                .queryParam("MobileOS", "ETC")
                .queryParam("MobileApp", "DALLIMO")
                .queryParam("_type", "json");
        // 걷기길만 받으면 쪽 수(하루 호출 수)가 줄어든다
        if (props.walkOnly()) b.queryParam("brdDiv", DurunubiParser.WALK);
        URI uri = b.encode().buildAndExpand(serviceKey(props.serviceKey())).toUri();
        Raw raw = http.get().uri(uri).accept(MediaType.APPLICATION_JSON)
                .exchange((req, res) -> new Raw(res.getStatusCode().value(), new String(res.getBody().readAllBytes(), StandardCharsets.UTF_8)));
        String body = raw == null ? "" : raw.body().trim();
        if (body.startsWith("<")) return DurunubiParser.xml(body);
        if (raw == null || raw.status() >= 400 || body.isEmpty()) throw new IllegalStateException(operation + " HTTP " + (raw == null ? "-" : raw.status()));
        return parse.apply(json.readTree(body));
    }

    /** Encoding 키(%2B 등)를 넣었으면 풀어서 Decoding 키로 */
    static String serviceKey(String key) {
        String k = key.trim();
        return ENCODED.matcher(k).find() ? URLDecoder.decode(k, StandardCharsets.UTF_8) : k;
    }

    /** 코스 목록의 gpxpath. http(s) 주소만 */
    public byte[] gpx(String url) {
        URI uri = URI.create(url.trim());
        if (!"https".equalsIgnoreCase(uri.getScheme()) && !"http".equalsIgnoreCase(uri.getScheme())) {
            throw new IllegalArgumentException("GPX 주소가 올바르지 않아요: " + url);
        }
        byte[] body = http.get().uri(uri).retrieve().body(byte[].class);
        if (body == null || body.length == 0) throw new IllegalArgumentException("GPX 파일이 비어 있어요.");
        if (body.length > MAX_GPX_BYTES) throw new IllegalArgumentException("GPX 파일이 너무 커요.");
        return body;
    }
}
