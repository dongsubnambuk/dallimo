package com.dallimo.dallimoserver.share.infrastructure;

import com.dallimo.dallimoserver.share.domain.ShareType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Optional;

/** tbl_share_link. 공유 URL에는 내부 id 대신 share_code만 쓴다 (16장) */
@Repository
public class ShareJdbcRepository {

    private final JdbcTemplate jdbc;

    public ShareJdbcRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public record Link(long creatorId, ShareType type, long referenceId, String code, Instant expiresAt) {
    }

    public Optional<String> codeOf(long creatorId, ShareType type, long referenceId) {
        return jdbc.queryForList("SELECT share_code FROM tbl_share_link WHERE creator_id = ? AND type = ? AND reference_id = ?",
                String.class, creatorId, type.name(), referenceId).stream().findFirst();
    }

    /** uk_share_code · uk_share_target에 걸리면 DuplicateKeyException */
    public void insert(long creatorId, ShareType type, long referenceId, String code, Instant now) {
        jdbc.update("INSERT INTO tbl_share_link (creator_id, type, reference_id, share_code, created_at) VALUES (?, ?, ?, ?, ?)",
                creatorId, type.name(), referenceId, code, Timestamp.from(now));
    }

    public Optional<Link> find(String code) {
        return jdbc.query("SELECT creator_id, type, reference_id, share_code, expires_at FROM tbl_share_link WHERE share_code = ?",
                (rs, i) -> {
                    Timestamp exp = rs.getTimestamp("expires_at");
                    return new Link(rs.getLong("creator_id"), ShareType.valueOf(rs.getString("type")), rs.getLong("reference_id"),
                            rs.getString("share_code"), exp == null ? null : exp.toInstant());
                }, code).stream().findFirst();
    }

    /** 이 코드가 이 방의 초대 링크인가 */
    public boolean isRoomInvite(String code, long roomId) {
        Integer n = jdbc.queryForObject("SELECT COUNT(*) FROM tbl_share_link WHERE share_code = ? AND type = 'LIVE_ROOM' AND reference_id = ?",
                Integer.class, code, roomId);
        return n != null && n > 0;
    }
}
