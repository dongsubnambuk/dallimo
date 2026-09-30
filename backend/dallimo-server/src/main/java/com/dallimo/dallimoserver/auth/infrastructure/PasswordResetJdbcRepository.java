package com.dallimo.dallimoserver.auth.infrastructure;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Optional;

/** 비밀번호 재설정 인증 코드 (V17 tbl_password_reset) */
@Repository
public class PasswordResetJdbcRepository {

    public record Code(long id, String codeHash, Instant expiresAt, int attempts) {
    }

    private final JdbcTemplate jdbc;

    public PasswordResetJdbcRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** 새 코드. 쓰지 않은 전 코드는 더 쓸 수 없게 닫는다 */
    public void issue(long userId, String codeHash, Instant expiresAt, Instant now) {
        jdbc.update("UPDATE tbl_password_reset SET used_at = ? WHERE user_id = ? AND used_at IS NULL", Timestamp.from(now), userId);
        jdbc.update("INSERT INTO tbl_password_reset (user_id, code_hash, expires_at, attempts, created_at) VALUES (?, ?, ?, 0, ?)",
                userId, codeHash, Timestamp.from(expiresAt), Timestamp.from(now));
    }

    public int issuedSince(long userId, Instant since) {
        Integer n = jdbc.queryForObject("SELECT COUNT(*) FROM tbl_password_reset WHERE user_id = ? AND created_at > ?", Integer.class,
                userId, Timestamp.from(since));
        return n == null ? 0 : n;
    }

    /** 쓰지 않은 마지막 코드 (행을 잠근다: 동시에 여러 번 맞혀 보지 못하게) */
    public Optional<Code> activeForUpdate(long userId) {
        return jdbc.query("""
                SELECT id, code_hash, expires_at, attempts FROM tbl_password_reset
                WHERE user_id = ? AND used_at IS NULL ORDER BY id DESC LIMIT 1 FOR UPDATE""",
                (rs, i) -> new Code(rs.getLong(1), rs.getString(2), rs.getTimestamp(3).toInstant(), rs.getInt(4)), userId).stream().findFirst();
    }

    public void failed(long id) {
        jdbc.update("UPDATE tbl_password_reset SET attempts = attempts + 1 WHERE id = ?", id);
    }

    public void used(long id, Instant now) {
        jdbc.update("UPDATE tbl_password_reset SET used_at = ? WHERE id = ?", Timestamp.from(now), id);
    }
}
