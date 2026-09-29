package com.dallimo.dallimoserver.notification.infrastructure;

import com.dallimo.dallimoserver.notification.domain.NotificationType;
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

/** tbl_notification (알림함), tbl_notification_setting (종류별 Push 설정) */
@Repository
public class NotificationJdbcRepository {

    private final JdbcTemplate jdbc;

    public NotificationJdbcRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public record Row(long id, long userId, NotificationType type, String title, String body, String link, Instant readAt, Instant createdAt) {
    }

    public record Settings(boolean friend, boolean live, boolean record) {
        public static final Settings ALL_ON = new Settings(true, true, true);
    }

    private static final RowMapper<Row> ROW = (rs, i) -> {
        Timestamp read = rs.getTimestamp("read_at");
        return new Row(rs.getLong("id"), rs.getLong("user_id"), NotificationType.valueOf(rs.getString("type")), rs.getString("title"), rs.getString("body"),
                rs.getString("deep_link"), read == null ? null : read.toInstant(), rs.getTimestamp("created_at").toInstant());
    };

    public long insert(long userId, NotificationType type, String title, String body, String link, Instant now) {
        GeneratedKeyHolder key = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement("""
                    INSERT INTO tbl_notification (user_id, type, title, body, deep_link, created_at) VALUES (?, ?, ?, ?, ?, ?)""", Statement.RETURN_GENERATED_KEYS);
            ps.setLong(1, userId);
            ps.setString(2, type.name());
            ps.setString(3, title);
            ps.setString(4, body);
            ps.setString(5, link);
            ps.setTimestamp(6, Timestamp.from(now));
            return ps;
        }, key);
        return key.getKey().longValue();
    }

    public Optional<Row> find(long id) {
        return jdbc.query("SELECT * FROM tbl_notification WHERE id = ?", ROW, id).stream().findFirst();
    }

    /** 최근 먼저. beforeId보다 오래된 것 (cursor) */
    public List<Row> page(long userId, Long beforeId, int limit) {
        return beforeId == null
                ? jdbc.query("SELECT * FROM tbl_notification WHERE user_id = ? ORDER BY id DESC LIMIT ?", ROW, userId, limit)
                : jdbc.query("SELECT * FROM tbl_notification WHERE user_id = ? AND id < ? ORDER BY id DESC LIMIT ?", ROW, userId, beforeId, limit);
    }

    public int markRead(long userId, long id, Instant now) {
        return jdbc.update("UPDATE tbl_notification SET read_at = COALESCE(read_at, ?) WHERE id = ? AND user_id = ?", Timestamp.from(now), id, userId);
    }

    public void markAllRead(long userId, Instant now) {
        jdbc.update("UPDATE tbl_notification SET read_at = ? WHERE user_id = ? AND read_at IS NULL", Timestamp.from(now), userId);
    }

    public int unread(long userId) {
        Integer n = jdbc.queryForObject("SELECT COUNT(*) FROM tbl_notification WHERE user_id = ? AND read_at IS NULL", Integer.class, userId);
        return n == null ? 0 : n;
    }

    public Settings settings(long userId) {
        return jdbc.query("SELECT friend_enabled, live_enabled, record_enabled FROM tbl_notification_setting WHERE user_id = ?",
                        (rs, i) -> new Settings(rs.getBoolean(1), rs.getBoolean(2), rs.getBoolean(3)), userId)
                .stream().findFirst().orElse(Settings.ALL_ON);
    }

    public void saveSettings(long userId, Settings s, Instant now) {
        jdbc.update("""
                INSERT INTO tbl_notification_setting (user_id, friend_enabled, live_enabled, record_enabled, updated_at) VALUES (?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE friend_enabled = VALUES(friend_enabled), live_enabled = VALUES(live_enabled),
                                        record_enabled = VALUES(record_enabled), updated_at = VALUES(updated_at)""",
                userId, s.friend(), s.live(), s.record(), Timestamp.from(now));
    }
}
