package com.dallimo.dallimoserver.course.infrastructure;

import com.dallimo.dallimoserver.course.domain.CourseStatus;
import com.dallimo.dallimoserver.course.domain.ModerationAction;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * 코스 신고 검토 (V16). "열린 신고"는 관리자가 마지막으로 검토한 뒤(moderated_at 뒤)에 들어온, 만든 사람이 아닌 사람의 신고.
 * 같은 사람이 다시 신고하면 신고 시각이 바뀌어(CourseReviewJdbcRepository.report) 검토 뒤 신고로 다시 센다.
 */
@Repository
public class CourseModerationJdbcRepository {

    public record Target(long id, CourseStatus status, long creatorId, Instant moderatedAt) {
    }

    public record ReportedCourse(long id, String name, CourseStatus status, String source, String creatorName, int openReports, int totalReports,
                                 Map<String, Integer> openReasons, Instant lastReportedAt, Instant moderatedAt) {
    }

    public record Report(long id, long userId, String nickname, String reason, String content, Instant createdAt, boolean open) {
    }

    public record Log(ModerationAction action, CourseStatus fromStatus, CourseStatus toStatus, int reportCount, String note, Instant createdAt) {
    }

    // 열린 신고 조건 (c: tbl_course, r: tbl_course_report)
    private static final String OPEN = "r.user_id <> c.creator_id AND (c.moderated_at IS NULL OR r.created_at > c.moderated_at)";

    private final JdbcTemplate jdbc;
    private final NamedParameterJdbcTemplate named;

    public CourseModerationJdbcRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
        this.named = new NamedParameterJdbcTemplate(jdbc);
    }

    /** 지우지 않은 코스. 같은 코스를 동시에 처리하지 않게 행을 잠근다 */
    public Optional<Target> lock(long courseId) {
        return target(courseId, " FOR UPDATE");
    }

    public Optional<Target> find(long courseId) {
        return target(courseId, "");
    }

    private Optional<Target> target(long courseId, String lock) {
        return jdbc.query("SELECT id, status, creator_id, moderated_at FROM tbl_course WHERE id = ? AND deleted_at IS NULL" + lock,
                (rs, i) -> new Target(rs.getLong(1), CourseStatus.valueOf(rs.getString(2)), rs.getLong(3), instant(rs, 4)), courseId).stream().findFirst();
    }

    public int openReports(long courseId) {
        Integer n = jdbc.queryForObject("SELECT COUNT(*) FROM tbl_course c JOIN tbl_course_report r ON r.course_id = c.id WHERE c.id = ? AND " + OPEN,
                Integer.class, courseId);
        return n == null ? 0 : n;
    }

    public void update(long courseId, CourseStatus to, boolean reviewed, Instant now) {
        jdbc.update("UPDATE tbl_course SET status = ?, updated_at = ?, moderated_at = CASE WHEN ? THEN ? ELSE moderated_at END WHERE id = ?",
                to.name(), Timestamp.from(now), reviewed, Timestamp.from(now), courseId);
    }

    public void log(long courseId, ModerationAction action, CourseStatus from, CourseStatus to, int reportCount, String note, Instant now) {
        jdbc.update("""
                INSERT INTO tbl_course_moderation (course_id, action, from_status, to_status, report_count, note, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)""", courseId, action.name(), from.name(), to.name(), reportCount, note, Timestamp.from(now));
    }

    /** 숨기거나 막기 전 상태 (다시 공개할 때 돌아갈 상태). 기록이 없으면 비어 있다 */
    public Optional<CourseStatus> statusBeforeHidden(long courseId) {
        return jdbc.query("""
                SELECT from_status FROM tbl_course_moderation
                WHERE course_id = ? AND to_status IN ('HIDDEN', 'BLOCKED') AND from_status NOT IN ('HIDDEN', 'BLOCKED')
                ORDER BY id DESC LIMIT 1""", (rs, i) -> CourseStatus.valueOf(rs.getString(1)), courseId).stream().findFirst();
    }

    /**
     * 검토할 코스. status가 없으면 검토 대기(열린 신고가 있거나 숨김), 있으면 그 상태의 코스 전부.
     * 숨긴 코스 → 열린 신고가 많은 코스 → 최근 신고 순
     */
    public List<ReportedCourse> reported(CourseStatus status, int limit) {
        MapSqlParameterSource p = new MapSqlParameterSource("limit", limit);
        String where = "c.deleted_at IS NULL";
        String having = "";
        if (status == null) {
            having = "HAVING open_reports > 0 OR c.status = 'HIDDEN'";
        } else {
            where += " AND c.status = :status";
            p.addValue("status", status.name());
        }
        List<ReportedCourse> rows = named.query("""
                SELECT c.id, c.name, c.status, c.source, u.nickname, c.moderated_at, COUNT(r.id) AS total_reports,
                       COALESCE(SUM(CASE WHEN %s THEN 1 ELSE 0 END), 0) AS open_reports, MAX(r.created_at) AS last_reported_at
                FROM tbl_course c
                JOIN tbl_user u ON u.id = c.creator_id
                LEFT JOIN tbl_course_report r ON r.course_id = c.id
                WHERE %s
                GROUP BY c.id, c.name, c.status, c.source, u.nickname, c.moderated_at
                %s
                ORDER BY CASE WHEN c.status = 'HIDDEN' THEN 0 ELSE 1 END, open_reports DESC, last_reported_at DESC, c.id DESC
                LIMIT :limit""".formatted(OPEN, where, having), p,
                (rs, i) -> new ReportedCourse(rs.getLong("id"), rs.getString("name"), CourseStatus.valueOf(rs.getString("status")), rs.getString("source"),
                        rs.getString("nickname"), rs.getInt("open_reports"), rs.getInt("total_reports"), Map.of(), instant(rs, "last_reported_at"),
                        instant(rs, "moderated_at")));
        if (rows.isEmpty()) return rows;
        Map<Long, Map<String, Integer>> reasons = openReasons(rows.stream().map(ReportedCourse::id).toList());
        return rows.stream().map(r -> new ReportedCourse(r.id(), r.name(), r.status(), r.source(), r.creatorName(), r.openReports(), r.totalReports(),
                reasons.getOrDefault(r.id(), Map.of()), r.lastReportedAt(), r.moderatedAt())).toList();
    }

    private Map<Long, Map<String, Integer>> openReasons(List<Long> courseIds) {
        Map<Long, Map<String, Integer>> out = new HashMap<>();
        named.query("""
                SELECT c.id, r.reason, COUNT(*) FROM tbl_course c JOIN tbl_course_report r ON r.course_id = c.id
                WHERE c.id IN (:ids) AND %s GROUP BY c.id, r.reason ORDER BY c.id, r.reason""".formatted(OPEN),
                new MapSqlParameterSource("ids", courseIds),
                rs -> {
                    out.computeIfAbsent(rs.getLong(1), k -> new LinkedHashMap<>()).put(rs.getString(2), rs.getInt(3));
                });
        return out;
    }

    /** 이 코스의 신고 전부 (최근 먼저) */
    public List<Report> reports(long courseId) {
        return jdbc.query("""
                SELECT r.id, r.user_id, u.nickname, r.reason, r.content, r.created_at, CASE WHEN %s THEN 1 ELSE 0 END AS is_open
                FROM tbl_course_report r JOIN tbl_course c ON c.id = r.course_id JOIN tbl_user u ON u.id = r.user_id
                WHERE r.course_id = ? ORDER BY r.created_at DESC, r.id DESC""".formatted(OPEN),
                (rs, i) -> new Report(rs.getLong(1), rs.getLong(2), rs.getString(3), rs.getString(4), rs.getString(5), instant(rs, 6), rs.getInt(7) == 1),
                courseId);
    }

    /** 처리 기록 (최근 먼저) */
    public List<Log> history(long courseId) {
        return jdbc.query("""
                SELECT action, from_status, to_status, report_count, note, created_at FROM tbl_course_moderation
                WHERE course_id = ? ORDER BY id DESC""",
                (rs, i) -> new Log(ModerationAction.valueOf(rs.getString(1)), CourseStatus.valueOf(rs.getString(2)), CourseStatus.valueOf(rs.getString(3)),
                        rs.getInt(4), rs.getString(5), instant(rs, 6)), courseId);
    }

    private static Instant instant(ResultSet rs, int col) throws SQLException {
        Timestamp t = rs.getTimestamp(col);
        return t == null ? null : t.toInstant();
    }

    private static Instant instant(ResultSet rs, String col) throws SQLException {
        Timestamp t = rs.getTimestamp(col);
        return t == null ? null : t.toInstant();
    }
}
