package com.dallimo.dallimoserver.common.observability;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerMapping;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;

/**
 * 처리하지 못한 서버 오류를 tbl_server_error(V26)에 남긴다. 관리 웹 모니터링에서 본다 (FOUNDATION-DECISION-LOG 87항).
 * - 요청 본문 · 위치는 남기지 않는다. 메시지는 500자까지
 * - 오류가 한꺼번에 몰려도 DB를 막지 않게 1분에 60건까지만 남긴다 (나머지는 서버 로그에만)
 * - 남기다 실패해도 요청 응답에는 영향을 주지 않는다
 * - 30일 지난 기록은 하루 한 번 지운다
 */
@Component
public class ServerErrorRecorder {

    private static final Logger log = LoggerFactory.getLogger(ServerErrorRecorder.class);
    private static final int PER_MINUTE = 60;
    static final Duration KEEP = Duration.ofDays(30);

    public record Entry(long id, Instant createdAt, String exception, String message, String location, String method, String path,
                        String requestId, Long userId) {
    }

    public record Group(String exception, String location, int count, Instant lastAt, String lastMessage, String lastPath) {
    }

    private final JdbcTemplate jdbc;
    private final Clock clock;
    private long minute = -1;
    private int written;

    public ServerErrorRecorder(JdbcTemplate jdbc, Clock clock) {
        this.jdbc = jdbc;
        this.clock = clock;
    }

    public void record(Throwable e, HttpServletRequest request) {
        try {
            Instant now = clock.instant();
            if (!allow(now)) return;
            Object pattern = request == null ? null : request.getAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE);
            String path = pattern != null ? pattern.toString() : request == null ? null : request.getRequestURI();
            String user = MDC.get(Correlation.USER_ID);
            jdbc.update("""
                            INSERT INTO tbl_server_error (exception, message, location, method, path, request_id, user_id, created_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                    cut(e.getClass().getName(), 200), cut(e.getMessage(), 500), cut(location(e), 300),
                    request == null ? null : request.getMethod(), cut(path, 300), MDC.get(Correlation.REQUEST_ID),
                    user == null || user.isBlank() ? null : parse(user), Timestamp.from(now));
        } catch (RuntimeException ex) {
            log.warn("server error not recorded: {}", ex.getMessage());
        }
    }

    private synchronized boolean allow(Instant now) {
        long m = now.getEpochSecond() / 60;
        if (m != minute) {
            minute = m;
            written = 0;
        }
        return written++ < PER_MINUTE;
    }

    /** 최근 오류 (최신 먼저) */
    public List<Entry> recent(int limit) {
        return jdbc.query("""
                        SELECT id, created_at, exception, message, location, method, path, request_id, user_id
                        FROM tbl_server_error ORDER BY id DESC LIMIT ?""",
                (rs, i) -> new Entry(rs.getLong(1), rs.getTimestamp(2).toInstant(), rs.getString(3), rs.getString(4), rs.getString(5),
                        rs.getString(6), rs.getString(7), rs.getString(8), (Long) rs.getObject(9, Long.class)), limit);
    }

    /** since 뒤 오류를 종류(예외 + 위치)별로. 많이 난 순 */
    public List<Group> groups(Instant since, int limit) {
        return jdbc.query("""
                        SELECT g.exception, g.location, g.n, g.last_at, e.message, e.path
                        FROM (SELECT exception, COALESCE(location, '') AS location, COUNT(*) AS n, MAX(id) AS last_id, MAX(created_at) AS last_at
                              FROM tbl_server_error WHERE created_at >= ? GROUP BY exception, COALESCE(location, '')) g
                        JOIN tbl_server_error e ON e.id = g.last_id
                        ORDER BY g.n DESC, g.last_at DESC LIMIT ?""",
                (rs, i) -> new Group(rs.getString(1), rs.getString(2).isEmpty() ? null : rs.getString(2), rs.getInt(3),
                        rs.getTimestamp(4).toInstant(), rs.getString(5), rs.getString(6)),
                Timestamp.from(since), limit);
    }

    public int count(Instant since) {
        Integer n = jdbc.queryForObject("SELECT COUNT(*) FROM tbl_server_error WHERE created_at >= ?", Integer.class, Timestamp.from(since));
        return n == null ? 0 : n;
    }

    @Scheduled(cron = "0 17 4 * * *", zone = "Asia/Seoul")
    public void cleanUp() {
        try {
            int n = jdbc.update("DELETE FROM tbl_server_error WHERE created_at < ?", Timestamp.from(clock.instant().minus(KEEP)));
            if (n > 0) log.info("server errors cleaned up: {}", n);
        } catch (RuntimeException ex) {
            log.warn("server error cleanup failed: {}", ex.getMessage());
        }
    }

    /** 오류가 난 곳: 달리모 코드의 첫 줄 (없으면 맨 위 줄) */
    static String location(Throwable e) {
        Throwable root = e;
        StackTraceElement[] st = root.getStackTrace();
        for (StackTraceElement s : st) {
            if (s.getClassName().startsWith("com.dallimo.")) return frame(s);
        }
        return st.length > 0 ? frame(st[0]) : null;
    }

    private static String frame(StackTraceElement s) {
        String cls = s.getClassName();
        return cls.substring(cls.lastIndexOf('.') + 1) + "." + s.getMethodName() + ":" + s.getLineNumber();
    }

    private static Long parse(String s) {
        try {
            return Long.parseLong(s);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static String cut(String s, int max) {
        return s == null ? null : s.length() <= max ? s : s.substring(0, max);
    }
}
