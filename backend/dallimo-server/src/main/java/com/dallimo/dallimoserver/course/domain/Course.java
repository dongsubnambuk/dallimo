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

    protected Course() {
    }

    public static Course create(long creatorId, String name, String description, CourseRoute.Normalized route, Instant now) {
        Course c = new Course();
        c.creatorId = creatorId;
        c.name = name;
        c.description = description;
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
}
