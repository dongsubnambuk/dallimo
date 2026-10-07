package com.dallimo.dallimoserver.admin.infrastructure;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

/**
 * 관리 웹 회원 조회 (FOUNDATION-DECISION-LOG 85항). 읽기 전용.
 * 위치(GPS 점 · 코스 경로)는 읽지 않는다. 이메일은 이메일 가입자이고 탈퇴하지 않은 회원만 준다.
 */
@Repository
public class AdminUserJdbcRepository {

    public record UserRow(long id, String email, String nickname, String status, Instant createdAt, Instant lastActiveAt, int runCount,
                          List<String> platforms) {
    }

    public record Account(long id, String email, String nickname, String friendCode, String status, Instant createdAt, Instant deletedAt,
                          String runnerDistance, String runnerExperience, String runnerTime) {
    }

    public record Stats(int finishedRuns, long totalDistanceM, int verifiedRuns, int createdCourses, int reviews) {
    }

    public record Device(String deviceId, Instant signedInAt, Instant lastActiveAt, Instant expiresAt, Instant revokedAt, String pushPlatform,
                         Instant pushUpdatedAt) {
    }

    public record RunRow(long id, Instant startedAt, String mode, String status, int distanceM, int elapsedSeconds, Integer avgPaceSecPerKm,
                         Long courseId, String courseName, String verificationStatus, String failureReason, String source) {
    }

    public record CourseRow(long id, String name, String status, int distanceM, Instant createdAt, int totalReports) {
    }

    public record ReportRow(long courseId, String courseName, String reporterNickname, Long reporterId, String reason, String content,
                            Instant createdAt) {
    }

    // 회원이 아닌 계정 (개발 시드 코스를 만든 SYSTEM 등)은 목록에 넣지 않는다
    private static final String REAL_USER = "u.provider = 'EMAIL'";
    private static final String EMAIL = "CASE WHEN u.status <> 'WITHDRAWN' THEN u.provider_user_id END";

    private final JdbcTemplate jdbc;
    private final NamedParameterJdbcTemplate named;

    public AdminUserJdbcRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
        this.named = new NamedParameterJdbcTemplate(jdbc);
    }

    /**
     * 최근 가입 순. q: 숫자면 회원 id, 아니면 이메일 · 닉네임에 들어간 글자. beforeId: 이 id보다 오래된 회원부터 (다음 페이지)
     */
    public List<UserRow> search(String q, String status, Long beforeId, int limit) {
        MapSqlParameterSource p = new MapSqlParameterSource("limit", limit);
        StringBuilder where = new StringBuilder(REAL_USER);
        if (q != null && !q.isBlank()) {
            String t = q.trim();
            p.addValue("like", "%" + t.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%");
            where.append(" AND (u.nickname LIKE :like OR (u.status <> 'WITHDRAWN' AND u.provider_user_id LIKE :like)");
            if (t.chars().allMatch(Character::isDigit) && t.length() <= 18) {
                p.addValue("id", Long.parseLong(t));
                where.append(" OR u.id = :id");
            }
            where.append(")");
        }
        if (status != null) {
            p.addValue("status", status);
            where.append(" AND u.status = :status");
        }
        if (beforeId != null) {
            p.addValue("beforeId", beforeId);
            where.append(" AND u.id < :beforeId");
        }
        return named.query("""
                SELECT u.id, %s AS email, u.nickname, u.status, u.created_at,
                       (SELECT MAX(COALESCE(t.rotated_at, t.created_at)) FROM tbl_refresh_token t WHERE t.user_id = u.id) AS last_active_at,
                       (SELECT COUNT(*) FROM tbl_run r WHERE r.user_id = u.id AND r.status = 'FINISHED') AS run_count,
                       (SELECT GROUP_CONCAT(DISTINCT pt.platform ORDER BY pt.platform) FROM tbl_push_token pt WHERE pt.user_id = u.id) AS platforms
                FROM tbl_user u
                WHERE %s
                ORDER BY u.id DESC
                LIMIT :limit""".formatted(EMAIL, where), p,
                (rs, i) -> new UserRow(rs.getLong("id"), rs.getString("email"), rs.getString("nickname"), rs.getString("status"),
                        instant(rs, "created_at"), instant(rs, "last_active_at"), rs.getInt("run_count"), split(rs.getString("platforms"))));
    }

    public Optional<Account> account(long userId) {
        return jdbc.query("""
                SELECT u.id, %s AS email, u.nickname, u.friend_code, u.status, u.created_at, u.deleted_at,
                       u.runner_distance, u.runner_experience, u.runner_time
                FROM tbl_user u WHERE u.id = ? AND %s""".formatted(EMAIL, REAL_USER),
                (rs, i) -> new Account(rs.getLong("id"), rs.getString("email"), rs.getString("nickname"), rs.getString("friend_code"),
                        rs.getString("status"), instant(rs, "created_at"), instant(rs, "deleted_at"), rs.getString("runner_distance"),
                        rs.getString("runner_experience"), rs.getString("runner_time")), userId).stream().findFirst();
    }

    public Stats stats(long userId) {
        return jdbc.queryForObject("""
                SELECT
                  (SELECT COUNT(*) FROM tbl_run WHERE user_id = ? AND status = 'FINISHED'),
                  (SELECT COALESCE(SUM(distance_m), 0) FROM tbl_run WHERE user_id = ? AND status = 'FINISHED'),
                  (SELECT COUNT(*) FROM tbl_run WHERE user_id = ? AND verification_status = 'VERIFIED'),
                  (SELECT COUNT(*) FROM tbl_course WHERE creator_id = ? AND deleted_at IS NULL),
                  (SELECT COUNT(*) FROM tbl_course_review WHERE user_id = ?)""",
                (rs, i) -> new Stats(rs.getInt(1), rs.getLong(2), rs.getInt(3), rs.getInt(4), rs.getInt(5)),
                userId, userId, userId, userId, userId);
    }

    /** 로그인한 기기 (최근 사용 순). 기기마다 세션 하나 (uk_refresh_device) */
    public List<Device> devices(long userId) {
        return jdbc.query("""
                SELECT t.device_id, t.created_at, COALESCE(t.rotated_at, t.created_at) AS last_active_at, t.expires_at, t.revoked_at,
                       p.platform, p.updated_at
                FROM tbl_refresh_token t
                LEFT JOIN tbl_push_token p ON p.user_id = t.user_id AND p.device_id = t.device_id
                WHERE t.user_id = ?
                ORDER BY last_active_at DESC, t.id DESC
                LIMIT 20""",
                (rs, i) -> new Device(rs.getString(1), instant(rs, 2), instant(rs, 3), instant(rs, 4), instant(rs, 5), rs.getString(6), instant(rs, 7)),
                userId);
    }

    /** 최근 달리기 (시작 시각 순). 인증 실패 사유는 마지막 검증 기록 */
    public List<RunRow> runs(long userId, int limit) {
        return jdbc.query("""
                SELECT r.id, r.started_at, r.mode, r.status, r.distance_m, r.elapsed_seconds, r.avg_pace_sec_per_km, r.course_id, c.name,
                       r.verification_status, r.source,
                       (SELECT v.failure_reason FROM tbl_run_verification v WHERE v.run_id = r.id ORDER BY v.created_at DESC, v.id DESC LIMIT 1)
                FROM tbl_run r LEFT JOIN tbl_course c ON c.id = r.course_id
                WHERE r.user_id = ?
                ORDER BY r.started_at DESC, r.id DESC
                LIMIT ?""",
                (rs, i) -> new RunRow(rs.getLong(1), instant(rs, 2), rs.getString(3), rs.getString(4), rs.getInt(5), rs.getInt(6),
                        (Integer) rs.getObject(7, Integer.class), (Long) rs.getObject(8, Long.class), rs.getString(9), rs.getString(10),
                        rs.getString(12), rs.getString(11)),
                userId, limit);
    }

    /** 이 회원이 만든 코스 (최근 순) */
    public List<CourseRow> courses(long userId, int limit) {
        return jdbc.query("""
                SELECT c.id, c.name, c.status, c.distance_m, c.created_at,
                       (SELECT COUNT(*) FROM tbl_course_report r WHERE r.course_id = c.id AND r.user_id <> c.creator_id)
                FROM tbl_course c WHERE c.creator_id = ? AND c.deleted_at IS NULL
                ORDER BY c.created_at DESC, c.id DESC LIMIT ?""",
                (rs, i) -> new CourseRow(rs.getLong(1), rs.getString(2), rs.getString(3), rs.getInt(4), instant(rs, 5), rs.getInt(6)),
                userId, limit);
    }

    /** 이 회원이 한 신고 (최근 순) */
    public List<ReportRow> reportsMade(long userId, int limit) {
        return jdbc.query("""
                SELECT r.course_id, c.name, NULL, NULL, r.reason, r.content, r.created_at
                FROM tbl_course_report r JOIN tbl_course c ON c.id = r.course_id
                WHERE r.user_id = ?
                ORDER BY r.created_at DESC, r.id DESC LIMIT ?""", AdminUserJdbcRepository::report, userId, limit);
    }

    /** 이 회원이 만든 코스에 들어온 신고 (최근 순, 본인 신고 제외) */
    public List<ReportRow> reportsReceived(long userId, int limit) {
        return jdbc.query("""
                SELECT r.course_id, c.name, u.nickname, r.user_id, r.reason, r.content, r.created_at
                FROM tbl_course_report r JOIN tbl_course c ON c.id = r.course_id JOIN tbl_user u ON u.id = r.user_id
                WHERE c.creator_id = ? AND r.user_id <> c.creator_id
                ORDER BY r.created_at DESC, r.id DESC LIMIT ?""", AdminUserJdbcRepository::report, userId, limit);
    }

    private static ReportRow report(ResultSet rs, int i) throws SQLException {
        return new ReportRow(rs.getLong(1), rs.getString(2), rs.getString(3), (Long) rs.getObject(4, Long.class), rs.getString(5),
                rs.getString(6), instant(rs, 7));
    }

    private static List<String> split(String csv) {
        return csv == null || csv.isBlank() ? List.of() : Arrays.asList(csv.split(","));
    }

    private static Instant instant(ResultSet rs, int col) throws SQLException {
        Timestamp t = rs.getTimestamp(col);
        return t == null ? null : t.toInstant();
    }

    private static Instant instant(ResultSet rs, String col) throws SQLException {
        Timestamp t = rs.getTimestamp(col);
        return t == null ? null : t.toInstant();
    }
}
