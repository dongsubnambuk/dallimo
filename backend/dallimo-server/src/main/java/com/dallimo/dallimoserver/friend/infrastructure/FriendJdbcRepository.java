package com.dallimo.dallimoserver.friend.infrastructure;

import com.dallimo.dallimoserver.friend.domain.FriendshipStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * tbl_friendship (44.1장). 두 사람 사이 관계는 (user_low_id, user_high_id) 한 줄이고 requester_id가 요청 방향이다.
 * 탈퇴한 사용자는 목록 · 검색에서 뺀다 (tbl_user.status ACTIVE만).
 */
@Repository
public class FriendJdbcRepository {

    private static final String ACTIVE = "u.status = 'ACTIVE' AND u.deleted_at IS NULL";

    private final JdbcTemplate jdbc;
    private final NamedParameterJdbcTemplate named;

    public FriendJdbcRepository(JdbcTemplate jdbc, NamedParameterJdbcTemplate named) {
        this.jdbc = jdbc;
        this.named = named;
    }

    public record Pair(long id, long lowId, long highId, long requesterId, FriendshipStatus status, Instant createdAt) {

        public long other(long userId) {
            return userId == lowId ? highId : lowId;
        }
    }

    public record UserRow(long userId, String nickname, String profileImageUrl) {
    }

    /** 친구 한 명 또는 요청 한 건: 상대와 관계 id · 시각 */
    public record Link(long id, UserRow user, Instant at) {
    }

    private static final RowMapper<Pair> PAIR = (rs, i) -> new Pair(rs.getLong("id"), rs.getLong("user_low_id"), rs.getLong("user_high_id"),
            rs.getLong("requester_id"), FriendshipStatus.valueOf(rs.getString("status")), rs.getTimestamp("created_at").toInstant());

    private static final RowMapper<UserRow> USER = (rs, i) -> new UserRow(rs.getLong("uid"), rs.getString("nickname"), rs.getString("profile_image_url"));

    /** 잠그지 않고 읽는다. 없는 줄을 FOR UPDATE로 읽으면 gap lock이 걸려 동시 요청이 deadlock이 된다 */
    public Optional<Pair> findPair(long a, long b) {
        return jdbc.query("SELECT * FROM tbl_friendship WHERE user_low_id = ? AND user_high_id = ?", PAIR, Math.min(a, b), Math.max(a, b))
                .stream().findFirst();
    }

    /** 두 사람 사이 관계 한 줄을 잠그고 읽는다 (있는 줄에만 쓴다) */
    public Optional<Pair> lockPair(long a, long b) {
        return jdbc.query("SELECT * FROM tbl_friendship WHERE user_low_id = ? AND user_high_id = ? FOR UPDATE", PAIR, Math.min(a, b), Math.max(a, b))
                .stream().findFirst();
    }

    public Optional<Pair> lockById(long id) {
        return jdbc.query("SELECT * FROM tbl_friendship WHERE id = ? FOR UPDATE", PAIR, id).stream().findFirst();
    }

    /** uk_friend_pair에 걸리면 DuplicateKeyException (동시에 서로 요청) */
    public void insert(long requesterId, long addresseeId, Instant now) {
        jdbc.update("INSERT INTO tbl_friendship (user_low_id, user_high_id, requester_id, status, created_at) VALUES (?, ?, ?, 'PENDING', ?)",
                Math.min(requesterId, addresseeId), Math.max(requesterId, addresseeId), requesterId, Timestamp.from(now));
    }

    /** 끝난 관계(거절 · 취소)를 새 요청으로 다시 쓴다 */
    public void reopen(long id, long requesterId, Instant now) {
        jdbc.update("UPDATE tbl_friendship SET requester_id = ?, status = 'PENDING', created_at = ?, responded_at = NULL WHERE id = ?",
                requesterId, Timestamp.from(now), id);
    }

    public void respond(long id, FriendshipStatus status, Instant now) {
        jdbc.update("UPDATE tbl_friendship SET status = ?, responded_at = ? WHERE id = ?", status.name(), Timestamp.from(now), id);
    }

    /** 탈퇴: 그 사람의 친구 · 요청을 모두 끝낸다 */
    public void cancelAllOf(long userId, Instant now) {
        jdbc.update("""
                UPDATE tbl_friendship SET status = 'CANCELED', responded_at = ?
                WHERE (user_low_id = ? OR user_high_id = ?) AND status IN ('PENDING', 'ACCEPTED')""", Timestamp.from(now), userId, userId);
    }

    /** 친구 목록 (닉네임 순). at = 친구가 된 시각 */
    public List<Link> friends(long userId) {
        return jdbc.query("""
                SELECT f.id, u.id AS uid, u.nickname, u.profile_image_url, COALESCE(f.responded_at, f.created_at) AS at
                FROM tbl_friendship f
                JOIN tbl_user u ON u.id = CASE WHEN f.user_low_id = ? THEN f.user_high_id ELSE f.user_low_id END
                WHERE (f.user_low_id = ? OR f.user_high_id = ?) AND f.status = 'ACCEPTED' AND %s
                ORDER BY u.nickname, u.id""".formatted(ACTIVE),
                (rs, i) -> new Link(rs.getLong("id"), USER.mapRow(rs, i), rs.getTimestamp("at").toInstant()), userId, userId, userId);
    }

    public List<Long> friendIds(long userId) {
        return jdbc.queryForList("""
                SELECT CASE WHEN f.user_low_id = ? THEN f.user_high_id ELSE f.user_low_id END
                FROM tbl_friendship f
                JOIN tbl_user u ON u.id = CASE WHEN f.user_low_id = ? THEN f.user_high_id ELSE f.user_low_id END
                WHERE (f.user_low_id = ? OR f.user_high_id = ?) AND f.status = 'ACCEPTED' AND %s""".formatted(ACTIVE),
                Long.class, userId, userId, userId, userId);
    }

    /** 받은(received) · 보낸 요청 (최근 먼저). at = 요청 시각 */
    public List<Link> pending(long userId, boolean received) {
        String who = received ? "f.requester_id <> ?" : "f.requester_id = ?";
        return jdbc.query("""
                SELECT f.id, u.id AS uid, u.nickname, u.profile_image_url, f.created_at AS at
                FROM tbl_friendship f
                JOIN tbl_user u ON u.id = CASE WHEN f.user_low_id = ? THEN f.user_high_id ELSE f.user_low_id END
                WHERE (f.user_low_id = ? OR f.user_high_id = ?) AND f.status = 'PENDING' AND %s AND %s
                ORDER BY f.created_at DESC, f.id DESC""".formatted(who, ACTIVE),
                (rs, i) -> new Link(rs.getLong("id"), USER.mapRow(rs, i), rs.getTimestamp("at").toInstant()), userId, userId, userId, userId);
    }

    /** 보는 사람과 각 사용자의 관계 (없으면 빠진다) */
    public Map<Long, Pair> pairsWith(long viewerId, List<Long> others) {
        Map<Long, Pair> out = new HashMap<>();
        if (others.isEmpty()) return out;
        List<Pair> rows = named.query("""
                SELECT * FROM tbl_friendship
                WHERE (user_low_id = :me AND user_high_id IN (:others)) OR (user_high_id = :me AND user_low_id IN (:others))""",
                new MapSqlParameterSource("me", viewerId).addValue("others", others), PAIR);
        for (Pair p : rows) out.put(p.other(viewerId), p);
        return out;
    }

    public Optional<UserRow> activeUser(long userId) {
        return jdbc.query("SELECT u.id AS uid, u.nickname, u.profile_image_url FROM tbl_user u WHERE u.id = ? AND " + ACTIVE, USER, userId)
                .stream().findFirst();
    }

    /**
     * FND-001 검색: 닉네임 일부 또는 친구 코드 정확히. 친구 코드가 맞는 사람을 맨 앞에, 나머지는 닉네임 순.
     * pattern은 LIKE용으로 escape한 값('!'가 escape 문자)
     */
    public List<UserRow> search(long viewerId, String pattern, String friendCode, int offset, int limit) {
        return jdbc.query("""
                SELECT u.id AS uid, u.nickname, u.profile_image_url FROM tbl_user u
                WHERE u.id <> ? AND %s AND (LOWER(u.nickname) LIKE ? ESCAPE '!' OR u.friend_code = ?)
                ORDER BY (u.friend_code = ?) DESC, u.nickname, u.id
                LIMIT ? OFFSET ?""".formatted(ACTIVE),
                USER, viewerId, pattern, friendCode, friendCode, limit, offset);
    }

    /** 친구 프로필: 인증된 코스 기록 한 코스에 한 줄(최고 기록), 최근에 세운 순. 볼 수 있는 코스만 */
    public record CourseBest(long courseId, String courseName, int bestSec, Instant recordedAt) {
    }

    public List<CourseBest> courseBests(long userId, long viewerId, int limit) {
        return jdbc.query("""
                SELECT r.course_id, c.name, MIN(r.duration_seconds) AS best, MAX(r.created_at) AS last_at
                FROM tbl_course_record r
                JOIN tbl_course c ON c.id = r.course_id
                WHERE r.user_id = ? AND c.deleted_at IS NULL AND c.status NOT IN ('HIDDEN', 'BLOCKED')
                  AND (c.visibility = 'PUBLIC' OR c.creator_id = ?)
                GROUP BY r.course_id, c.name
                ORDER BY last_at DESC, r.course_id
                LIMIT ?""",
                (rs, i) -> new CourseBest(rs.getLong("course_id"), rs.getString("name"), rs.getInt("best"), rs.getTimestamp("last_at").toInstant()),
                userId, viewerId, limit);
    }

    /** 마지막으로 끝낸 러닝 시각 (없으면 null) */
    public Instant lastRunAt(long userId) {
        Timestamp t = jdbc.queryForObject("SELECT MAX(ended_at) FROM tbl_run WHERE user_id = ? AND status = 'FINISHED'", Timestamp.class, userId);
        return t == null ? null : t.toInstant();
    }
}
