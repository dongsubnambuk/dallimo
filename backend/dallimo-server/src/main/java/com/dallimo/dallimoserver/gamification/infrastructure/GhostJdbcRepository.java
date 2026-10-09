package com.dallimo.dallimoserver.gamification.infrastructure;

import com.dallimo.dallimoserver.running.domain.RunSource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Optional;

/** 124장 고스트로 쓸 코스 공식 기록 (tbl_course_record) */
@Repository
public class GhostJdbcRepository {

    private final JdbcTemplate jdbc;

    public GhostJdbcRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** source: 기록한 Run의 source (가져온 경로는 정확도로 거르지 않는다) */
    public record RecordRow(long id, long courseId, long runId, long userId, String nickname, int seconds, RunSource source) {
    }

    private static final String SELECT = """
            SELECT r.id, r.course_id, r.run_id, r.user_id, u.nickname, r.duration_seconds, run.source
            FROM tbl_course_record r JOIN tbl_user u ON u.id = r.user_id JOIN tbl_run run ON run.id = r.run_id""";

    public Optional<RecordRow> find(long recordId) {
        return jdbc.query(SELECT + " WHERE r.id = ?", (rs, i) -> row(rs), recordId).stream().findFirst();
    }

    /** 이 코스 내 최고 공식 기록 (같으면 먼저 세운 것) */
    public Optional<RecordRow> best(long courseId, long userId) {
        return jdbc.query(SELECT + " WHERE r.course_id = ? AND r.user_id = ? ORDER BY r.duration_seconds ASC, r.id ASC LIMIT 1",
                (rs, i) -> row(rs), courseId, userId).stream().findFirst();
    }

    private static RecordRow row(ResultSet rs) throws SQLException {
        return new RecordRow(rs.getLong(1), rs.getLong(2), rs.getLong(3), rs.getLong(4), rs.getString(5), rs.getInt(6), RunSource.valueOf(rs.getString(7)));
    }
}
