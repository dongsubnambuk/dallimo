package com.dallimo.dallimoserver.running.infrastructure;

import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Optional;

/** tbl_run_sync_batch: 처리한 Batch를 기억해 같은 batchUuid 재전송을 멱등 처리한다 (22.2 · 25.2장) */
@Repository
public class RunSyncBatchRepository {

    public record Received(int fromSeq, int toSeq, int pointCount) {
    }

    private final JdbcTemplate jdbc;

    public RunSyncBatchRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<Received> find(long runId, String batchUuid) {
        try {
            return Optional.ofNullable(jdbc.queryForObject(
                    "SELECT from_seq, to_seq, point_count FROM tbl_run_sync_batch WHERE run_id = ? AND batch_uuid = ?",
                    (rs, i) -> new Received(rs.getInt(1), rs.getInt(2), rs.getInt(3)), runId, batchUuid));
        } catch (EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    public void insert(long runId, String batchUuid, Received b, Instant now) {
        jdbc.update("""
                INSERT INTO tbl_run_sync_batch (run_id, batch_uuid, from_seq, to_seq, point_count, received_at)
                VALUES (?, ?, ?, ?, ?, ?)""", runId, batchUuid, b.fromSeq(), b.toSeq(), b.pointCount(), Timestamp.from(now));
    }
}
