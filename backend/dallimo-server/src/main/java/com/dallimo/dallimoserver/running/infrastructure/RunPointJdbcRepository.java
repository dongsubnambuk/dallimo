package com.dallimo.dallimoserver.running.infrastructure;

import com.dallimo.dallimoserver.running.domain.RunPoint;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.sql.Types;
import java.util.List;

/**
 * RunPoint 대량 저장 · 조회 (28.1장 JdbcTemplate batch, ADR-003).
 * 같은 seq가 다시 오면 새로 만들지 않는다 (UNIQUE(run_id, seq), 53장 RUN-IT-004).
 */
@Repository
public class RunPointJdbcRepository {

    private final JdbcTemplate jdbc;

    public RunPointJdbcRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void insertAll(long runId, List<RunPoint> points) {
        jdbc.batchUpdate("""
                INSERT INTO tbl_run_point (run_id, seq, latitude, longitude, altitude_m, accuracy_m, speed_mps, recorded_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE id = id""", points, 500, (ps, p) -> {
            ps.setLong(1, runId);
            ps.setInt(2, p.seq());
            ps.setDouble(3, p.latitude());
            ps.setDouble(4, p.longitude());
            setNullable(ps, 5, p.altitudeM());
            setNullable(ps, 6, p.accuracyM());
            setNullable(ps, 7, p.speedMps());
            ps.setTimestamp(8, Timestamp.from(p.recordedAt()));
        });
    }

    public List<RunPoint> findAll(long runId) {
        return jdbc.query("""
                SELECT seq, latitude, longitude, altitude_m, accuracy_m, speed_mps, recorded_at
                FROM tbl_run_point WHERE run_id = ? ORDER BY seq""", (rs, i) -> new RunPoint(
                rs.getInt(1), rs.getDouble(2), rs.getDouble(3),
                (Double) rs.getObject(4, Double.class), (Double) rs.getObject(5, Double.class), (Double) rs.getObject(6, Double.class),
                rs.getTimestamp(7).toInstant()), runId);
    }

    /** 1부터 빠짐없이 이어진 마지막 seq (0이면 아직 없음) */
    public int lastContiguousSeq(long runId) {
        Integer first = jdbc.queryForObject("SELECT MIN(seq) FROM tbl_run_point WHERE run_id = ?", Integer.class, runId);
        if (first == null || first != 1) return 0;
        Integer end = jdbc.queryForObject("""
                SELECT MIN(p.seq) FROM tbl_run_point p
                LEFT JOIN tbl_run_point q ON q.run_id = p.run_id AND q.seq = p.seq + 1
                WHERE p.run_id = ? AND q.id IS NULL""", Integer.class, runId);
        return end == null ? 0 : end;
    }

    private static void setNullable(java.sql.PreparedStatement ps, int i, Double v) throws java.sql.SQLException {
        if (v == null) ps.setNull(i, Types.DECIMAL);
        else ps.setDouble(i, v);
    }
}
