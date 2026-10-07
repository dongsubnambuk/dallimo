package com.dallimo.dallimoserver.admin.infrastructure;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * 관리 웹 공지 푸시 (V26 tbl_notice, FOUNDATION-DECISION-LOG 87항).
 * 받는 사람: 이용 중인 앱 회원(provider EMAIL). ALL은 전부, IOS · ANDROID는 그 플랫폼 기기를 등록한 회원
 */
@Repository
public class NoticeJdbcRepository {

    public enum Target {ALL, IOS, ANDROID}

    public record Notice(long id, String title, String body, String link, Target target, String status, String actor, String actorName,
                         int targetUsers, int pushTokens, int pushOk, int pushFailed, int tokensRemoved, Instant createdAt, Instant finishedAt) {
    }

    public record Audience(int users, int devices) {
    }

    private static final String ACTIVE = "u.provider = 'EMAIL' AND u.status = 'ACTIVE' AND u.deleted_at IS NULL";

    private final JdbcTemplate jdbc;

    public NoticeJdbcRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private static String platform(Target t) {
        return t == Target.ALL ? null : t.name().toLowerCase();
    }

    /** 받을 회원 조건 (u: tbl_user) */
    private static String users(Target t) {
        return t == Target.ALL ? ACTIVE : ACTIVE + " AND EXISTS (SELECT 1 FROM tbl_push_token p WHERE p.user_id = u.id AND p.platform = ?)";
    }

    public Audience audience(Target t) {
        String p = platform(t);
        Integer users = p == null
                ? jdbc.queryForObject("SELECT COUNT(*) FROM tbl_user u WHERE " + users(t), Integer.class)
                : jdbc.queryForObject("SELECT COUNT(*) FROM tbl_user u WHERE " + users(t), Integer.class, p);
        return new Audience(users == null ? 0 : users, tokens(t).size());
    }

    /** 보낼 기기 토큰 */
    public List<String> tokens(Target t) {
        String p = platform(t);
        String sql = "SELECT t.token FROM tbl_push_token t JOIN tbl_user u ON u.id = t.user_id WHERE " + ACTIVE
                + (p == null ? "" : " AND t.platform = ?") + " ORDER BY t.id";
        return p == null ? jdbc.queryForList(sql, String.class) : jdbc.queryForList(sql, String.class, p);
    }

    public long insert(String title, String body, String link, Target target, String actor, int targetUsers, Instant now) {
        GeneratedKeyHolder keys = new GeneratedKeyHolder();
        jdbc.update(c -> {
            PreparedStatement ps = c.prepareStatement("""
                    INSERT INTO tbl_notice (title, body, deep_link, target, status, actor, target_users, created_at)
                    VALUES (?, ?, ?, ?, 'SENDING', ?, ?, ?)""", Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, title);
            ps.setString(2, body);
            ps.setString(3, link);
            ps.setString(4, target.name());
            ps.setString(5, actor);
            ps.setInt(6, targetUsers);
            ps.setTimestamp(7, Timestamp.from(now));
            return ps;
        }, keys);
        return keys.getKey().longValue();
    }

    /** 받는 회원 알림함에 한 번에 넣는다. 넣은 수 */
    public int insertInbox(String title, String body, String link, Target target, Instant now) {
        String sql = "INSERT INTO tbl_notification (user_id, type, title, body, deep_link, created_at) SELECT u.id, 'NOTICE', ?, ?, ?, ? FROM tbl_user u WHERE "
                + users(target);
        String p = platform(target);
        return p == null ? jdbc.update(sql, title, body, link, Timestamp.from(now)) : jdbc.update(sql, title, body, link, Timestamp.from(now), p);
    }

    public void progress(long id, int tokens, int ok, int failed, int removed) {
        jdbc.update("UPDATE tbl_notice SET push_tokens = ?, push_ok = ?, push_failed = ?, tokens_removed = ? WHERE id = ?", tokens, ok, failed, removed, id);
    }

    public void finish(long id, String status, Instant now) {
        jdbc.update("UPDATE tbl_notice SET status = ?, finished_at = ? WHERE id = ?", status, Timestamp.from(now), id);
    }

    public Optional<Notice> find(long id) {
        return jdbc.query(SELECT + " WHERE n.id = ?", NoticeJdbcRepository::row, id).stream().findFirst();
    }

    public List<Notice> recent(int limit) {
        return jdbc.query(SELECT + " ORDER BY n.id DESC LIMIT ?", NoticeJdbcRepository::row, limit);
    }

    private static final String SELECT = """
            SELECT n.*, u.nickname AS actor_name FROM tbl_notice n
            LEFT JOIN tbl_user u ON n.actor LIKE 'user:%' AND u.id = CAST(SUBSTRING(n.actor, 6) AS UNSIGNED)""";

    private static Notice row(ResultSet rs, int i) throws SQLException {
        Timestamp f = rs.getTimestamp("finished_at");
        return new Notice(rs.getLong("id"), rs.getString("title"), rs.getString("body"), rs.getString("deep_link"), Target.valueOf(rs.getString("target")),
                rs.getString("status"), rs.getString("actor"), rs.getString("actor_name"), rs.getInt("target_users"), rs.getInt("push_tokens"),
                rs.getInt("push_ok"), rs.getInt("push_failed"), rs.getInt("tokens_removed"), rs.getTimestamp("created_at").toInstant(),
                f == null ? null : f.toInstant());
    }
}
