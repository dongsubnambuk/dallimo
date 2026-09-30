package com.dallimo.dallimoserver.externalcourse.infrastructure;

import com.dallimo.dallimoserver.course.domain.CourseRoute;
import com.dallimo.dallimoserver.externalcourse.application.ExternalCourseProperties;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.time.Duration;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

/** Open-Meteo Elevation API (https://open-meteo.com/en/docs/elevation-api). 한 번에 좌표 100개까지 */
@Component
public class ElevationClient {

    private final ExternalCourseProperties.Elevation props;
    private final RestClient http;
    private final JsonMapper json;

    public ElevationClient(ExternalCourseProperties props, JsonMapper json) {
        this.props = props.elevation();
        this.json = json;
        this.http = ExternalHttp.client(props.userAgent(), Duration.ofSeconds(30));
    }

    /** points 순서대로 고도(m). 응답 수가 다르면 IllegalStateException */
    public double[] lookup(List<CourseRoute.Point> points) {
        double[] out = new double[points.size()];
        for (int from = 0; from < points.size(); from += props.batch()) {
            List<CourseRoute.Point> batch = points.subList(from, Math.min(points.size(), from + props.batch()));
            String lat = batch.stream().map(p -> String.format(Locale.ROOT, "%.6f", p.latitude())).collect(Collectors.joining(","));
            String lng = batch.stream().map(p -> String.format(Locale.ROOT, "%.6f", p.longitude())).collect(Collectors.joining(","));
            String uri = UriComponentsBuilder.fromUriString(props.url()).queryParam("latitude", lat).queryParam("longitude", lng).build().toUriString();
            String body = http.get().uri(uri).accept(MediaType.APPLICATION_JSON).retrieve().body(String.class);
            JsonNode elevation = json.readTree(body == null ? "{}" : body).path("elevation");
            if (!elevation.isArray() || elevation.size() != batch.size()) throw new IllegalStateException("고도 응답 수가 맞지 않아요.");
            for (int i = 0; i < batch.size(); i++) out[from + i] = elevation.get(i).asDouble();
        }
        return out;
    }
}
