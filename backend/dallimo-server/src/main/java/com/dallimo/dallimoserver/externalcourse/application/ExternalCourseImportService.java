package com.dallimo.dallimoserver.externalcourse.application;

import com.dallimo.dallimoserver.common.error.ApiException;
import com.dallimo.dallimoserver.common.error.ErrorCode;
import com.dallimo.dallimoserver.course.domain.CourseRoute;
import com.dallimo.dallimoserver.course.domain.CourseSource;
import com.dallimo.dallimoserver.externalcourse.domain.DurunubiParser;
import com.dallimo.dallimoserver.externalcourse.domain.ExternalCourse;
import com.dallimo.dallimoserver.externalcourse.domain.ExternalCoursePolicy;
import com.dallimo.dallimoserver.externalcourse.domain.GpxParser;
import com.dallimo.dallimoserver.externalcourse.domain.OverpassParser;
import com.dallimo.dallimoserver.externalcourse.infrastructure.DurunubiClient;
import com.dallimo.dallimoserver.externalcourse.infrastructure.ElevationClient;
import com.dallimo.dallimoserver.externalcourse.infrastructure.ExternalCourseJdbcRepository;
import com.dallimo.dallimoserver.externalcourse.infrastructure.OverpassClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;

/**
 * 외부 공개 데이터로 달리모 추천 코스를 만든다 (FOUNDATION-DECISION-LOG 52항).
 * OSM(Overpass) · 두루누비(공공데이터포털) · 관리자가 올린 GPX. 같은 원본은 한 번만, 이미 같은 자리에 비슷한 코스가 있으면 건너뛴다.
 * 경로는 한 번 만들면 바꾸지 않는다 (43.1장 route snapshot 불변). 원본이 바뀌면 코스를 숨기고 새로 가져온다.
 */
@Service
@EnableConfigurationProperties(ExternalCourseProperties.class)
public class ExternalCourseImportService {

    private static final Logger log = LoggerFactory.getLogger(ExternalCourseImportService.class);
    static final int MAX_ERRORS = 20;

    /** 가져온 결과. fetched: 원본에서 읽은 후보 수 */
    public record ImportReport(CourseSource source, int fetched, int created, int skippedExisting, int skippedDuplicate, int skippedInvalid,
                               List<Long> courseIds, List<String> errors) {
    }

    /** 관리자가 올린 GPX의 코스 정보. sourceRef가 없으면 파일 내용 해시 */
    public record GpxMeta(String name, String description, String region, String difficulty, String sourceRef, String attribution,
                          String license, String sourceUrl) {
    }

    private final ExternalCourseProperties props;
    private final ExternalCoursePolicy policy;
    private final OverpassClient overpass;
    private final DurunubiClient durunubi;
    private final ElevationClient elevation;
    private final ExternalCourseJdbcRepository external;
    private final ExternalCourseWriter writer;

    public ExternalCourseImportService(ExternalCourseProperties props, OverpassClient overpass, DurunubiClient durunubi, ElevationClient elevation,
                                       ExternalCourseJdbcRepository external, ExternalCourseWriter writer) {
        this.props = props;
        this.policy = new ExternalCoursePolicy(props.minDistanceM(), props.maxDistanceM());
        this.overpass = overpass;
        this.durunubi = durunubi;
        this.elevation = elevation;
        this.external = external;
        this.writer = writer;
    }

    /** 박스 안의 OSM 달리기 · 걷기 경로 */
    public ImportReport importOsm(double south, double west, double north, double east) {
        if (!(south < north && west < east) || south < -90 || north > 90 || west < -180 || east > 180) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "박스 좌표를 확인해 주세요 (south < north, west < east).");
        }
        if (north - south > props.osm().maxBoxDeg() || east - west > props.osm().maxBoxDeg()) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "한 번에 조회하는 박스는 가로 · 세로 %.2f도 이하예요.".formatted(props.osm().maxBoxDeg()));
        }
        Tally t = new Tally(CourseSource.OSM);
        JsonNode data;
        try {
            data = overpass.fetch(south, west, north, east);
        } catch (RuntimeException e) {
            t.error("Overpass 호출 실패: " + e.getMessage());
            return t.report();
        }
        for (ExternalCourse c : OverpassParser.parse(data)) {
            t.fetched++;
            save(c, t);
        }
        return t.report();
    }

    /** 두루누비 코스 목록을 쪽마다 읽고, 새 코스만 GPX를 받아 만든다 */
    public ImportReport importDurunubi() {
        ExternalCourseProperties.Durunubi cfg = props.durunubi();
        if (!cfg.enabled()) throw new ApiException(ErrorCode.VALIDATION_ERROR, "두루누비 인증키(DATA_GO_KR_SERVICE_KEY)가 설정되지 않았어요.");
        Tally t = new Tally(CourseSource.DURUNUBI);
        for (int pageNo = 1; pageNo <= cfg.maxPages(); pageNo++) {
            DurunubiParser.Page page;
            try {
                page = DurunubiParser.parse(durunubi.courseList(pageNo));
            } catch (RuntimeException e) {
                t.error("두루누비 목록 " + pageNo + "쪽 실패: " + e.getMessage());
                break;
            }
            if (!page.ok()) {
                t.error("두루누비 응답 " + page.resultCode() + " " + page.resultMsg());
                break;
            }
            for (DurunubiParser.Item item : page.items()) {
                t.fetched++;
                durunubiItem(item, cfg, t);
            }
            if (page.items().isEmpty() || (long) pageNo * cfg.pageSize() >= page.totalCount()) break;
        }
        return t.report();
    }

    private void durunubiItem(DurunubiParser.Item item, ExternalCourseProperties.Durunubi cfg, Tally t) {
        if (item.crsIdx() == null || item.name() == null || item.gpxUrl() == null) {
            t.skippedInvalid++;
            return;
        }
        if (cfg.walkOnly() && item.brdDiv() != null && !DurunubiParser.WALK.equals(item.brdDiv())) {
            t.skippedInvalid++;
            return;
        }
        if (external.exists(CourseSource.DURUNUBI, item.crsIdx())) {
            t.skippedExisting++;
            return;
        }
        // 목록 거리로 먼저 거른다 (GPX를 받지 않게)
        if (item.distanceKm() != null && !policy.lengthOk(item.distanceKm() * 1000)) {
            t.skippedInvalid++;
            return;
        }
        GpxParser.Gpx gpx;
        try {
            gpx = GpxParser.parse(durunubi.gpx(item.gpxUrl()));
        } catch (RuntimeException e) {
            t.error("두루누비 " + item.crsIdx() + " GPX 실패: " + e.getMessage());
            return;
        }
        save(new ExternalCourse(CourseSource.DURUNUBI, item.crsIdx(), item.name(), item.summary(), item.region(), item.difficulty(), List.of(),
                gpx.points(), DurunubiParser.ATTRIBUTION, DurunubiParser.LICENSE, null), t);
    }

    /** 관리자가 올린 GPX 하나 (등산 · 트레킹 GPX, 자전거길 GPX 등) */
    public ImportReport importGpx(byte[] file, GpxMeta meta) {
        GpxParser.Gpx gpx;
        try {
            gpx = GpxParser.parse(file);
        } catch (IllegalArgumentException e) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, e.getMessage());
        }
        String name = meta.name() != null ? meta.name() : gpx.name();
        if (name == null) throw new ApiException(ErrorCode.VALIDATION_ERROR, "코스 이름(name)을 넣어 주세요. GPX에도 이름이 없어요.");
        if (gpx.points().size() < 2) throw new ApiException(ErrorCode.VALIDATION_ERROR, "GPX에 경로 point가 없어요.");
        String ref = meta.sourceRef() != null ? meta.sourceRef() : "sha256:" + sha256(file).substring(0, 32);
        Tally t = new Tally(CourseSource.GPX);
        t.fetched++;
        save(new ExternalCourse(CourseSource.GPX, ref, name, meta.description(), meta.region(), meta.difficulty(), List.of(), gpx.points(),
                meta.attribution(), meta.license(), meta.sourceUrl()), t);
        return t.report();
    }

    private void save(ExternalCourse c, Tally t) {
        if (external.exists(c.source(), c.sourceRef())) {
            t.skippedExisting++;
            return;
        }
        CourseRoute.Normalized route = policy.normalize(c.line());
        if (route == null) {
            t.skippedInvalid++;
            return;
        }
        route = withElevation(route, t);
        CourseRoute.Point start = route.points().get(0);
        if (external.nearDuplicate(start.latitude(), start.longitude(), route.distanceM(), props.duplicateStartM(), props.duplicateLengthRatio())) {
            t.skippedDuplicate++;
            return;
        }
        try {
            t.courseIds.add(writer.insert(c, route));
            t.created++;
        } catch (DataIntegrityViolationException e) {
            // 같은 원본을 다른 요청이 먼저 넣었다
            t.skippedExisting++;
        }
    }

    /** 고도가 없는 경로에 고도를 채운다. 실패하면 고도 없이 */
    private CourseRoute.Normalized withElevation(CourseRoute.Normalized route, Tally t) {
        if (!props.elevation().enabled() || route.elevationGainM() != null) return route;
        List<Integer> samples = ExternalCoursePolicy.elevationSamples(route.points().size(), props.elevation().sampleEvery());
        try {
            double[] alt = elevation.lookup(samples.stream().map(route.points()::get).toList());
            return ExternalCoursePolicy.withElevation(route, samples, alt);
        } catch (RuntimeException e) {
            t.error("고도 조회 실패: " + e.getMessage());
            return route;
        }
    }

    private static String sha256(byte[] bytes) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private static final class Tally {
        final CourseSource source;
        int fetched;
        int created;
        int skippedExisting;
        int skippedDuplicate;
        int skippedInvalid;
        final List<Long> courseIds = new ArrayList<>();
        final List<String> errors = new ArrayList<>();

        Tally(CourseSource source) {
            this.source = source;
        }

        void error(String message) {
            log.warn("external course import {}: {}", source, message);
            if (errors.size() < MAX_ERRORS) errors.add(message.length() > 300 ? message.substring(0, 300) : message);
        }

        ImportReport report() {
            ImportReport r = new ImportReport(source, fetched, created, skippedExisting, skippedDuplicate, skippedInvalid, List.copyOf(courseIds),
                    List.copyOf(errors));
            log.info("external course import {}: fetched={} created={} existing={} duplicate={} invalid={} errors={}", source, fetched, created,
                    skippedExisting, skippedDuplicate, skippedInvalid, errors.size());
            return r;
        }
    }
}
