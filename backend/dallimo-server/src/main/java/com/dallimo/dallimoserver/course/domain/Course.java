package com.dallimo.dallimoserver.course.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;

/**
 * tbl_course (22.4장). 경로(tbl_course_route_point)는 등록할 때 한 번 만들고 바꾸지 않는다 (43.1장 route snapshot 불변).
 */
@Entity
@Table(name = "tbl_course")
public class Course {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "creator_id", nullable = false)
    private Long creatorId;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    // 앱이 출발점으로 알아낸 지역 이름. 예: "대구 수성구" (V10)
    @Column(length = 50)
    private String region;

    // CREG-002 추천 시간대. 예: "새벽 · 저녁" (V10)
    @Column(name = "recommended_time", length = 30)
    private String recommendedTime;

    @Column(name = "distance_m", nullable = false)
    private int distanceM;

    @Column(name = "start_lat", nullable = false, precision = 10, scale = 7)
    private BigDecimal startLat;

    @Column(name = "start_lng", nullable = false, precision = 10, scale = 7)
    private BigDecimal startLng;

    @Column(name = "end_lat", nullable = false, precision = 10, scale = 7)
    private BigDecimal endLat;

    @Column(name = "end_lng", nullable = false, precision = 10, scale = 7)
    private BigDecimal endLng;

    @Column(name = "elevation_gain_m", precision = 8, scale = 2)
    private BigDecimal elevationGainM;

    @Column(length = 20)
    private String difficulty;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CourseStatus status;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CourseVisibility visibility;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    // 외부 데이터로 만든 코스의 원본과 출처 (V15). 사용자 코스는 source가 USER이고 나머지는 null
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CourseSource source;

    @Column(name = "source_ref", length = 100)
    private String sourceRef;

    @Column(length = 200)
    private String attribution;

    @Column(length = 50)
    private String license;

    @Column(name = "source_url", length = 500)
    private String sourceUrl;

    protected Course() {
    }

    /** 외부 공개 데이터로 만든 추천 코스. 만든 사람은 달리모 시스템 사용자 */
    public static Course createExternal(long systemUserId, String name, String description, String region, String difficulty,
                                        CourseRoute.Normalized route, CourseSource source, String sourceRef, String attribution,
                                        String license, String sourceUrl, Instant now) {
        Course c = create(systemUserId, name, description, region, null, route, now);
        c.difficulty = difficulty;
        c.source = source;
        c.sourceRef = sourceRef;
        c.attribution = attribution;
        c.license = license;
        c.sourceUrl = sourceUrl;
        return c;
    }

    public static Course create(long creatorId, String name, String description, String region, String recommendedTime, CourseRoute.Normalized route,
                                Instant now) {
        Course c = new Course();
        c.creatorId = creatorId;
        c.name = name;
        c.description = description;
        c.region = region;
        c.recommendedTime = recommendedTime;
        c.distanceM = route.distanceM();
        CourseRoute.Point start = route.points().get(0);
        CourseRoute.Point end = route.points().get(route.points().size() - 1);
        c.startLat = coord(start.latitude());
        c.startLng = coord(start.longitude());
        c.endLat = coord(end.latitude());
        c.endLng = coord(end.longitude());
        c.elevationGainM = route.elevationGainM() == null ? null : BigDecimal.valueOf(route.elevationGainM()).setScale(2, RoundingMode.HALF_UP);
        c.status = CourseStatus.NEW;
        c.visibility = CourseVisibility.PUBLIC;
        c.source = CourseSource.USER;
        c.createdAt = now;
        c.updatedAt = now;
        return c;
    }

    static BigDecimal coord(double v) {
        return BigDecimal.valueOf(v).setScale(7, RoundingMode.HALF_UP);
    }

    /** 이 사용자가 볼 수 있는가. 비회원은 viewerId null */
    public boolean visibleTo(Long viewerId) {
        if (deletedAt != null || !status.viewable()) return false;
        return visibility == CourseVisibility.PUBLIC || creatorId.equals(viewerId);
    }

    public boolean deleted() {
        return deletedAt != null;
    }

    public Long getId() {
        return id;
    }

    public Long getCreatorId() {
        return creatorId;
    }

    public String getName() {
        return name;
    }

    public String getDescription() {
        return description;
    }

    public String getRegion() {
        return region;
    }

    public String getRecommendedTime() {
        return recommendedTime;
    }

    public int getDistanceM() {
        return distanceM;
    }

    public double getStartLat() {
        return startLat.doubleValue();
    }

    public double getStartLng() {
        return startLng.doubleValue();
    }

    public Double getElevationGainM() {
        return elevationGainM == null ? null : elevationGainM.doubleValue();
    }

    public String getDifficulty() {
        return difficulty;
    }

    public CourseStatus getStatus() {
        return status;
    }

    public CourseVisibility getVisibility() {
        return visibility;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public CourseSource getSource() {
        return source;
    }

    public String getSourceRef() {
        return sourceRef;
    }

    public String getAttribution() {
        return attribution;
    }

    public String getLicense() {
        return license;
    }

    public String getSourceUrl() {
        return sourceUrl;
    }
}
