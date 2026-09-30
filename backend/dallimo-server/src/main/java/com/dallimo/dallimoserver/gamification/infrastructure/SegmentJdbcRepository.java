package com.dallimo.dallimoserver.gamification.infrastructure;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/** 124장 구간 기록 (tbl_course_segment_record). 순위는 사용자별 최고 기록, 같으면 먼저 세운 기록 */
@Repository
public class SegmentJdbcRepository {

    private final JdbcTemplate jdbc;

    public SegmentJdbcRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public record Leader(long userId, String nickname, int seconds) {
    }

    public record RunSegment(long id, int index, int count, int seconds) {
    }

    public void insert(long courseId, int index, int count, long runId, long userId, int seconds, Instant now) {
        jdbc.update("""
                INSERT INTO tbl_course_segment_record (course_id, segment_index, segment_count, run_id, user_id, duration_seconds, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)""", courseId, index, count, runId, userId, seconds, Timestamp.from(now));
    }

    /** 구간 1위 (가장 빠른 기록, 같으면 먼저 세운 기록) */
    public Optional<Leader> leader(long courseId, int count, int index) {
        return jdbc.query("""
                        SELECT s.user_id, u.nickname, s.duration_seconds FROM tbl_course_segment_record s JOIN tbl_user u ON u.id = s.user_id
                        WHERE s.course_id = ? AND s.segment_count = ? AND s.segment_index = ?
                        ORDER BY s.duration_seconds ASC, s.created_at ASC, s.id ASC LIMIT 1""",
                (rs, i) -> new Leader(rs.getLong(1), rs.getString(2), rs.getInt(3)), courseId, count, index).stream().findFirst();
    }

    /** 구간별 내 최고 기록 (index → 초) */
    public Map<Integer, Integer> bests(long courseId, int count, long userId) {
        Map<Integer, Integer> out = new HashMap<>();
        jdbc.query("""
                SELECT segment_index, MIN(duration_seconds) FROM tbl_course_segment_record
                WHERE course_id = ? AND segment_count = ? AND user_id = ? GROUP BY segment_index""",
                rs -> {
                    out.put(rs.getInt(1), rs.getInt(2));
                }, courseId, count, userId);
        return out;
    }

    /** 구간별 기록을 남긴 사람 수 */
    public Map<Integer, Integer> runners(long courseId, int count) {
        Map<Integer, Integer> out = new HashMap<>();
        jdbc.query("""
                SELECT segment_index, COUNT(DISTINCT user_id) FROM tbl_course_segment_record
                WHERE course_id = ? AND segment_count = ? GROUP BY segment_index""",
                rs -> {
                    out.put(rs.getInt(1), rs.getInt(2));
                }, courseId, count);
        return out;
    }

    public List<RunSegment> forRun(long runId) {
        return jdbc.query("SELECT id, segment_index, segment_count, duration_seconds FROM tbl_course_segment_record WHERE run_id = ? ORDER BY segment_index",
                (rs, i) -> new RunSegment(rs.getLong(1), rs.getInt(2), rs.getInt(3), rs.getInt(4)), runId);
    }

    /** 이 구간 기록보다 먼저 남긴 내 구간 최고 기록 (없으면 null). 나중 기록은 세지 않아 예전 결과를 다시 봐도 같다 */
    public Integer previousBest(long courseId, int count, int index, long userId, long beforeRecordId) {
        return jdbc.queryForObject("""
                SELECT MIN(duration_seconds) FROM tbl_course_segment_record
                WHERE course_id = ? AND segment_count = ? AND segment_index = ? AND user_id = ? AND id < ?""",
                Integer.class, courseId, count, index, userId, beforeRecordId);
    }

    /** seconds 기록을 가진 userId의 구간 순위 = 나보다 빠른 다른 사용자 수 + 1 (지금 기준) */
    public int rank(long courseId, int count, int index, long userId, int seconds) {
        Integer ahead = jdbc.queryForObject("""
                SELECT COUNT(*) FROM (SELECT user_id, MIN(duration_seconds) AS best FROM tbl_course_segment_record
                                      WHERE course_id = ? AND segment_count = ? AND segment_index = ? AND user_id <> ?
                                      GROUP BY user_id) b
                WHERE b.best < ?""", Integer.class, courseId, count, index, userId, seconds);
        return (ahead == null ? 0 : ahead) + 1;
    }
}
