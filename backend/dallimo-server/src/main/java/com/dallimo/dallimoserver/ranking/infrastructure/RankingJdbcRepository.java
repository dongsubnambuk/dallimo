package com.dallimo.dallimoserver.ranking.infrastructure;

import com.dallimo.dallimoserver.ranking.domain.RankingPeriod.Window;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.util.List;

/**
 * 23.1장 랭킹 쿼리: 코스 공식 기록(tbl_course_record, VERIFIED만 있다)을 사용자별 최고 기록으로 모아 빠른 순.
 * 같은 기록이면 user_id 순. 기간은 기록이 만들어진 시각(created_at)으로 거른다 (idx_course_record_period).
 */
@Repository
public class RankingJdbcRepository {

    private final JdbcTemplate jdbc;

    public RankingJdbcRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** allBestSec: 이 사용자의 전체 기간 최고 기록 (기간 최고가 PB인지 보려고) */
    public record Row(long userId, String nickname, int bestSec, int allBestSec) {
    }

    public List<Row> page(long courseId, Window w, int offset, int limit) {
        return jdbc.query("""
                SELECT b.user_id, u.nickname, b.best,
                       (SELECT MIN(a.duration_seconds) FROM tbl_course_record a WHERE a.course_id = ? AND a.user_id = b.user_id) AS all_best
                FROM (SELECT user_id, MIN(duration_seconds) AS best FROM tbl_course_record
                      WHERE course_id = ? AND created_at >= ? AND created_at < ?
                      GROUP BY user_id) b
                JOIN tbl_user u ON u.id = b.user_id
                ORDER BY b.best ASC, b.user_id ASC
                LIMIT ? OFFSET ?""",
                (rs, i) -> new Row(rs.getLong("user_id"), rs.getString("nickname"), rs.getInt("best"), rs.getInt("all_best")),
                courseId, courseId, ts(w.from()), ts(w.to()), limit, offset);
    }

    public int total(long courseId, Window w) {
        Integer n = jdbc.queryForObject("SELECT COUNT(DISTINCT user_id) FROM tbl_course_record WHERE course_id = ? AND created_at >= ? AND created_at < ?",
                Integer.class, courseId, ts(w.from()), ts(w.to()));
        return n == null ? 0 : n;
    }

    /** 기간 안 내 최고 기록. excludeRecordId가 있으면 그 기록은 빼고 (기록 전 순위 계산용) */
    public Integer best(long courseId, long userId, Window w, Long excludeRecordId) {
        return jdbc.queryForObject("""
                SELECT MIN(duration_seconds) FROM tbl_course_record
                WHERE course_id = ? AND user_id = ? AND created_at >= ? AND created_at < ? AND (? IS NULL OR id <> ?)""",
                Integer.class, courseId, userId, ts(w.from()), ts(w.to()), excludeRecordId, excludeRecordId);
    }

    /** bestSec 기록을 가진 userId의 순위 = 나보다 앞선 다른 사용자 수 + 1 */
    public int rank(long courseId, long userId, int bestSec, Window w) {
        Integer ahead = jdbc.queryForObject("""
                SELECT COUNT(*) FROM (SELECT user_id, MIN(duration_seconds) AS best FROM tbl_course_record
                                      WHERE course_id = ? AND created_at >= ? AND created_at < ? AND user_id <> ?
                                      GROUP BY user_id) b
                WHERE b.best < ? OR (b.best = ? AND b.user_id < ?)""",
                Integer.class, courseId, ts(w.from()), ts(w.to()), userId, bestSec, bestSec, userId);
        return (ahead == null ? 0 : ahead) + 1;
    }

    private static Timestamp ts(java.time.Instant i) {
        return Timestamp.from(i);
    }
}
