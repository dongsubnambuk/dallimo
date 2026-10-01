package com.dallimo.dallimoserver.running.infrastructure;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;

/**
 * 워치 심박 (FOUNDATION-DECISION-LOG 65항). 러닝을 끝낼 때 한 번에 저장한다.
 * finish를 다시 보내도 같은 시각은 새로 만들지 않는다 (PRIMARY KEY(run_id, recorded_at))
 */
@Repository
public class RunHeartRateJdbcRepository {

    public record Sample(Instant recordedAt, int bpm) {
    }

    /** 평균 · 최고 심박. 기록이 없으면 null */
    public record Summary(int avgBpm, int maxBpm, int sampleCount) {
    }

    private final JdbcTemplate jdbc;

    public RunHeartRateJdbcRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void insertAll(long runId, List<Sample> samples) {
        jdbc.batchUpdate("""
                INSERT INTO tbl_run_heart_rate (run_id, recorded_at, bpm) VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE bpm = bpm""", samples, 500, (ps, s) -> {
            ps.setLong(1, runId);
            ps.setTimestamp(2, Timestamp.from(s.recordedAt()));
            ps.setInt(3, s.bpm());
        });
    }

    public Summary summary(long runId) {
        return jdbc.queryForObject("SELECT AVG(bpm), MAX(bpm), COUNT(*) FROM tbl_run_heart_rate WHERE run_id = ?", (rs, i) -> {
            int n = rs.getInt(3);
            return n == 0 ? null : new Summary((int) Math.round(rs.getDouble(1)), rs.getInt(2), n);
        }, runId);
    }

    /** 동의를 끄거나 탈퇴하면 그 사람의 심박을 모두 지운다 */
    public int deleteAllOfUser(long userId) {
        return jdbc.update("DELETE FROM tbl_run_heart_rate WHERE run_id IN (SELECT id FROM tbl_run WHERE user_id = ?)", userId);
    }
}
