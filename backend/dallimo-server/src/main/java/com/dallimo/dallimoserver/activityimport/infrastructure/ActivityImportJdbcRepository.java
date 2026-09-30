package com.dallimo.dallimoserver.activityimport.infrastructure;

import com.dallimo.dallimoserver.activityimport.domain.ImportStatus;
import com.dallimo.dallimoserver.running.domain.RunSource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/** tbl_activity_import (V13): 가져오기 기록부. (user_id, source, provider_activity_id)마다 한 줄 */
@Repository
public class ActivityImportJdbcRepository {

    private final JdbcTemplate jdbc;

    public ActivityImportJdbcRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public record Row(String externalId, ImportStatus status, Long runId, Long mergedRunId, String failureReason, int attempts, Instant updatedAt) {
    }

    private static final String SELECT = "SELECT provider_activity_id, status, run_id, merged_run_id, failure_reason, attempts, updated_at FROM tbl_activity_import";

    private static final RowMapper<Row> ROW = (rs, i) -> new Row(rs.getString(1), ImportStatus.valueOf(rs.getString(2)),
            rs.getObject(3, Long.class), rs.getObject(4, Long.class), rs.getString(5), rs.getInt(6), rs.getTimestamp(7).toInstant());

    /** 행을 잠그고 읽는다 (같은 기록을 동시에 가져오지 않게) */
    public Optional<Row> findForUpdate(long userId, RunSource source, String externalId) {
        return jdbc.query(SELECT + " WHERE user_id = ? AND source = ? AND provider_activity_id = ? FOR UPDATE", ROW, userId, source.name(), externalId)
                .stream().findFirst();
    }

    public List<Row> find(long userId, RunSource source, List<String> externalIds) {
        if (externalIds.isEmpty()) return List.of();
        return new NamedParameterJdbcTemplate(jdbc).query(SELECT + " WHERE user_id = :u AND source = :s AND provider_activity_id IN (:ids)",
                Map.of("u", userId, "s", source.name(), "ids", externalIds), ROW);
    }

    /** 결과를 남긴다. 이미 있으면 바꾸고 시도 횟수를 올린다 (MySQL · MariaDB 모두 ON DUPLICATE KEY) */
    public void save(long userId, RunSource source, String externalId, ImportStatus status, Long runId, Long mergedRunId, String failureReason, Instant now) {
        jdbc.update("""
                INSERT INTO tbl_activity_import (user_id, source, provider_activity_id, status, run_id, merged_run_id, failure_reason, attempts, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
                ON DUPLICATE KEY UPDATE status = VALUES(status), run_id = VALUES(run_id), merged_run_id = VALUES(merged_run_id),
                  failure_reason = VALUES(failure_reason), attempts = attempts + 1, updated_at = VALUES(updated_at)""",
                userId, source.name(), externalId, status.name(), runId, mergedRunId, failureReason, Timestamp.from(now), Timestamp.from(now));
    }

    /** 이 시간과 겹치는 내 끝난 러닝 (id, 시작, 끝) */
    public record Span(long runId, Instant startedAt, Instant endedAt) {
    }

    public List<Span> overlappingRuns(long userId, Instant from, Instant to) {
        return jdbc.query("""
                SELECT id, started_at, ended_at FROM tbl_run
                WHERE user_id = ? AND status = 'FINISHED' AND started_at < ? AND ended_at > ?
                ORDER BY started_at""", (rs, i) -> new Span(rs.getLong(1), rs.getTimestamp(2).toInstant(), rs.getTimestamp(3).toInstant()),
                userId, Timestamp.from(to), Timestamp.from(from));
    }

    /** 연동 상태 (source마다 가져온 수 · 마지막으로 가져온 때) */
    public record Totals(RunSource source, int importedCount, Instant lastImportedAt) {
    }

    public List<Totals> totals(long userId) {
        return jdbc.query("""
                SELECT source, SUM(CASE WHEN status = 'IMPORTED' THEN 1 ELSE 0 END), MAX(CASE WHEN status = 'IMPORTED' THEN updated_at END)
                FROM tbl_activity_import WHERE user_id = ? GROUP BY source""",
                (rs, i) -> {
                    Timestamp last = rs.getTimestamp(3);
                    return new Totals(RunSource.valueOf(rs.getString(1)), rs.getInt(2), last == null ? null : last.toInstant());
                }, userId);
    }
}
