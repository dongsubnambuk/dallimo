package com.dallimo.dallimoserver.ranking.infrastructure;

import com.dallimo.dallimoserver.ranking.domain.RankingPeriod.Window;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * 23.1장 랭킹 쿼리: 코스 공식 기록(tbl_course_record, VERIFIED만 있다)을 사용자별 최고 기록으로 모아 빠른 순.
 * 같은 기록이면 user_id 순. 기간은 기록이 만들어진 시각(created_at)으로 거른다 (idx_course_record_period).
 * 전체 기간은 사용자별 최고 기록 projection(tbl_course_user_best)을 순서대로 읽는다. 기록 10만 건에서 GROUP BY가 병목이라 바꿨다 (결정 로그 70항).
 * only가 있으면 그 사용자들 안에서만 센다 (친구 랭킹 RNK-004: 나 + 친구). null이면 모두.
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

    public List<Row> page(long courseId, Window w, List<Long> only, int offset, int limit) {
        if (w.allTime()) {
            List<Object> args = new ArrayList<>(List.of(courseId));
            String in = only(only, args);
            args.add(limit);
            args.add(offset);
            return jdbc.query("""
                    SELECT b.user_id, u.nickname, b.best_seconds
                    FROM tbl_course_user_best b
                    JOIN tbl_user u ON u.id = b.user_id
                    WHERE b.course_id = ?%s
                    ORDER BY b.best_seconds ASC, b.user_id ASC
                    LIMIT ? OFFSET ?""".formatted(in),
                    (rs, i) -> new Row(rs.getLong("user_id"), rs.getString("nickname"), rs.getInt("best_seconds"), rs.getInt("best_seconds")),
                    args.toArray());
        }
        List<Object> args = new ArrayList<>(List.of(courseId, courseId, ts(w.from()), ts(w.to())));
        String in = only(only, args);
        args.add(limit);
        args.add(offset);
        return jdbc.query("""
                SELECT b.user_id, u.nickname, b.best,
                       (SELECT a.best_seconds FROM tbl_course_user_best a WHERE a.course_id = ? AND a.user_id = b.user_id) AS all_best
                FROM (SELECT user_id, MIN(duration_seconds) AS best FROM tbl_course_record
                      WHERE course_id = ? AND created_at >= ? AND created_at < ?%s
                      GROUP BY user_id) b
                JOIN tbl_user u ON u.id = b.user_id
                ORDER BY b.best ASC, b.user_id ASC
                LIMIT ? OFFSET ?""".formatted(in),
                (rs, i) -> new Row(rs.getLong("user_id"), rs.getString("nickname"), rs.getInt("best"), rs.getInt("all_best")),
                args.toArray());
    }

    public int total(long courseId, Window w, List<Long> only) {
        if (w.allTime()) {
            List<Object> args = new ArrayList<>(List.of(courseId));
            String in = only(only, args);
            Integer n = jdbc.queryForObject("SELECT COUNT(*) FROM tbl_course_user_best WHERE course_id = ?" + in, Integer.class, args.toArray());
            return n == null ? 0 : n;
        }
        List<Object> args = new ArrayList<>(List.of(courseId, ts(w.from()), ts(w.to())));
        String in = only(only, args);
        Integer n = jdbc.queryForObject("SELECT COUNT(DISTINCT user_id) FROM tbl_course_record WHERE course_id = ? AND created_at >= ? AND created_at < ?" + in,
                Integer.class, args.toArray());
        return n == null ? 0 : n;
    }

    /** 기간 안 내 최고 기록. excludeRecordId가 있으면 그 기록은 빼고 (기록 전 순위 계산용) */
    public Integer best(long courseId, long userId, Window w, Long excludeRecordId) {
        if (w.allTime() && excludeRecordId == null) {
            return jdbc.queryForList("SELECT best_seconds FROM tbl_course_user_best WHERE course_id = ? AND user_id = ?", Integer.class, courseId, userId)
                    .stream().findFirst().orElse(null);
        }
        return jdbc.queryForObject("""
                SELECT MIN(duration_seconds) FROM tbl_course_record
                WHERE course_id = ? AND user_id = ? AND created_at >= ? AND created_at < ? AND (? IS NULL OR id <> ?)""",
                Integer.class, courseId, userId, ts(w.from()), ts(w.to()), excludeRecordId, excludeRecordId);
    }

    /** 이 사용자의 이 기록 시간 공식 기록 id (같은 시간이 여럿이면 먼저 세운 것) */
    public long recordId(long courseId, long userId, int durationSeconds) {
        return jdbc.queryForObject(
                "SELECT id FROM tbl_course_record WHERE course_id = ? AND user_id = ? AND duration_seconds = ? ORDER BY id LIMIT 1",
                Long.class, courseId, userId, durationSeconds);
    }

    /** bestSec 기록을 가진 userId의 순위 = 나보다 앞선 다른 사용자 수 + 1 */
    public int rank(long courseId, long userId, int bestSec, Window w, List<Long> only) {
        if (w.allTime()) {
            List<Object> args = new ArrayList<>(List.of(courseId, userId));
            String in = only(only, args);
            args.addAll(List.of(bestSec, bestSec, userId));
            Integer ahead = jdbc.queryForObject("""
                    SELECT COUNT(*) FROM tbl_course_user_best
                    WHERE course_id = ? AND user_id <> ?%s AND (best_seconds < ? OR (best_seconds = ? AND user_id < ?))""".formatted(in),
                    Integer.class, args.toArray());
            return (ahead == null ? 0 : ahead) + 1;
        }
        List<Object> args = new ArrayList<>(List.of(courseId, ts(w.from()), ts(w.to()), userId));
        String in = only(only, args);
        args.addAll(List.of(bestSec, bestSec, userId));
        Integer ahead = jdbc.queryForObject("""
                SELECT COUNT(*) FROM (SELECT user_id, MIN(duration_seconds) AS best FROM tbl_course_record
                                      WHERE course_id = ? AND created_at >= ? AND created_at < ? AND user_id <> ?%s
                                      GROUP BY user_id) b
                WHERE b.best < ? OR (b.best = ? AND b.user_id < ?)""".formatted(in),
                Integer.class, args.toArray());
        return (ahead == null ? 0 : ahead) + 1;
    }

    /** " AND user_id IN (?, …)" 조각. 인자는 args에 더한다. 빈 목록이면 아무도 없다 */
    private static String only(List<Long> only, List<Object> args) {
        if (only == null) return "";
        if (only.isEmpty()) return " AND 1 = 0";
        args.addAll(only);
        return " AND user_id IN (" + String.join(", ", Collections.nCopies(only.size(), "?")) + ")";
    }

    private static Timestamp ts(java.time.Instant i) {
        return Timestamp.from(i);
    }
}
