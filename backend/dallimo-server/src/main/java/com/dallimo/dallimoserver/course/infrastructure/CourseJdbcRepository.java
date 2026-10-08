package com.dallimo.dallimoserver.course.infrastructure;

import com.dallimo.dallimoserver.course.domain.CourseRoute;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.sql.Types;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 코스 경로 point · 태그 · 저장 · 기록 숫자. 여러 코스를 한 번에 읽어 목록에서 코스마다 쿼리하지 않는다.
 */
@Repository
public class CourseJdbcRepository {

    private final JdbcTemplate jdbc;
    private final NamedParameterJdbcTemplate named;

    public CourseJdbcRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
        this.named = new NamedParameterJdbcTemplate(jdbc);
    }

    // ── 경로 ──

    public void insertRoute(long courseId, List<CourseRoute.Point> points) {
        List<Object[]> rows = new ArrayList<>(points.size());
        for (int i = 0; i < points.size(); i++) {
            CourseRoute.Point p = points.get(i);
            rows.add(new Object[]{courseId, i + 1, p.latitude(), p.longitude(), p.altitudeM()});
        }
        jdbc.batchUpdate("INSERT INTO tbl_course_route_point (course_id, seq, latitude, longitude, altitude_m) VALUES (?, ?, ?, ?, ?)",
                rows, new int[]{Types.BIGINT, Types.INTEGER, Types.DECIMAL, Types.DECIMAL, Types.DECIMAL});
    }

    public Map<Long, List<CourseRoute.Point>> routes(List<Long> courseIds) {
        Map<Long, List<CourseRoute.Point>> out = new HashMap<>();
        if (courseIds.isEmpty()) return out;
        named.query("""
                SELECT course_id, latitude, longitude, altitude_m FROM tbl_course_route_point
                WHERE course_id IN (:ids) ORDER BY course_id, seq""", ids(courseIds), rs -> {
            double alt = rs.getDouble("altitude_m");
            Double altitude = rs.wasNull() ? null : alt;
            out.computeIfAbsent(rs.getLong("course_id"), k -> new ArrayList<>())
                    .add(new CourseRoute.Point(rs.getDouble("latitude"), rs.getDouble("longitude"), altitude));
        });
        return out;
    }

    // ── 태그 ──

    public void insertTags(long courseId, List<String> tags) {
        List<Object[]> rows = new ArrayList<>();
        for (int i = 0; i < tags.size(); i++) rows.add(new Object[]{courseId, tags.get(i), i + 1});
        if (!rows.isEmpty()) jdbc.batchUpdate("INSERT INTO tbl_course_tag (course_id, tag, seq) VALUES (?, ?, ?)", rows);
    }

    /** 지운 코스에 걸린 끝나지 않은 도전은 취소한다 (도전 목록에서 빠지고, 달리는 중이던 Run은 판정하지 않는다) */
    public void cancelOpenChallenges(long courseId, Instant now) {
        jdbc.update("UPDATE tbl_challenge SET status = 'CANCELED', finished_at = ? WHERE course_id = ? AND status IN ('OPEN', 'RUNNING')",
                Timestamp.from(now), courseId);
    }

    public void replaceTags(long courseId, List<String> tags) {
        jdbc.update("DELETE FROM tbl_course_tag WHERE course_id = ?", courseId);
        insertTags(courseId, tags);
    }

    public Map<Long, List<String>> tags(List<Long> courseIds) {
        Map<Long, List<String>> out = new HashMap<>();
        if (courseIds.isEmpty()) return out;
        named.query("SELECT course_id, tag FROM tbl_course_tag WHERE course_id IN (:ids) ORDER BY course_id, seq", ids(courseIds),
                rs -> {
                    out.computeIfAbsent(rs.getLong("course_id"), k -> new ArrayList<>()).add(rs.getString("tag"));
                });
        return out;
    }

    // ── 만든 사람 ──

    public Map<Long, String> nicknames(List<Long> userIds) {
        Map<Long, String> out = new HashMap<>();
        if (userIds.isEmpty()) return out;
        named.query("SELECT id, nickname FROM tbl_user WHERE id IN (:ids)", ids(userIds),
                rs -> {
                    out.put(rs.getLong("id"), rs.getString("nickname"));
                });
        return out;
    }

    // ── 저장 (CRS-105) ──

    /** 이미 저장했으면 그대로 둔다 */
    public void bookmark(long userId, long courseId, Instant now) {
        jdbc.update("INSERT INTO tbl_course_bookmark (user_id, course_id, created_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE user_id = user_id",
                userId, courseId, Timestamp.from(now));
    }

    public void unbookmark(long userId, long courseId) {
        jdbc.update("DELETE FROM tbl_course_bookmark WHERE user_id = ? AND course_id = ?", userId, courseId);
    }

    public List<Long> bookmarkedIds(long userId, List<Long> courseIds) {
        if (courseIds.isEmpty()) return List.of();
        return named.queryForList("SELECT course_id FROM tbl_course_bookmark WHERE user_id = :userId AND course_id IN (:ids)",
                ids(courseIds).addValue("userId", userId), Long.class);
    }

    /** 저장한 순서(최근 먼저) */
    public List<Long> bookmarkedIds(long userId) {
        return jdbc.queryForList("SELECT course_id FROM tbl_course_bookmark WHERE user_id = ? ORDER BY created_at DESC, course_id DESC", Long.class, userId);
    }

    /** 공식 기록이 있는 코스(최근 완주 먼저) */
    public List<Long> finishedIds(long userId) {
        return jdbc.queryForList("""
                SELECT course_id FROM tbl_course_record WHERE user_id = ?
                GROUP BY course_id ORDER BY MAX(created_at) DESC, course_id DESC""", Long.class, userId);
    }

    // ── 기록 숫자 ──

    public Map<Long, CourseStats> stats(List<Long> courseIds, Long viewerId, Instant weekFrom) {
        Map<Long, CourseStats> out = new LinkedHashMap<>();
        if (courseIds.isEmpty()) return out;
        Map<Long, Integer> leader = new HashMap<>();
        Map<Long, Integer> finishers = new HashMap<>();
        // 1등 기록 · 완주자 수: 사용자별 최고 기록 projection (23.1장, 결정 로그 70항)
        named.query("""
                SELECT course_id, MIN(best_seconds) AS best, COUNT(*) AS users
                FROM tbl_course_user_best WHERE course_id IN (:ids) GROUP BY course_id""", ids(courseIds), rs -> {
            leader.put(rs.getLong("course_id"), rs.getInt("best"));
            finishers.put(rs.getLong("course_id"), rs.getInt("users"));
        });
        Map<Long, Integer> weekly = new HashMap<>();
        named.query("""
                SELECT course_id, COUNT(DISTINCT user_id) AS users FROM tbl_run
                WHERE course_id IN (:ids) AND status = 'FINISHED' AND started_at >= :from GROUP BY course_id""",
                ids(courseIds).addValue("from", Timestamp.from(weekFrom)), rs -> {
                    weekly.put(rs.getLong("course_id"), rs.getInt("users"));
                });
        Map<Long, int[]> mine = new HashMap<>();
        if (viewerId != null) {
            named.query("""
                    SELECT r.course_id, MIN(r.duration_seconds) AS best, COUNT(*) AS cnt,
                           (SELECT l.duration_seconds FROM tbl_course_record l
                            WHERE l.course_id = r.course_id AND l.user_id = r.user_id
                            ORDER BY l.created_at DESC, l.id DESC LIMIT 1) AS last_sec
                    FROM tbl_course_record r WHERE r.course_id IN (:ids) AND r.user_id = :userId
                    GROUP BY r.course_id, r.user_id""", ids(courseIds).addValue("userId", viewerId), rs -> {
                mine.put(rs.getLong("course_id"), new int[]{rs.getInt("best"), rs.getInt("cnt"), rs.getInt("last_sec")});
            });
        }
        for (Long id : courseIds) {
            int[] m = mine.get(id);
            out.put(id, new CourseStats(leader.get(id), finishers.getOrDefault(id, 0), weekly.getOrDefault(id, 0),
                    m == null ? null : m[0], m == null ? null : m[2], m == null ? 0 : m[1]));
        }
        return out;
    }

    // ── 평가 (REV-001) ──

    public Map<Long, ReviewSummary> reviewSummaries(List<Long> courseIds) {
        Map<Long, ReviewSummary> out = new HashMap<>();
        if (courseIds.isEmpty()) return out;
        named.query("""
                SELECT course_id, AVG(rating) AS rating, COUNT(*) AS cnt, AVG(surface_score) AS surface, AVG(signal_score) AS sig,
                       AVG(night_score) AS night, AVG(crowd_score) AS crowd,
                       SUM(CASE WHEN has_toilet = 1 THEN 1 ELSE 0 END) AS toilet_yes, COUNT(has_toilet) AS toilet_n,
                       SUM(CASE WHEN has_water = 1 THEN 1 ELSE 0 END) AS water_yes, COUNT(has_water) AS water_n
                FROM tbl_course_review WHERE course_id IN (:ids) GROUP BY course_id""", ids(courseIds), rs -> {
            int toiletN = rs.getInt("toilet_n"), waterN = rs.getInt("water_n");
            out.put(rs.getLong("course_id"), new ReviewSummary(avg(rs, "rating"), rs.getInt("cnt"), avg(rs, "surface"), avg(rs, "sig"), avg(rs, "night"),
                    avg(rs, "crowd"), toiletN == 0 ? null : rs.getInt("toilet_yes") * 2 >= toiletN, waterN == 0 ? null : rs.getInt("water_yes") * 2 >= waterN));
        });
        return out;
    }

    /** 이름 · 지역 말고 태그로도 찾는다 (CRS-003). 태그가 맞는 코스 id */
    public List<Long> idsWithTagLike(String pattern) {
        return jdbc.queryForList("SELECT DISTINCT course_id FROM tbl_course_tag WHERE LOWER(tag) LIKE ? ESCAPE '!'", Long.class, pattern);
    }

    private static Double avg(java.sql.ResultSet rs, String column) throws java.sql.SQLException {
        java.math.BigDecimal v = rs.getBigDecimal(column);
        return v == null ? null : v.doubleValue();
    }

    private static MapSqlParameterSource ids(List<Long> ids) {
        return new MapSqlParameterSource("ids", ids);
    }
}
