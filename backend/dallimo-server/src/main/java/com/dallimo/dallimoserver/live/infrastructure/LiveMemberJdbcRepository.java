package com.dallimo.dallimoserver.live.infrastructure;

import com.dallimo.dallimoserver.live.domain.LiveMemberStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;

/** tbl_live_run_member (PK room_id, user_id) */
@Repository
public class LiveMemberJdbcRepository {

    private final JdbcTemplate jdbc;

    public LiveMemberJdbcRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public record Member(long userId, String nickname, LiveMemberStatus status, Instant joinedAt) {
    }

    /** 들어온 순서 */
    public List<Member> list(long roomId) {
        return jdbc.query("""
                SELECT m.user_id, u.nickname, m.status, m.joined_at FROM tbl_live_run_member m
                JOIN tbl_user u ON u.id = m.user_id
                WHERE m.room_id = ? ORDER BY m.joined_at, m.user_id""",
                (rs, i) -> new Member(rs.getLong("user_id"), rs.getString("nickname"), LiveMemberStatus.valueOf(rs.getString("status")),
                        rs.getTimestamp("joined_at").toInstant()), roomId);
    }

    /** 이미 있으면 그대로 둔다 */
    public void add(long roomId, long userId, LiveMemberStatus status, Instant now) {
        jdbc.update("INSERT INTO tbl_live_run_member (room_id, user_id, status, joined_at) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE room_id = room_id",
                roomId, userId, status.name(), Timestamp.from(now));
    }

    public void setStatus(long roomId, long userId, LiveMemberStatus status) {
        jdbc.update("UPDATE tbl_live_run_member SET status = ? WHERE room_id = ? AND user_id = ?", status.name(), roomId, userId);
    }

    /** 방이 달리기 시작하면 준비한 참가자는 RUNNING */
    public void startAll(long roomId) {
        jdbc.update("UPDATE tbl_live_run_member SET status = 'RUNNING' WHERE room_id = ? AND status = 'READY'", roomId);
    }

    public void remove(long roomId, long userId) {
        jdbc.update("DELETE FROM tbl_live_run_member WHERE room_id = ? AND user_id = ?", roomId, userId);
    }

    /** 내가 참가한 방 id (최근 참가 먼저) */
    public List<Long> roomsOf(long userId) {
        return jdbc.queryForList("SELECT room_id FROM tbl_live_run_member WHERE user_id = ? ORDER BY joined_at DESC", Long.class, userId);
    }

    public String nickname(long userId) {
        return jdbc.queryForList("SELECT nickname FROM tbl_user WHERE id = ?", String.class, userId).stream().findFirst().orElse("");
    }
}
