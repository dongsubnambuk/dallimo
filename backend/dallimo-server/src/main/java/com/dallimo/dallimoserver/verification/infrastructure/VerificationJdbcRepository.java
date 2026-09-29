package com.dallimo.dallimoserver.verification.infrastructure;

import com.dallimo.dallimoserver.verification.domain.VerificationResult;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * tbl_run_verification(검사별 결과 · 근거, 26.4장)과 tbl_course_record(VERIFIED 공식 기록).
 */
@Repository
public class VerificationJdbcRepository {

    private final JdbcTemplate jdbc;

    public VerificationJdbcRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void insertResult(long runId, VerificationResult r, String policyVersion, Instant now) {
        jdbc.update("""
                        INSERT INTO tbl_run_verification (run_id, start_check, end_check, distance_check, route_check, speed_check,
                                                          match_rate, failure_reason, policy_version, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                runId, r.start().name(), r.end().name(), r.distance().name(), r.route().name(), r.speed().name(),
                rate(r.matchRate()), r.failureReason() == null ? null : r.failureReason().name(), policyVersion, Timestamp.from(now));
    }

    /** run_id UNIQUE: 같은 Run으로 공식 기록이 두 번 생기지 않는다 */
    public void insertRecord(long courseId, long runId, long userId, int seconds, int paceSecPerKm, Double matchRate, Instant now) {
        jdbc.update("""
                        INSERT INTO tbl_course_record (course_id, run_id, user_id, duration_seconds, avg_pace_sec_per_km, match_rate, verified_at, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                courseId, runId, userId, seconds, paceSecPerKm, rate(matchRate), Timestamp.from(now), Timestamp.from(now));
    }

    /** 끝났는데 검증 대기로 남은 Run (커밋 뒤 검증이 서버 재시작 등으로 돌지 못한 것) */
    public List<Long> stalePending(Instant updatedBefore, int limit) {
        return jdbc.queryForList("""
                SELECT id FROM tbl_run WHERE status = 'FINISHED' AND verification_status = 'PENDING' AND updated_at < ?
                ORDER BY id LIMIT ?""", Long.class, Timestamp.from(updatedBefore), limit);
    }

    public Optional<Integer> courseDistance(long courseId) {
        return jdbc.queryForList("SELECT distance_m FROM tbl_course WHERE id = ?", Integer.class, courseId).stream().findFirst();
    }

    /** 결과 화면용: 가장 최근 검증 근거 + 공식 기록 + 이 기록 전의 내 최고 기록 */
    public record Summary(String failureReason, Double matchRate, String policyVersion, Integer recordSeconds, Integer previousBestSec) {
    }

    public Optional<Summary> summary(long runId) {
        List<Summary> rows = jdbc.query("""
                SELECT v.failure_reason, v.match_rate, v.policy_version, cr.duration_seconds,
                       (SELECT MIN(p.duration_seconds) FROM tbl_course_record p
                        WHERE cr.id IS NOT NULL AND p.course_id = cr.course_id AND p.user_id = cr.user_id AND p.id < cr.id) AS previous_best
                FROM tbl_run_verification v
                LEFT JOIN tbl_course_record cr ON cr.run_id = v.run_id
                WHERE v.run_id = ?
                ORDER BY v.created_at DESC, v.id DESC LIMIT 1""", (rs, i) -> {
            BigDecimal rate = rs.getBigDecimal("match_rate");
            int record = rs.getInt("duration_seconds");
            Integer recordSeconds = rs.wasNull() ? null : record;
            int prev = rs.getInt("previous_best");
            Integer previous = rs.wasNull() ? null : prev;
            return new Summary(rs.getString("failure_reason"), rate == null ? null : rate.doubleValue(), rs.getString("policy_version"), recordSeconds, previous);
        }, runId);
        return rows.stream().findFirst();
    }

    private static BigDecimal rate(Double v) {
        return v == null ? null : BigDecimal.valueOf(v).setScale(2, RoundingMode.HALF_UP);
    }
}
