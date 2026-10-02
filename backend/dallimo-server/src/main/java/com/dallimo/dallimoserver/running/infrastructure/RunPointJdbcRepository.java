package com.dallimo.dallimoserver.running.infrastructure;

import com.dallimo.dallimoserver.running.domain.RunPoint;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.sql.Types;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;

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

    /**
     * 히스토리 목록 썸네일용으로 줄인 경로 (runId → [위도, 경도] 최대 maxPoints+1개). 정확도가 50m보다 나쁜 점은 뺀다.
     * 러닝마다 첫 · 마지막 seq 사이를 고르게 나눈 seq만 (run_id, seq) 인덱스로 읽는다.
     * 러닝 점 전체를 창 함수로 정렬하면 2시간 러닝 20개(14만 점)에 0.6~1.3초가 걸렸다 (결정 로그 70항)
     */
    public Map<Long, List<double[]>> previews(List<Long> runIds, int maxPoints) {
        Map<Long, List<double[]>> out = new HashMap<>();
        if (runIds.isEmpty()) return out;
        NamedParameterJdbcTemplate named = new NamedParameterJdbcTemplate(jdbc);
        Map<Long, int[]> range = new HashMap<>();
        named.query("SELECT run_id, MIN(seq), MAX(seq) FROM tbl_run_point WHERE run_id IN (:ids) GROUP BY run_id",
                Map.of("ids", runIds), rs -> {
                    range.put(rs.getLong(1), new int[]{rs.getInt(2), rs.getInt(3)});
                });
        if (range.isEmpty()) return out;
        List<String> where = new ArrayList<>();
        MapSqlParameterSource args = new MapSqlParameterSource();
        int k = 0;
        for (Map.Entry<Long, int[]> e : range.entrySet()) {
            int first = e.getValue()[0], last = e.getValue()[1];
            Set<Integer> seqs = new TreeSet<>();
            for (int i = 0; i <= maxPoints; i++) seqs.add(first + (int) Math.round((double) (last - first) * i / maxPoints));
            where.add("(run_id = :r" + k + " AND seq IN (:s" + k + "))");
            args.addValue("r" + k, e.getKey()).addValue("s" + k, seqs);
            k++;
        }
        named.query("""
                SELECT run_id, latitude, longitude FROM tbl_run_point
                WHERE (%s) AND (accuracy_m IS NULL OR accuracy_m <= 50)
                ORDER BY run_id, seq""".formatted(String.join(" OR ", where)), args, rs -> {
            out.computeIfAbsent(rs.getLong(1), x -> new ArrayList<>()).add(new double[]{rs.getDouble(2), rs.getDouble(3)});
        });
        return out;
    }

    /**
     * 1부터 빠짐없이 이어진 마지막 seq (0이면 아직 없음).
     * knownSeq: 이미 이어진 것을 확인한 seq (Run.contiguousSeq). 그 뒤부터만 세서 러닝이 길어도 새로 받은 point만 읽는다.
     * point는 지우지 않으므로 knownSeq까지는 계속 이어져 있다
     */
    public int lastContiguousSeq(long runId, int knownSeq) {
        if (knownSeq <= 0) {
            Integer first = jdbc.queryForObject("SELECT MIN(seq) FROM tbl_run_point WHERE run_id = ?", Integer.class, runId);
            if (first == null || first != 1) return 0;
        }
        Integer end = jdbc.queryForObject("""
                SELECT MIN(p.seq) FROM tbl_run_point p
                LEFT JOIN tbl_run_point q ON q.run_id = p.run_id AND q.seq = p.seq + 1
                WHERE p.run_id = ? AND p.seq >= ? AND q.id IS NULL""", Integer.class, runId, Math.max(1, knownSeq));
        return end == null ? 0 : end;
    }

    private static void setNullable(java.sql.PreparedStatement ps, int i, Double v) throws java.sql.SQLException {
        if (v == null) ps.setNull(i, Types.DECIMAL);
        else ps.setDouble(i, v);
    }
}
