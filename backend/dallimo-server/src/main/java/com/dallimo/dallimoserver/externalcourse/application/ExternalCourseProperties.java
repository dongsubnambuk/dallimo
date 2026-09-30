package com.dallimo.dallimoserver.externalcourse.application;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;
import java.util.Arrays;
import java.util.List;

/**
 * 외부 공개 데이터로 추천 코스 만들기 (FOUNDATION-DECISION-LOG 52항). 값은 명세에 없어 정한 시작값 (backend/README 결정 사항).
 *
 * @param adminKey          관리 API(X-Admin-Key) 키. 비어 있으면 관리 API를 닫는다
 * @param minDistanceM      이보다 짧은 경로는 코스로 만들지 않는다
 * @param maxDistanceM      이보다 긴 경로(한 번에 달리기 어려운 종주길)는 코스로 만들지 않는다
 * @param duplicateStartM   출발점이 이 안이고 길이 차이가 duplicateLengthRatio 안인 코스가 이미 있으면 같은 코스로 본다
 * @param userAgent         외부 API에 보내는 User-Agent (Overpass 이용 정책)
 */
@ConfigurationProperties("dallimo.external-courses")
public record ExternalCourseProperties(String adminKey, Integer minDistanceM, Integer maxDistanceM, Double duplicateStartM,
                                       Double duplicateLengthRatio, String userAgent, Osm osm, Durunubi durunubi, Elevation elevation,
                                       Schedule schedule) {

    public ExternalCourseProperties {
        minDistanceM = minDistanceM == null ? 1000 : minDistanceM;
        maxDistanceM = maxDistanceM == null ? 21_100 : maxDistanceM;
        duplicateStartM = duplicateStartM == null ? 100.0 : duplicateStartM;
        duplicateLengthRatio = duplicateLengthRatio == null ? 0.1 : duplicateLengthRatio;
        userAgent = userAgent == null || userAgent.isBlank() ? "dallimo-server" : userAgent;
        osm = osm == null ? new Osm(null, null, null) : osm;
        durunubi = durunubi == null ? new Durunubi(null, null, null, null, null, null) : durunubi;
        elevation = elevation == null ? new Elevation(null, null, null, null) : elevation;
        schedule = schedule == null ? new Schedule(null, null) : schedule;
    }

    public boolean adminEnabled() {
        return adminKey != null && !adminKey.isBlank();
    }

    /**
     * OpenStreetMap Overpass API
     *
     * @param maxBoxDeg 한 번에 조회하는 박스의 가로 · 세로 최대값(도). 공용 서버에 무거운 요청을 보내지 않게
     */
    public record Osm(String overpassUrl, Duration timeout, Double maxBoxDeg) {
        public Osm {
            overpassUrl = overpassUrl == null || overpassUrl.isBlank() ? "https://overpass-api.de/api/interpreter" : overpassUrl;
            timeout = timeout == null ? Duration.ofSeconds(90) : timeout;
            maxBoxDeg = maxBoxDeg == null ? 0.5 : maxBoxDeg;
        }
    }

    /**
     * 한국관광공사 두루누비 정보 서비스 (공공데이터포털 15101974)
     *
     * @param serviceKey 공공데이터포털 일반 인증키(Decoding). 비어 있으면 두루누비를 부르지 않는다
     * @param walkOnly   걷기길(DNWW)만. 자전거길(DNBW)은 달리기 코스로 만들지 않는다
     * @param maxPages   한 번에 읽는 최대 쪽 수 (개발 계정 하루 1,000회 제한)
     */
    public record Durunubi(String baseUrl, String serviceKey, Integer pageSize, Integer maxPages, Boolean walkOnly, Duration timeout) {
        public Durunubi {
            baseUrl = baseUrl == null || baseUrl.isBlank() ? "https://apis.data.go.kr/B551011/Durunubi" : baseUrl;
            pageSize = pageSize == null ? 100 : pageSize;
            maxPages = maxPages == null ? 10 : maxPages;
            walkOnly = walkOnly == null || walkOnly;
            timeout = timeout == null ? Duration.ofSeconds(30) : timeout;
        }

        public boolean enabled() {
            return serviceKey != null && !serviceKey.isBlank();
        }
    }

    /**
     * Open-Meteo Elevation API (Copernicus DEM 90m). 고도가 없는 경로(OSM)에 고도를 채운다.
     * 무료 API는 비상업 이용 조건이라 기본은 끈다. 상업 서비스에서 켜려면 Open-Meteo 유료 API 키 주소를 쓴다.
     *
     * @param sampleEvery 경로 point 몇 개마다 고도를 물어볼지 (10m 간격이라 5면 50m마다, 사이는 선형 보간)
     */
    public record Elevation(Boolean enabled, String url, Integer batch, Integer sampleEvery) {
        public Elevation {
            enabled = enabled != null && enabled;
            url = url == null || url.isBlank() ? "https://api.open-meteo.com/v1/elevation" : url;
            batch = batch == null ? 100 : batch;
            sampleEvery = sampleEvery == null ? 5 : sampleEvery;
        }
    }

    /**
     * 주기 가져오기. cron이 "-"면 돌지 않는다
     *
     * @param osmBoxes "south,west,north,east" 박스를 ;로 이은 값 (쉼표는 박스 안에서 쓰므로 목록으로 받지 않는다)
     */
    public record Schedule(String cron, String osmBoxes) {

        public List<String> boxes() {
            if (osmBoxes == null || osmBoxes.isBlank()) return List.of();
            return Arrays.stream(osmBoxes.split(";")).map(String::trim).filter(b -> !b.isEmpty()).toList();
        }
    }
}
