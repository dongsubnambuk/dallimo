package com.dallimo.dallimoserver.externalcourse;

import com.dallimo.dallimoserver.course.domain.CourseRoute;
import com.dallimo.dallimoserver.course.domain.CourseSource;
import com.dallimo.dallimoserver.externalcourse.domain.DurunubiParser;
import com.dallimo.dallimoserver.externalcourse.domain.ExternalCourse;
import com.dallimo.dallimoserver.externalcourse.domain.ExternalCoursePolicy;
import com.dallimo.dallimoserver.externalcourse.domain.GpxParser;
import com.dallimo.dallimoserver.externalcourse.domain.OverpassParser;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

import java.nio.charset.StandardCharsets;
import java.util.List;

import static com.dallimo.dallimoserver.externalcourse.ExternalCourseFixtures.circle;
import static com.dallimo.dallimoserver.externalcourse.ExternalCourseFixtures.gpx;
import static com.dallimo.dallimoserver.externalcourse.ExternalCourseFixtures.member;
import static com.dallimo.dallimoserver.externalcourse.ExternalCourseFixtures.north;
import static com.dallimo.dallimoserver.externalcourse.ExternalCourseFixtures.overpass;
import static com.dallimo.dallimoserver.externalcourse.ExternalCourseFixtures.relation;
import static com.dallimo.dallimoserver.externalcourse.ExternalCourseFixtures.reversed;
import static com.dallimo.dallimoserver.externalcourse.ExternalCourseFixtures.way;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.within;

class ExternalCourseParsersTest {

    static final JsonMapper JSON = JsonMapper.builder().build();
    static final double LAT = 35.83;
    static final double LNG = 128.62;

    @Test
    void overpassStitchesRelationWaysAndKeepsNamedLoops() {
        String data = overpass(
                // 두 번째 way는 거꾸로, 갈림길(alternative)은 뺀다
                relation(1, "{\"type\":\"route\",\"route\":\"running\",\"name\":\"Riverside\",\"name:ko\":\"강변 달리기길\",\"description\":\"강을 따라<br>달려요\"}",
                        member("", north(LAT, LNG, 0, 600, 6)), member("", reversed(north(LAT, LNG, 600, 1200, 6))),
                        member("alternative", north(LAT, LNG + 0.01, 0, 5000, 5))),
                way(2, "{\"highway\":\"footway\",\"name\":\"못 둘레길\"}", circle(LAT, LNG + 0.02, 200, 24)),
                // 이어지지 않는 relation, 이름 없는 way, 막힌 길은 후보가 아니다
                relation(3, "{\"type\":\"route\",\"route\":\"hiking\",\"name\":\"끊긴 길\"}",
                        member("", north(LAT, LNG, 0, 500, 5)), member("", north(LAT, LNG, 900, 1500, 5))),
                way(4, "{\"highway\":\"footway\"}", circle(LAT, LNG, 300, 12)),
                way(5, "{\"highway\":\"path\",\"name\":\"사유지\",\"access\":\"private\"}", circle(LAT, LNG, 300, 12)));

        List<ExternalCourse> out = OverpassParser.parse(JSON.readTree(data));

        assertThat(out).extracting(ExternalCourse::sourceRef).containsExactly("relation/1", "way/2");
        ExternalCourse river = out.get(0);
        assertThat(river.source()).isEqualTo(CourseSource.OSM);
        assertThat(river.name()).isEqualTo("강변 달리기길");
        assertThat(river.description()).isEqualTo("강을 따라\n달려요");
        assertThat(river.attribution()).isEqualTo("© OpenStreetMap contributors");
        assertThat(river.sourceUrl()).isEqualTo("https://www.openstreetmap.org/relation/1");
        // 이어 붙인 선: 0m에서 1200m까지 한 방향 (겹친 점은 한 번)
        assertThat(river.line()).hasSize(13);
        assertThat(CourseRoute.lengthM(river.line())).isCloseTo(1200, within(1.0));
        assertThat(river.line().get(12).latitude()).isGreaterThan(river.line().get(0).latitude());
        assertThat(CourseRoute.lengthM(out.get(1).line())).isCloseTo(2 * Math.PI * 200, within(10.0));
    }

    @Test
    void overpassFlipsFirstWayWhenItPointsAway() {
        String data = overpass(relation(9, "{\"type\":\"route\",\"route\":\"foot\",\"name\":\"뒤집힌 길\"}",
                member("", reversed(north(LAT, LNG, 0, 600, 6))), member("", north(LAT, LNG, 600, 1200, 6))));
        List<CourseRoute.Point> line = OverpassParser.parse(JSON.readTree(data)).get(0).line();
        assertThat(CourseRoute.lengthM(line)).isCloseTo(1200, within(1.0));
    }

    @Test
    void overpassQueryUsesBox() {
        String q = OverpassParser.query(35.8, 128.5, 35.9, 128.7, 90);
        assertThat(q).contains("[timeout:90]").contains("(35.800000,128.500000,35.900000,128.700000)").contains("out geom;");
    }

    @Test
    void gpxReadsTrackPointsWithElevation() {
        GpxParser.Gpx g = GpxParser.parse(gpx("해파랑길 1코스", north(LAT, LNG, 0, 1000, 10), true).getBytes(StandardCharsets.UTF_8));
        assertThat(g.name()).isEqualTo("해파랑길 1코스");
        assertThat(g.points()).hasSize(11);
        assertThat(g.points()).allSatisfy(p -> assertThat(p.altitudeM()).isNotNull());
    }

    @Test
    void gpxFallsBackToRoutePointsAndRejectsEntities() {
        String rte = """
                <gpx version="1.0"><rte><name>경로</name><rtept lat="35.1" lon="129.1"/><rtept lat="35.2" lon="129.2"/></rte></gpx>""";
        GpxParser.Gpx g = GpxParser.parse(rte.getBytes(StandardCharsets.UTF_8));
        assertThat(g.name()).isEqualTo("경로");
        assertThat(g.points()).extracting(CourseRoute.Point::altitudeM).containsExactly(null, null);

        String xxe = """
                <?xml version="1.0"?><!DOCTYPE gpx [<!ENTITY x SYSTEM "file:///etc/passwd">]><gpx><trk><name>&x;</name></trk></gpx>""";
        assertThatThrownBy(() -> GpxParser.parse(xxe.getBytes(StandardCharsets.UTF_8))).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> GpxParser.parse("not xml".getBytes(StandardCharsets.UTF_8))).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void durunubiReadsCoursesRoutesAndSingleItem() {
        // 매뉴얼 v4.1 courseList 응답 항목 (값은 모두 문자열)
        String list = """
                {"response":{"header":{"resultCode":"0000","resultMsg":"OK"},"body":{"items":{"item":[
                  {"routeIdx":"T_ROUTE_MNG0000000001","crsIdx":"T_CRS_MNG0000005100","crsKorNm":"해파랑길 1코스","crsDstnc":"17.8","crsTotlRqrmHour":"360","crsLevel":"2","crsCycle":"비순환형","crsContents":"오륙도 해맞이공원에서<br>시작해요","crsSummary":"- 개요","sigun":"부산 남구","brdDiv":"DNWW","gpxpath":"https://www.durunubi.kr/editImgUp.do?filePath=/data/koreamobility/course/summap/T_CRS_MNG0000005100.gpx"},
                  {"crsIdx":"B1","crsKorNm":"자전거길","crsDstnc":"30","crsLevel":"1","crsCycle":"순환형","crsSummary":"- 개요만 있어요","brdDiv":"DNBW","gpxpath":"https://example.test/2.gpx"}
                ]},"numOfRows":100,"pageNo":1,"totalCount":2}}}""";
        DurunubiParser.Page<DurunubiParser.Item> p = DurunubiParser.courses(JSON.readTree(list));
        assertThat(p.ok()).isTrue();
        assertThat(p.totalCount()).isEqualTo(2);
        DurunubiParser.Item first = p.items().get(0);
        assertThat(first.routeIdx()).isEqualTo("T_ROUTE_MNG0000000001");
        assertThat(first.distanceKm()).isEqualTo(17.8);
        assertThat(first.difficulty()).isEqualTo("MODERATE");
        assertThat(first.loop()).isFalse();
        assertThat(first.region()).isEqualTo("부산 남구");
        // 코스 설명이 있으면 설명, 없으면 코스 개요
        assertThat(first.description()).isEqualTo("오륙도 해맞이공원에서<br>시작해요");
        assertThat(p.items().get(1).description()).isEqualTo("- 개요만 있어요");
        assertThat(p.items().get(1).loop()).isTrue();

        String routes = """
                {"response":{"header":{"resultCode":"0000","resultMsg":"OK"},"body":{"items":{"item":
                  {"routeIdx":"T_THEME_MNG0000011175","themeNm":"천지인 둘레길","linemsg":"문화 및 자연경관이 어우러진 둘레길","brdDiv":"DNWW"}
                },"numOfRows":1,"pageNo":1,"totalCount":1}}}""";
        assertThat(DurunubiParser.routes(JSON.readTree(routes)).items())
                .containsExactly(new DurunubiParser.Route("T_THEME_MNG0000011175", "천지인 둘레길", "DNWW"));
        String empty = """
                {"response":{"header":{"resultCode":"0000"},"body":{"items":"","totalCount":0}}}""";
        assertThat(DurunubiParser.courses(JSON.readTree(empty)).items()).isEmpty();
    }

    @Test
    void durunubiReadsXmlErrors() {
        // 공공데이터포털 오류는 _type=json이어도 XML로만 온다 (매뉴얼 v4.1)
        String portal = """
                <OpenAPI_ServiceResponse><cmmMsgHeader><errMsg>SERVICE ERROR</errMsg>
                <returnAuthMsg>SERVICE_KEY_IS_NOT_REGISTERED_ERROR</returnAuthMsg><returnReasonCode>30</returnReasonCode>
                </cmmMsgHeader></OpenAPI_ServiceResponse>""";
        DurunubiParser.Page<DurunubiParser.Item> p = DurunubiParser.xml(portal);
        assertThat(p.ok()).isFalse();
        assertThat(p.resultCode()).isEqualTo("30");
        assertThat(p.resultMsg()).isEqualTo("SERVICE_KEY_IS_NOT_REGISTERED_ERROR");
        String provider = """
                <response><header><resultCode>22</resultCode><resultMsg>LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR</resultMsg></header></response>""";
        assertThat(DurunubiParser.<DurunubiParser.Item>xml(provider).resultCode()).isEqualTo("22");
        assertThat(DurunubiParser.<DurunubiParser.Item>xml("<html>oops</html>").resultCode()).isEqualTo("XML");
    }

    @Test
    void externalCourseCleansHtmlAndTags() {
        ExternalCourse c = new ExternalCourse(CourseSource.DURUNUBI, "A", "  이름<br>둘  ", "<p>첫 줄</p><br>둘째&nbsp;줄<br/><br>", "경남 <b>밀양시</b>", null,
                java.util.Arrays.asList("해파랑길", "해파랑길", null, "아주 긴 길 이름이 스무 자를 넘어가면 잘라요"), toPoints(north(LAT, LNG, 0, 100, 1)), "출처", null, null);
        assertThat(c.name()).isEqualTo("이름 둘");
        assertThat(c.description()).isEqualTo("첫 줄\n둘째 줄");
        assertThat(c.region()).isEqualTo("경남 밀양시");
        assertThat(c.tags()).containsExactly("해파랑길", "아주 긴 길 이름이 스무 자를 넘어가");
    }

    @Test
    void policyResamplesAndFillsElevation() {
        ExternalCoursePolicy policy = new ExternalCoursePolicy(1000, 21_100);
        // 꼭짓점 몇 개뿐인 둘레길도 10m 간격으로
        CourseRoute.Normalized r = policy.normalize(toPoints(circle(LAT, LNG, 200, 8)));
        assertThat(r).isNotNull();
        assertThat(r.points().size()).isGreaterThan(110);
        assertThat(r.elevationGainM()).isNull();
        assertThat(policy.normalize(toPoints(north(LAT, LNG, 0, 800, 8)))).isNull();
        assertThat(policy.normalize(toPoints(north(LAT, LNG, 0, 30_000, 30)))).isNull();

        List<Integer> samples = ExternalCoursePolicy.elevationSamples(r.points().size(), 5);
        assertThat(samples.get(0)).isZero();
        assertThat(samples.get(samples.size() - 1)).isEqualTo(r.points().size() - 1);
        double[] alt = new double[samples.size()];
        for (int i = 0; i < alt.length; i++) alt[i] = samples.get(i);
        CourseRoute.Normalized filled = ExternalCoursePolicy.withElevation(r, samples, alt);
        // 표본 고도 = 위치 번호라 보간한 고도도 위치 번호
        for (int i = 0; i < filled.points().size(); i++) assertThat(filled.points().get(i).altitudeM()).isCloseTo(i, within(0.01));
        assertThat(filled.elevationGainM()).isNotNull();
    }

    private static List<CourseRoute.Point> toPoints(List<double[]> line) {
        return line.stream().map(p -> new CourseRoute.Point(p[0], p[1], null)).toList();
    }
}
