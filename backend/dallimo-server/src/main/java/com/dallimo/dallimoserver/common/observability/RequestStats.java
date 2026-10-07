package com.dallimo.dallimoserver.common.observability;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.servlet.HandlerMapping;

import java.io.IOException;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * 관리 웹 모니터링용 API 요청 통계 (FOUNDATION-DECISION-LOG 87항). 서버 메모리에 1분 단위로 최근 60분만 둔다.
 * 서버를 다시 켜면 비어서 다시 모은다. 긴 기간 그래프는 Prometheus · Grafana(77항)로 본다.
 * - 대상: /api/ 요청 (관리 API · actuator 제외)
 * - 주요 API: GPS 업로드 · 랭킹 · 주변 코스 (성능 개선 때 잰 세 곳, docs/perf)
 */
@Component
public class RequestStats extends OncePerRequestFilter {

    /** 주요 API: 이름, 메서드, 경로 패턴 */
    public record KeyApi(String name, String method, String pattern) {
    }

    public static final List<KeyApi> KEY_APIS = List.of(
            new KeyApi("GPS 업로드", "POST", "/api/v1/runs/{runId}/points"),
            new KeyApi("코스 랭킹", "GET", "/api/v1/courses/{courseId}/rankings"),
            new KeyApi("주변 코스", "GET", "/api/v1/courses/nearby"));

    // 응답 시간 구간 (ms). 마지막 칸은 그 위 전부
    static final long[] BOUNDS = {10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000};
    private static final int MINUTES = 60;

    public record Summary(long requests, long errors, Long p95Ms) {
    }

    public record Minute(Instant at, long requests, long errors, Long p95Ms) {
    }

    public record KeySummary(String name, String method, String pattern, long requests, long errors, Long p95Ms) {
    }

    public record Snapshot(Instant since, Summary total, List<Minute> minutes, List<KeySummary> keyApis) {
    }

    /** 한 묶음: 요청 수 · 5xx 수 · 응답 시간 구간별 수 */
    static final class Hist {
        long requests;
        long errors;
        final long[] buckets = new long[BOUNDS.length + 1];

        void add(long ms, boolean error) {
            requests++;
            if (error) errors++;
            int i = 0;
            while (i < BOUNDS.length && ms > BOUNDS[i]) i++;
            buckets[i]++;
        }

        void addAll(Hist o) {
            requests += o.requests;
            errors += o.errors;
            for (int i = 0; i < buckets.length; i++) buckets[i] += o.buckets[i];
        }

        /** 95번째 백분위 (구간 안에서는 고르게 있다고 보고 나눈다). 요청이 없으면 null */
        Long p95() {
            if (requests == 0) return null;
            double target = requests * 0.95;
            long seen = 0;
            for (int i = 0; i < buckets.length; i++) {
                if (buckets[i] == 0) continue;
                if (seen + buckets[i] >= target) {
                    long lo = i == 0 ? 0 : BOUNDS[i - 1];
                    long hi = i < BOUNDS.length ? BOUNDS[i] : BOUNDS[BOUNDS.length - 1] * 2;
                    return Math.round(lo + (hi - lo) * ((target - seen) / buckets[i]));
                }
                seen += buckets[i];
            }
            return BOUNDS[BOUNDS.length - 1];
        }
    }

    private static final class Slot {
        long minute = -1;
        final Hist all = new Hist();
        final Hist[] keys = new Hist[KEY_APIS.size()];

        Slot() {
            reset(-1);
        }

        void reset(long m) {
            minute = m;
            all.requests = 0;
            all.errors = 0;
            java.util.Arrays.fill(all.buckets, 0);
            for (int i = 0; i < keys.length; i++) keys[i] = new Hist();
        }
    }

    private final Slot[] slots = new Slot[MINUTES];
    private final Clock clock;
    private final Instant startedAt;

    // 웹 계층만 띄운 테스트(@WebMvcTest)에는 Clock 빈이 없다
    public RequestStats(ObjectProvider<Clock> clock) {
        this.clock = clock.getIfAvailable(Clock::systemUTC);
        this.startedAt = this.clock.instant();
        for (int i = 0; i < MINUTES; i++) slots[i] = new Slot();
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String uri = request.getRequestURI();
        return !uri.startsWith("/api/") || uri.startsWith("/api/v1/admin/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain) throws ServletException, IOException {
        long start = System.nanoTime();
        boolean failed = false;
        try {
            chain.doFilter(request, response);
        } catch (IOException | ServletException | RuntimeException e) {
            failed = true;
            throw e;
        } finally {
            long ms = (System.nanoTime() - start) / 1_000_000;
            Object pattern = request.getAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE);
            record(request.getMethod(), pattern == null ? null : pattern.toString(), ms, failed || response.getStatus() >= 500);
        }
    }

    synchronized void record(String method, String pattern, long ms, boolean error) {
        long m = clock.instant().getEpochSecond() / 60;
        Slot s = slots[(int) (m % MINUTES)];
        if (s.minute != m) s.reset(m);
        s.all.add(ms, error);
        for (int i = 0; i < KEY_APIS.size(); i++) {
            KeyApi k = KEY_APIS.get(i);
            if (k.method().equals(method) && k.pattern().equals(pattern)) s.keys[i].add(ms, error);
        }
    }

    /** 최근 60분 (서버가 켜진 뒤만) */
    public synchronized Snapshot snapshot() {
        long now = clock.instant().getEpochSecond() / 60;
        Hist total = new Hist();
        Hist[] keys = new Hist[KEY_APIS.size()];
        for (int i = 0; i < keys.length; i++) keys[i] = new Hist();
        List<Minute> minutes = new ArrayList<>(MINUTES);
        for (long m = now - MINUTES + 1; m <= now; m++) {
            Slot s = slots[(int) (m % MINUTES)];
            Instant at = Instant.ofEpochSecond(m * 60);
            if (s.minute != m) {
                minutes.add(new Minute(at, 0, 0, null));
                continue;
            }
            minutes.add(new Minute(at, s.all.requests, s.all.errors, s.all.p95()));
            total.addAll(s.all);
            for (int i = 0; i < keys.length; i++) keys[i].addAll(s.keys[i]);
        }
        List<KeySummary> keySummaries = new ArrayList<>();
        for (int i = 0; i < keys.length; i++) {
            KeyApi k = KEY_APIS.get(i);
            keySummaries.add(new KeySummary(k.name(), k.method(), k.pattern(), keys[i].requests, keys[i].errors, keys[i].p95()));
        }
        Instant since = Instant.ofEpochSecond((now - MINUTES + 1) * 60);
        return new Snapshot(since.isBefore(startedAt) ? startedAt : since, new Summary(total.requests, total.errors, total.p95()), minutes,
                keySummaries);
    }
}
