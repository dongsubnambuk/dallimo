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

    private record Row(long id, long userId, String deviceId) {
    }

    /**
     * 이 기기의 토큰을 저장한다. 같은 토큰을 쓰던 다른 계정 · 기기 줄은 지운다.
     * 먼저 잠금 없이 읽고 지우기 · 고치기를 id로 한다. 조건으로 지우면(DELETE WHERE token = ?) 지울 줄이 없어도 빈자리에 잠금이 걸려,
     * 같은 기기의 등록이 겹치면 데드락이 났다 (FOUNDATION-DECISION-LOG 93항). 겹쳐서 실패하면 NotificationService가 다시 시도한다
     */
    @Transactional
    public void save(long userId, String deviceId, String token, String platform, Instant now) {
        List<Row> rows = jdbc.query("SELECT id, user_id, device_id FROM tbl_push_token WHERE token = ? OR (user_id = ? AND device_id = ?)",
                (rs, i) -> new Row(rs.getLong(1), rs.getLong(2), rs.getString(3)), token, userId, deviceId);
        Long mine = null;
        for (Row r : rows) {
            if (r.userId() == userId && r.deviceId().equals(deviceId)) mine = r.id();
            else jdbc.update("DELETE FROM tbl_push_token WHERE id = ?", r.id());
        }
        if (mine != null) {
            jdbc.update("UPDATE tbl_push_token SET token = ?, platform = ?, updated_at = ? WHERE id = ?", token, platform, Timestamp.from(now), mine);
        } else {
            jdbc.update("INSERT INTO tbl_push_token (user_id, device_id, token, platform, updated_at) VALUES (?, ?, ?, ?, ?)",
                    userId, deviceId, token, platform, Timestamp.from(now));
        }
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
