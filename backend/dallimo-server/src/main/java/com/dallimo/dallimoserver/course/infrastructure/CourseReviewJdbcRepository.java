package com.dallimo.dallimoserver.course.infrastructure;

import com.dallimo.dallimoserver.course.domain.CourseReportReason;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

/** tbl_course_review · tbl_course_report (V10) */
@Repository
public class CourseReviewJdbcRepository {

    private final JdbcTemplate jdbc;

    public CourseReviewJdbcRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public record Row(long id, long userId, String nickname, int rating, Integer surface, Integer signal, Integer night, Integer crowd, Boolean toilet,
                      Boolean water, String content, Instant createdAt, Instant updatedAt) {
    }

    public record Scores(int rating, Integer surface, Integer signal, Integer night, Integer crowd, Boolean toilet, Boolean water, String content) {
    }

    private static final String SELECT = """
            SELECT v.id, v.user_id, u.nickname, v.rating, v.surface_score, v.signal_score, v.night_score, v.crowd_score, v.has_toilet, v.has_water,
                   v.content, v.created_at, v.updated_at
            FROM tbl_course_review v JOIN tbl_user u ON u.id = v.user_id""";

    private static final RowMapper<Row> ROW = (rs, i) -> new Row(rs.getLong(1), rs.getLong(2), rs.getString(3), rs.getInt(4),
            (Integer) rs.getObject(5, Integer.class), (Integer) rs.getObject(6, Integer.class), (Integer) rs.getObject(7, Integer.class),
            (Integer) rs.getObject(8, Integer.class), bool(rs.getObject(9, Integer.class)), bool(rs.getObject(10, Integer.class)), rs.getString(11),
            rs.getTimestamp(12).toInstant(), rs.getTimestamp(13).toInstant());

    /** 평가할 수 있는 기록: 이 사람이 이 코스에서 인증 완주한 Run (runId가 있으면 그 Run, 없으면 가장 최근) */
    public Optional<Long> recordRun(long userId, long courseId, Long runId) {
        List<Long> found = runId == null
                ? jdbc.queryForList("SELECT run_id FROM tbl_course_record WHERE user_id = ? AND course_id = ? ORDER BY created_at DESC, id DESC LIMIT 1",
                Long.class, userId, courseId)
                : jdbc.queryForList("SELECT run_id FROM tbl_course_record WHERE user_id = ? AND course_id = ? AND run_id = ?", Long.class, userId, courseId, runId);
        return found.stream().findFirst();
    }

    /** 한 사람 한 평가: 다시 쓰면 점수 · 내용 · 기록을 바꾼다 (MySQL · MariaDB 모두 ON DUPLICATE KEY) */
    public void upsert(long courseId, long userId, long runId, Scores s, Instant now) {
        jdbc.update("""
                INSERT INTO tbl_course_review (course_id, user_id, run_id, rating, surface_score, signal_score, night_score, crowd_score, has_toilet, has_water,
                                               content, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE run_id = VALUES(run_id), rating = VALUES(rating), surface_score = VALUES(surface_score),
                  signal_score = VALUES(signal_score), night_score = VALUES(night_score), crowd_score = VALUES(crowd_score),
                  has_toilet = VALUES(has_toilet), has_water = VALUES(has_water), content = VALUES(content), updated_at = VALUES(updated_at)""",
                courseId, userId, runId, s.rating(), s.surface(), s.signal(), s.night(), s.crowd(), tiny(s.toilet()), tiny(s.water()), s.content(),
                Timestamp.from(now), Timestamp.from(now));
    }

    public Optional<Row> find(long courseId, long userId) {
        return jdbc.query(SELECT + " WHERE v.course_id = ? AND v.user_id = ?", ROW, courseId, userId).stream().findFirst();
    }

    /** 최근 먼저, id cursor */
    public List<Row> list(long courseId, Long beforeId, int limit) {
        return beforeId == null
                ? jdbc.query(SELECT + " WHERE v.course_id = ? ORDER BY v.id DESC LIMIT ?", ROW, courseId, limit)
                : jdbc.query(SELECT + " WHERE v.course_id = ? AND v.id < ? ORDER BY v.id DESC LIMIT ?", ROW, courseId, beforeId, limit);
    }

    public int delete(long courseId, long userId) {
        return jdbc.update("DELETE FROM tbl_course_review WHERE course_id = ? AND user_id = ?", courseId, userId);
    }

    /** 한 사람 한 신고: 다시 하면 사유 · 내용을 바꾼다 */
    public void report(long courseId, long userId, CourseReportReason reason, String content, Instant now) {
        jdbc.update("""
                INSERT INTO tbl_course_report (course_id, user_id, reason, content, created_at) VALUES (?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE reason = VALUES(reason), content = VALUES(content), created_at = VALUES(created_at)""",
                courseId, userId, reason.name(), content, Timestamp.from(now));
    }

    private static Boolean bool(Integer v) {
        return v == null ? null : v == 1;
    }

    private static Integer tiny(Boolean v) {
        return v == null ? null : (v ? 1 : 0);
    }
}
