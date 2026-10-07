package com.dallimo.dallimoserver.admin.application;

import com.dallimo.dallimoserver.common.observability.RequestStats;
import com.dallimo.dallimoserver.common.observability.ServerErrorRecorder;
import org.springframework.data.redis.core.RedisCallback;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.lang.management.ManagementFactory;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

/**
 * 관리 웹 모니터링 (FOUNDATION-DECISION-LOG 87항): 서버 상태 · 최근 60분 API · 주요 API · 오늘 수치 · 최근 오류.
 * 긴 기간 그래프는 Prometheus · Grafana(77항)로 본다
 */
@Service
public class AdminMonitoringService {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    public record Check(boolean ok, Long ms, String error) {
    }

    public record Server(Instant startedAt, long uptimeSec, String javaVersion, long heapUsedMb, long heapMaxMb, int threads, Check db,
                         Check redis) {
    }

    // 오늘(한국 시간 0시부터): 가입 · 완료한 달리기 · 앱을 쓴 회원 · 처리 대기 신고 코스 · 서버 오류
    public record Today(int signups, int finishedRuns, int activeUsers, int pendingReports, int serverErrors) {
    }

    public record Monitoring(Instant at, Server server, RequestStats.Snapshot api, Today today) {
    }

    public record Errors(int last24h, List<ServerErrorRecorder.Group> groups, List<ServerErrorRecorder.Entry> recent) {
    }

    private final JdbcTemplate jdbc;
    private final StringRedisTemplate redis;
    private final RequestStats stats;
    private final ServerErrorRecorder errors;
    private final Clock clock;

    public AdminMonitoringService(JdbcTemplate jdbc, StringRedisTemplate redis, RequestStats stats, ServerErrorRecorder errors, Clock clock) {
        this.jdbc = jdbc;
        this.redis = redis;
        this.stats = stats;
        this.errors = errors;
        this.clock = clock;
    }

    public Monitoring monitoring() {
        Instant now = clock.instant();
        return new Monitoring(now, server(), stats.snapshot(), today(now));
    }

    public Errors errors(int days) {
        Instant now = clock.instant();
        return new Errors(errors.count(now.minus(Duration.ofHours(24))), errors.groups(now.minus(Duration.ofDays(days)), 30), errors.recent(50));
    }

    private Server server() {
        var runtime = ManagementFactory.getRuntimeMXBean();
        var heap = ManagementFactory.getMemoryMXBean().getHeapMemoryUsage();
        Check db = check(() -> jdbc.queryForObject("SELECT 1", Integer.class));
        Check rd = check(() -> redis.execute((RedisCallback<String>) c -> c.ping()));
        return new Server(Instant.ofEpochMilli(runtime.getStartTime()), runtime.getUptime() / 1000, System.getProperty("java.version"),
                heap.getUsed() / (1024 * 1024), heap.getMax() / (1024 * 1024), ManagementFactory.getThreadMXBean().getThreadCount(), db, rd);
    }

    private static Check check(Runnable probe) {
        long start = System.nanoTime();
        try {
            probe.run();
            return new Check(true, (System.nanoTime() - start) / 1_000_000, null);
        } catch (RuntimeException e) {
            String m = e.getMessage();
            return new Check(false, null, m == null ? e.getClass().getSimpleName() : m.length() > 200 ? m.substring(0, 200) : m);
        }
    }

    private Today today(Instant now) {
        Timestamp since = Timestamp.from(LocalDate.ofInstant(now, KST).atStartOfDay(KST).toInstant());
        try {
            return jdbc.queryForObject("""
                    SELECT
                      (SELECT COUNT(*) FROM tbl_user WHERE provider = 'EMAIL' AND created_at >= ?),
                      (SELECT COUNT(*) FROM tbl_run WHERE status = 'FINISHED' AND ended_at >= ?),
                      (SELECT COUNT(DISTINCT t.user_id) FROM tbl_refresh_token t JOIN tbl_user u ON u.id = t.user_id
                       WHERE u.provider = 'EMAIL' AND COALESCE(t.rotated_at, t.created_at) >= ?),
                      (SELECT COUNT(*) FROM tbl_course c WHERE c.deleted_at IS NULL AND (c.status = 'HIDDEN' OR EXISTS (
                         SELECT 1 FROM tbl_course_report r WHERE r.course_id = c.id AND r.user_id <> c.creator_id
                           AND (c.moderated_at IS NULL OR r.created_at > c.moderated_at)))),
                      (SELECT COUNT(*) FROM tbl_server_error WHERE created_at >= ?)""",
                    (rs, i) -> new Today(rs.getInt(1), rs.getInt(2), rs.getInt(3), rs.getInt(4), rs.getInt(5)), since, since, since, since);
        } catch (RuntimeException e) {
            // DB가 안 되면 서버 상태(db.ok=false)로 보인다
            return new Today(0, 0, 0, 0, 0);
        }
    }
}
