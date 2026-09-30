package com.dallimo.dallimoserver.gamification.infrastructure;

import com.dallimo.dallimoserver.gamification.domain.CourseTitlePolicy;
import com.dallimo.dallimoserver.gamification.domain.CourseTitlePolicy.Window;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Optional;

/** 124장 Course Crown · Local Legend 집계 (tbl_course_record). excludeRecordId: 이 기록을 빼고 (기록 전 타이틀 계산용) */
@Repository
public class CourseTitleJdbcRepository {

    private final JdbcTemplate jdbc;

    public CourseTitleJdbcRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public record CrownRow(long recordId, long userId, String nickname, int seconds, Instant achievedAt) {
    }

    public record LegendRow(long userId, String nickname, int finishes, Instant lastFinishedAt) {
    }

    /** 기간 안 가장 빠른 기록. 같으면 먼저 세운 기록 (idx_course_record_period) */
    public Optional<CrownRow> crown(long courseId, Window w, Long excludeRecordId) {
        return jdbc.query("""
                        SELECT r.id, r.user_id, u.nickname, r.duration_seconds, r.created_at
                        FROM tbl_course_record r JOIN tbl_user u ON u.id = r.user_id
                        WHERE r.course_id = ? AND r.created_at >= ? AND r.created_at < ? AND (? IS NULL OR r.id <> ?)
                        ORDER BY r.duration_seconds ASC, r.created_at ASC, r.id ASC
                        LIMIT 1""",
                (rs, i) -> new CrownRow(rs.getLong(1), rs.getLong(2), rs.getString(3), rs.getInt(4), rs.getTimestamp(5).toInstant()),
                courseId, ts(w.from()), ts(w.to()), excludeRecordId, excludeRecordId).stream().findFirst();
    }

    /** 기간 안 가장 많이 완주한 사람 (LEGEND_MIN_FINISHES번 이상). 같으면 마지막 완주가 이른 사람, 그다음 user_id */
    public Optional<LegendRow> legend(long courseId, Window w, Long excludeRecordId) {
        return jdbc.query("""
                        SELECT b.user_id, u.nickname, b.finishes, b.last_at
                        FROM (SELECT user_id, COUNT(*) AS finishes, MAX(created_at) AS last_at FROM tbl_course_record
                              WHERE course_id = ? AND created_at >= ? AND created_at < ? AND (? IS NULL OR id <> ?)
                              GROUP BY user_id
                              HAVING COUNT(*) >= ?) b
                        JOIN tbl_user u ON u.id = b.user_id
                        ORDER BY b.finishes DESC, b.last_at ASC, b.user_id ASC
                        LIMIT 1""",
                (rs, i) -> new LegendRow(rs.getLong(1), rs.getString(2), rs.getInt(3), rs.getTimestamp(4).toInstant()),
                courseId, ts(w.from()), ts(w.to()), excludeRecordId, excludeRecordId, CourseTitlePolicy.LEGEND_MIN_FINISHES).stream().findFirst();
    }

    /** 기간 안 내 최고 기록 (없으면 null) */
    public Integer best(long courseId, long userId, Window w) {
        return jdbc.queryForObject("SELECT MIN(duration_seconds) FROM tbl_course_record WHERE course_id = ? AND user_id = ? AND created_at >= ? AND created_at < ?",
                Integer.class, courseId, userId, ts(w.from()), ts(w.to()));
    }

    /** 기간 안 내 검증 완주 수 */
    public int finishes(long courseId, long userId, Window w) {
        Integer n = jdbc.queryForObject("SELECT COUNT(*) FROM tbl_course_record WHERE course_id = ? AND user_id = ? AND created_at >= ? AND created_at < ?",
                Integer.class, courseId, userId, ts(w.from()), ts(w.to()));
        return n == null ? 0 : n;
    }

    private static Timestamp ts(Instant i) {
        return Timestamp.from(i);
    }
}
