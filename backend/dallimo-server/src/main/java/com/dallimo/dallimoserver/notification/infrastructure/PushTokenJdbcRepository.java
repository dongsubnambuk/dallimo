package com.dallimo.dallimoserver.notification.infrastructure;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;

/** tbl_push_token. 기기마다 토큰 하나, 한 토큰은 한 사용자에게만 (같은 휴대폰에서 다른 계정으로 로그인하면 옮겨 간다) */
@Repository
public class PushTokenJdbcRepository {

    private final JdbcTemplate jdbc;

    public PushTokenJdbcRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional
    public void save(long userId, String deviceId, String token, String platform, Instant now) {
        jdbc.update("DELETE FROM tbl_push_token WHERE token = ? AND NOT (user_id = ? AND device_id = ?)", token, userId, deviceId);
        jdbc.update("""
                INSERT INTO tbl_push_token (user_id, device_id, token, platform, updated_at) VALUES (?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE token = VALUES(token), platform = VALUES(platform), updated_at = VALUES(updated_at)""",
                userId, deviceId, token, platform, Timestamp.from(now));
    }

    public List<String> tokens(long userId) {
        return jdbc.queryForList("SELECT token FROM tbl_push_token WHERE user_id = ? ORDER BY id", String.class, userId);
    }

    public void deleteToken(String token) {
        jdbc.update("DELETE FROM tbl_push_token WHERE token = ?", token);
    }

    public void deleteDevice(long userId, String deviceId) {
        jdbc.update("DELETE FROM tbl_push_token WHERE user_id = ? AND device_id = ?", userId, deviceId);
    }

    public void deleteUser(long userId) {
        jdbc.update("DELETE FROM tbl_push_token WHERE user_id = ?", userId);
    }
}
