package com.dallimo.dallimoserver.common.admin;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;

/** 관리 웹 조치 기록 (V25 tbl_admin_audit, FOUNDATION-DECISION-LOG 85항) */
@Repository
public class AdminAuditJdbcRepository {

    public static final String TARGET_USER = "USER";
    public static final String TARGET_COURSE = "COURSE";

    /** actorName: 관리자 회원이면 지금 닉네임, 관리 키면 null */
    public record Entry(long id, String actor, String actorName, String action, String reason, Instant createdAt) {
    }

    private final JdbcTemplate jdbc;

    public AdminAuditJdbcRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void record(AdminKeyGuard.Admin admin, String action, String targetType, long targetId, String reason, Instant now) {
        jdbc.update("INSERT INTO tbl_admin_audit (actor, action, target_type, target_id, reason, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                admin.actor(), action, targetType, targetId, reason, Timestamp.from(now));
    }

    /** 이 대상에 한 조치 (최근 먼저) */
    public List<Entry> of(String targetType, long targetId, int limit) {
        return jdbc.query("""
                SELECT a.id, a.actor, u.nickname, a.action, a.reason, a.created_at
                FROM tbl_admin_audit a
                LEFT JOIN tbl_user u ON a.actor LIKE 'user:%' AND u.id = CAST(SUBSTRING(a.actor, 6) AS UNSIGNED)
                WHERE a.target_type = ? AND a.target_id = ?
                ORDER BY a.id DESC LIMIT ?""",
                (rs, i) -> new Entry(rs.getLong(1), rs.getString(2), rs.getString(3), rs.getString(4), rs.getString(5), rs.getTimestamp(6).toInstant()),
                targetType, targetId, limit);
    }
}
