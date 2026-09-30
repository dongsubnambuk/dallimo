package com.dallimo.dallimoserver.externalcourse.infrastructure;

import com.dallimo.dallimoserver.externalcourse.application.ExternalCourseProperties;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.net.URI;

/**
 * 한국관광공사 두루누비 정보 서비스 (공공데이터포털 15101974). 코스 목록(courseList)과 코스 GPX 파일.
 * 인증키는 Decoding 키를 받아 여기서 한 번만 인코딩한다 (+ · / · = 가 그대로 가면 키가 틀렸다고 한다).
 */
@Component
public class DurunubiClient {

    // GPX 한 개 최대 크기
    static final int MAX_GPX_BYTES = 5 * 1024 * 1024;

    private final ExternalCourseProperties.Durunubi props;
    private final RestClient http;
    private final JsonMapper json;

    public DurunubiClient(ExternalCourseProperties props, JsonMapper json) {
        this.props = props.durunubi();
        this.json = json;
        this.http = ExternalHttp.client(props.userAgent(), this.props.timeout());
    }

    public JsonNode courseList(int pageNo) {
        URI uri = UriComponentsBuilder.fromUriString(props.baseUrl() + "/courseList")
                .queryParam("serviceKey", "{key}")
                .queryParam("numOfRows", props.pageSize())
                .queryParam("pageNo", pageNo)
                .queryParam("MobileOS", "ETC")
                .queryParam("MobileApp", "DALLIMO")
                .queryParam("_type", "json")
                .encode()
                .buildAndExpand(props.serviceKey())
                .toUri();
        String body = http.get().uri(uri).accept(MediaType.APPLICATION_JSON).retrieve().body(String.class);
        return json.readTree(body == null ? "{}" : body);
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
