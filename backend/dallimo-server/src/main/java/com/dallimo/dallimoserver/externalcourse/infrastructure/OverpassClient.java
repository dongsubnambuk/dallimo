package com.dallimo.dallimoserver.externalcourse.infrastructure;

import com.dallimo.dallimoserver.externalcourse.application.ExternalCourseProperties;
import com.dallimo.dallimoserver.externalcourse.domain.OverpassParser;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** OpenStreetMap Overpass API (https://wiki.openstreetmap.org/wiki/Overpass_API). 공용 서버는 무거운 요청을 자주 보내지 않는다 */
@Component
public class OverpassClient {

    private final ExternalCourseProperties props;
    private final RestClient http;
    private final JsonMapper json;

    public OverpassClient(ExternalCourseProperties props, JsonMapper json) {
        this.props = props;
        this.json = json;
        // 서버 쪽 timeout보다 조금 더 기다린다
        this.http = ExternalHttp.client(props.userAgent(), props.osm().timeout().plusSeconds(15));
    }

    public JsonNode fetch(double south, double west, double north, double east) {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("data", OverpassParser.query(south, west, north, east, (int) props.osm().timeout().toSeconds()));
        String body = http.post().uri(props.osm().overpassUrl())
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .accept(MediaType.APPLICATION_JSON)
                .body(form)
                .retrieve()
                .body(String.class);
        return json.readTree(body == null ? "{}" : body);
    }
}
