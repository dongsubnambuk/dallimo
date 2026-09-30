package com.dallimo.dallimoserver.externalcourse.infrastructure;

import com.dallimo.dallimoserver.course.domain.CourseRoute;
import com.dallimo.dallimoserver.course.domain.CourseSource;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;

/** 외부 코스 가져오기에 필요한 조회: 달리모 시스템 사용자, 이미 가져온 원본, 같은 자리의 비슷한 코스 */
@Repository
public class ExternalCourseJdbcRepository {

    // 추천 코스를 만든 사람. 로컬 seed(R__local_seed_courses.sql)도 provider SYSTEM의 "달리모"를 쓴다
    static final String SYSTEM_PROVIDER = "SYSTEM";
    static final String SYSTEM_NAME = "달리모";

    private final JdbcTemplate jdbc;

    public ExternalCourseJdbcRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** 시스템 사용자 id. 없으면 만든다 (닉네임 "달리모"를 누가 쓰고 있으면 "달리모 추천") */
    public long systemUserId(Instant now) {
        Long id = findSystemUser();
        if (id != null) return id;
        for (String nickname : List.of(SYSTEM_NAME, SYSTEM_NAME + " 추천")) {
            try {
                jdbc.update("""
                        INSERT INTO tbl_user (provider, provider_user_id, nickname, friend_code, status, created_at, updated_at)
                        VALUES (?, 'dallimo', ?, ?, 'ACTIVE', ?, ?)""",
                        SYSTEM_PROVIDER, nickname, "DALLIMO" + nickname.length(), Timestamp.from(now), Timestamp.from(now));
                break;
            } catch (DuplicateKeyException e) {
                // 다른 요청이 먼저 만들었으면 그것을 쓴다
                id = findSystemUser();
                if (id != null) return id;
            }
        }
        id = findSystemUser();
        if (id == null) throw new IllegalStateException("달리모 시스템 사용자를 만들 수 없어요.");
        return id;
    }

    private Long findSystemUser() {
        List<Long> ids = jdbc.queryForList("SELECT id FROM tbl_user WHERE provider = ? ORDER BY id LIMIT 1", Long.class, SYSTEM_PROVIDER);
        return ids.isEmpty() ? null : ids.get(0);
    }

    public boolean exists(CourseSource source, String sourceRef) {
        Integer n = jdbc.queryForObject("SELECT COUNT(*) FROM tbl_course WHERE source = ? AND source_ref = ?", Integer.class, source.name(), sourceRef);
        return n != null && n > 0;
    }

    /**
     * 출발점이 startM 안이고 길이가 비슷한(ratio 안) 코스가 이미 있나. 같은 둘레길이 OSM과 두루누비에 함께 있거나 사용자가 먼저 등록한 경우.
     * 지운 코스는 보지 않는다
     */
    public boolean nearDuplicate(double lat, double lng, int distanceM, double startM, double ratio) {
        double dLat = startM / 111_320.0;
        double dLng = startM / (111_320.0 * Math.max(0.01, Math.cos(Math.toRadians(lat))));
        List<double[]> rows = jdbc.query("""
                SELECT start_lat, start_lng FROM tbl_course
                WHERE deleted_at IS NULL AND start_lat BETWEEN ? AND ? AND start_lng BETWEEN ? AND ? AND distance_m BETWEEN ? AND ?""",
                (rs, i) -> new double[]{rs.getDouble(1), rs.getDouble(2)},
                lat - dLat, lat + dLat, lng - dLng, lng + dLng, (int) Math.floor(distanceM * (1 - ratio)), (int) Math.ceil(distanceM * (1 + ratio)));
        return rows.stream().anyMatch(r -> CourseRoute.haversineM(lat, lng, r[0], r[1]) <= startM);
    }
}
