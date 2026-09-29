package com.dallimo.dallimoserver.activity.infrastructure;

import com.dallimo.dallimoserver.activity.domain.ActivityType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** tbl_activity (V11)와 활동을 그릴 때 필요한 대상 값 */
@Repository
public class ActivityJdbcRepository {

    private final JdbcTemplate jdbc;
    private final NamedParameterJdbcTemplate named;

    public ActivityJdbcRepository(JdbcTemplate jdbc, NamedParameterJdbcTemplate named) {
        this.jdbc = jdbc;
        this.named = named;
    }

    public record Row(long id, long userId, String nickname, ActivityType type, String referenceType, long referenceId, Integer value, Instant createdAt) {
    }

    public void insert(long userId, ActivityType type, String referenceType, long referenceId, Integer value, Instant now) {
        jdbc.update("""
                INSERT INTO tbl_activity (user_id, type, reference_type, reference_id, value_int, visibility, created_at)
                VALUES (?, ?, ?, ?, ?, 'FRIENDS', ?)""", userId, type.name(), referenceType, referenceId, value, Timestamp.from(now));
    }

    /** 이 사람들의 활동, 최근 먼저 (id cursor) */
    public List<Row> feed(List<Long> userIds, Long beforeId, int limit) {
        var p = new MapSqlParameterSource("ids", userIds).addValue("before", beforeId).addValue("limit", limit);
        return named.query("""
                SELECT a.id, a.user_id, u.nickname, a.type, a.reference_type, a.reference_id, a.value_int, a.created_at
                FROM tbl_activity a JOIN tbl_user u ON u.id = a.user_id
                WHERE a.user_id IN (:ids) AND (:before IS NULL OR a.id < :before)
                ORDER BY a.id DESC LIMIT :limit""", p, (rs, i) -> new Row(rs.getLong(1), rs.getLong(2), rs.getString(3), ActivityType.valueOf(rs.getString(4)),
                rs.getString(5), rs.getLong(6), (Integer) rs.getObject(7, Integer.class), rs.getTimestamp(8).toInstant()));
    }

    // ── 대상 값 ──

    public record Record(long courseId, int seconds) {
    }

    public Map<Long, Record> records(List<Long> ids) {
        Map<Long, Record> out = new HashMap<>();
        if (ids.isEmpty()) return out;
        named.query("SELECT id, course_id, duration_seconds FROM tbl_course_record WHERE id IN (:ids)", new MapSqlParameterSource("ids", ids),
                rs -> {
                    out.put(rs.getLong(1), new Record(rs.getLong(2), rs.getInt(3)));
                });
        return out;
    }

    /** viewable: 삭제 · 숨김 · 차단이 아니고 공개이거나 보는 사람이 만든 코스 */
    public record Course(long id, String name, int distanceM, boolean viewable) {
    }

    public Map<Long, Course> courses(List<Long> ids, long viewerId) {
        Map<Long, Course> out = new HashMap<>();
        if (ids.isEmpty()) return out;
        named.query("""
                SELECT id, name, distance_m,
                       (deleted_at IS NULL AND status NOT IN ('HIDDEN', 'BLOCKED') AND (visibility = 'PUBLIC' OR creator_id = :viewer)) AS viewable
                FROM tbl_course WHERE id IN (:ids)""", new MapSqlParameterSource("ids", ids).addValue("viewer", viewerId), rs -> {
            out.put(rs.getLong(1), new Course(rs.getLong(1), rs.getString(2), rs.getInt(3), rs.getBoolean(4)));
        });
        return out;
    }

    public record Challenge(long courseId, long targetUserId, String targetNickname, int targetSec, Integer resultSec) {
    }

    public Map<Long, Challenge> challenges(List<Long> ids) {
        Map<Long, Challenge> out = new HashMap<>();
        if (ids.isEmpty()) return out;
        named.query("""
                SELECT c.id, c.course_id, c.target_user_id, u.nickname, r.duration_seconds,
                       (SELECT cr.duration_seconds FROM tbl_course_record cr WHERE cr.run_id = c.challenger_run_id) AS result
                FROM tbl_challenge c JOIN tbl_user u ON u.id = c.target_user_id JOIN tbl_course_record r ON r.id = c.target_record_id
                WHERE c.id IN (:ids)""", new MapSqlParameterSource("ids", ids), rs -> {
            out.put(rs.getLong(1), new Challenge(rs.getLong(2), rs.getLong(3), rs.getString(4), rs.getInt(5), (Integer) rs.getObject(6, Integer.class)));
        });
        return out;
    }

    /** 이 기록 전의 내 최고 기록 (없으면 null) */
    public Integer previousBest(long courseId, long userId, long recordId) {
        return jdbc.queryForObject("SELECT MIN(duration_seconds) FROM tbl_course_record WHERE course_id = ? AND user_id = ? AND id <> ?",
                Integer.class, courseId, userId, recordId);
    }
}
