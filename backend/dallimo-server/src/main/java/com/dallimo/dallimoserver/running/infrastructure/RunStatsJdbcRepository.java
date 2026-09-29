package com.dallimo.dallimoserver.running.infrastructure;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** MY-002 누적 통계: 끝난(FINISHED) 러닝의 수 · 거리 · 달린 시간 합 */
@Repository
public class RunStatsJdbcRepository {

    private final JdbcTemplate jdbc;

    public RunStatsJdbcRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public record Totals(int runCount, long totalDistanceM, long totalActiveSec) {
    }

    public Totals totals(long userId) {
        return jdbc.queryForObject("""
                SELECT COUNT(*), COALESCE(SUM(distance_m), 0), COALESCE(SUM(elapsed_seconds), 0)
                FROM tbl_run WHERE user_id = ? AND status = 'FINISHED'""",
                (rs, i) -> new Totals(rs.getInt(1), rs.getLong(2), rs.getLong(3)), userId);
    }
}
