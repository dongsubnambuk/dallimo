package com.dallimo.dallimoserver.challenge.infrastructure;

import com.dallimo.dallimoserver.challenge.domain.ChallengeStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

/** tbl_challenge. 목표 기록(tbl_course_record)과 도전 Run의 공식 기록을 붙여 읽는다 */
@Repository
public class ChallengeJdbcRepository {

    private static final String SELECT = """
            SELECT ch.id, ch.challenger_id, cu.nickname AS challenger_name, ch.target_user_id, tu.nickname AS target_name,
                   ch.course_id, c.name AS course_name, c.distance_m, ch.target_record_id, tr.duration_seconds AS target_sec,
                   ch.challenger_run_id, ch.status, ch.created_at, ch.finished_at, rr.duration_seconds AS result_sec,
                   (SELECT b.id FROM tbl_course_record b WHERE b.course_id = ch.course_id AND b.user_id = ch.target_user_id
                    ORDER BY b.duration_seconds, b.id LIMIT 1) AS best_record_id,
                   (SELECT MIN(b.duration_seconds) FROM tbl_course_record b WHERE b.course_id = ch.course_id AND b.user_id = ch.target_user_id) AS best_sec
            FROM tbl_challenge ch
            JOIN tbl_user cu ON cu.id = ch.challenger_id
            JOIN tbl_user tu ON tu.id = ch.target_user_id
            JOIN tbl_course c ON c.id = ch.course_id
            JOIN tbl_course_record tr ON tr.id = ch.target_record_id
            LEFT JOIN tbl_course_record rr ON rr.run_id = ch.challenger_run_id
            """;

    private final JdbcTemplate jdbc;

    public ChallengeJdbcRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * resultSec: 도전 Run이 인증돼 만든 공식 기록 (없으면 null).
     * bestRecordId · bestSec: 상대의 지금 최고 기록 (재도전은 이 기록으로 새 도전을 만든다)
     */
    public record Row(long id, long challengerId, String challengerName, long targetUserId, String targetName, long courseId, String courseName,
                      int courseDistanceM, long targetRecordId, int targetSec, Long runId, ChallengeStatus status, Instant createdAt,
                      Instant finishedAt, Integer resultSec, long bestRecordId, int bestSec) {
    }

    /** 목표로 삼을 공식 기록 (tbl_course_record에는 검증을 통과한 기록만 있다) */
    public record TargetRecord(long id, long userId, long courseId, int durationSeconds) {
    }

    private static final RowMapper<Row> ROW = (rs, i) -> {
        Timestamp finished = rs.getTimestamp("finished_at");
        return new Row(rs.getLong("id"), rs.getLong("challenger_id"), rs.getString("challenger_name"), rs.getLong("target_user_id"),
                rs.getString("target_name"), rs.getLong("course_id"), rs.getString("course_name"), rs.getInt("distance_m"), rs.getLong("target_record_id"),
                rs.getInt("target_sec"), rs.getObject("challenger_run_id") == null ? null : rs.getLong("challenger_run_id"),
                ChallengeStatus.valueOf(rs.getString("status")), rs.getTimestamp("created_at").toInstant(), finished == null ? null : finished.toInstant(),
                (Integer) rs.getObject("result_sec"), rs.getLong("best_record_id"), rs.getInt("best_sec"));
    };

    public Optional<TargetRecord> targetRecord(long recordId) {
        return jdbc.query("SELECT id, user_id, course_id, duration_seconds FROM tbl_course_record WHERE id = ?",
                (rs, i) -> new TargetRecord(rs.getLong("id"), rs.getLong("user_id"), rs.getLong("course_id"), rs.getInt("duration_seconds")), recordId)
                .stream().findFirst();
    }

    public long insert(long challengerId, TargetRecord target, Instant now) {
        GeneratedKeyHolder key = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement("""
                    INSERT INTO tbl_challenge (challenger_id, target_user_id, course_id, target_record_id, status, created_at)
                    VALUES (?, ?, ?, ?, 'OPEN', ?)""", Statement.RETURN_GENERATED_KEYS);
            ps.setLong(1, challengerId);
            ps.setLong(2, target.userId());
            ps.setLong(3, target.courseId());
            ps.setLong(4, target.id());
            ps.setTimestamp(5, Timestamp.from(now));
            return ps;
        }, key);
        return key.getKey().longValue();
    }

    public Optional<Row> find(long id) {
        return jdbc.query(SELECT + " WHERE ch.id = ?", ROW, id).stream().findFirst();
    }

    /** 상태를 바꾸기 전에 줄을 잠근다 */
    public Optional<ChallengeStatus> lockStatus(long id) {
        return jdbc.queryForList("SELECT status FROM tbl_challenge WHERE id = ? FOR UPDATE", String.class, id).stream().findFirst().map(ChallengeStatus::valueOf);
    }

    public void setStatus(long id, ChallengeStatus status, Instant finishedAt) {
        jdbc.update("UPDATE tbl_challenge SET status = ?, finished_at = ? WHERE id = ?", status.name(), finishedAt == null ? null : Timestamp.from(finishedAt), id);
    }

    /** 내 OPEN 도전에 같은 코스 Run을 잇는다. 이었으면 true */
    public boolean attachRun(long id, long challengerId, long courseId, long runId) {
        return jdbc.update("""
                UPDATE tbl_challenge SET challenger_run_id = ?, status = 'RUNNING'
                WHERE id = ? AND challenger_id = ? AND course_id = ? AND status = 'OPEN' AND challenger_run_id IS NULL""",
                runId, id, challengerId, courseId) == 1;
    }

    /** 이 Run으로 진행 중인 도전 (잠그고 읽는다) */
    public Optional<Long> lockRunning(long runId) {
        return jdbc.queryForList("SELECT id FROM tbl_challenge WHERE challenger_run_id = ? AND status = 'RUNNING' FOR UPDATE", Long.class, runId)
                .stream().findFirst();
    }

    public Optional<Row> findByRun(long runId) {
        return jdbc.query(SELECT + " WHERE ch.challenger_run_id = ?", ROW, runId).stream().findFirst();
    }

    /** 내가 보냈거나 받은 도전 (최근 먼저, 취소 제외). otherId가 있으면 그 사람과 주고받은 것만 */
    public List<Row> list(long userId, Long otherId, int limit) {
        if (otherId == null) {
            return jdbc.query(SELECT + """
                    WHERE (ch.challenger_id = ? OR ch.target_user_id = ?) AND ch.status <> 'CANCELED'
                    ORDER BY ch.created_at DESC, ch.id DESC LIMIT ?""", ROW, userId, userId, limit);
        }
        return jdbc.query(SELECT + """
                WHERE ((ch.challenger_id = ? AND ch.target_user_id = ?) OR (ch.challenger_id = ? AND ch.target_user_id = ?)) AND ch.status <> 'CANCELED'
                ORDER BY ch.created_at DESC, ch.id DESC LIMIT ?""", ROW, userId, otherId, otherId, userId, limit);
    }
}
