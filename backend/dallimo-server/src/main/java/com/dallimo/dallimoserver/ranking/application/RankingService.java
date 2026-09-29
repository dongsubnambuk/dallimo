package com.dallimo.dallimoserver.ranking.application;

import com.dallimo.dallimoserver.common.error.ApiException;
import com.dallimo.dallimoserver.common.error.ErrorCode;
import com.dallimo.dallimoserver.common.web.CursorPage;
import com.dallimo.dallimoserver.course.application.CourseService;
import com.dallimo.dallimoserver.course.domain.Course;
import com.dallimo.dallimoserver.ranking.domain.RankingPeriod;
import com.dallimo.dallimoserver.ranking.domain.RankingScope;
import com.dallimo.dallimoserver.ranking.infrastructure.RankingJdbcRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;

/**
 * 43장 코스 랭킹 (RNK-001~005). 공식 랭킹은 사용자별 최고 VERIFIED 기록만 쓴다 (20.1장, 23.1장).
 * 친구 랭킹은 친구 기능(WBS 8) 전이라 비어 있다.
 */
@Service
public class RankingService {

    // RNK-005 내 주변: 내 위아래 두 명씩
    static final int AROUND = 2;
    // 코스 상세 미리보기: 이번 주 1~3위
    static final int PREVIEW = 3;

    private final RankingJdbcRepository store;
    private final CourseService courses;
    private final Clock clock;

    public RankingService(RankingJdbcRepository store, CourseService courses, Clock clock) {
        this.store = store;
        this.courses = courses;
        this.clock = clock;
    }

    /** relation: self(나) · normal. friend는 친구 기능 뒤. personalBest: 이 기간 최고가 내 전체 최고 기록인가 */
    public record Entry(int rank, long userId, String name, int timeSec, int paceSecPerKm, String relation, boolean personalBest) {
    }

    public record Standing(int total, Entry entry, List<Entry> around) {
    }

    /** 코스 상세 CRS-104: 이번 주 1~3위와 내 이번 주 순위 */
    public record WeeklyPreview(List<Entry> top, Entry me) {
    }

    /** RST-003: 이 기록 전후의 주간 순위. 전에 이번 주 기록이 없었으면 before는 null */
    public record RankChange(Integer before, int after) {
    }

    @Transactional(readOnly = true)
    public CursorPage<Entry> page(Long viewerId, long courseId, RankingScope scope, RankingPeriod period, String cursor, int size) {
        Course course = courses.requireViewable(viewerId, courseId);
        if (scope == RankingScope.FRIENDS) return new CursorPage<>(List.of(), null, false);
        RankingPeriod.Window w = period.window(clock.instant());
        int offset = decodeOffset(cursor);
        List<Entry> rows = entries(course, viewerId, w, offset, size + 1);
        boolean hasNext = rows.size() > size;
        List<Entry> items = hasNext ? rows.subList(0, size) : rows;
        return new CursorPage<>(List.copyOf(items), hasNext ? encode(offset + size) : null, hasNext);
    }

    /** RNK-005 내 주변 순위. 비회원이거나 기록이 없으면 entry null */
    @Transactional(readOnly = true)
    public Standing standing(Long viewerId, long courseId, RankingScope scope, RankingPeriod period) {
        Course course = courses.requireViewable(viewerId, courseId);
        if (scope == RankingScope.FRIENDS) return new Standing(0, null, List.of());
        return standingIn(course, viewerId, period.window(clock.instant()));
    }

    @Transactional(readOnly = true)
    public WeeklyPreview weekly(Long viewerId, Course course) {
        RankingPeriod.Window w = RankingPeriod.WEEKLY.window(clock.instant());
        return new WeeklyPreview(entries(course, viewerId, w, 0, PREVIEW), standingIn(course, viewerId, w).entry());
    }

    /** 기록이 만들어진 주의 순위: 이 기록을 빼고 계산한 순위 → 넣고 계산한 순위 */
    @Transactional(readOnly = true)
    public RankChange weeklyChange(long courseId, long userId, long recordId, Instant recordedAt) {
        RankingPeriod.Window w = RankingPeriod.WEEKLY.window(recordedAt);
        Integer before = store.best(courseId, userId, w, recordId);
        Integer after = store.best(courseId, userId, w, null);
        if (after == null) throw new ApiException(ErrorCode.RESOURCE_NOT_FOUND);
        return new RankChange(before == null ? null : store.rank(courseId, userId, before, w), store.rank(courseId, userId, after, w));
    }

    private Standing standingIn(Course course, Long viewerId, RankingPeriod.Window w) {
        int total = store.total(course.getId(), w);
        Integer best = viewerId == null ? null : store.best(course.getId(), viewerId, w, null);
        if (best == null) return new Standing(total, null, List.of());
        int rank = store.rank(course.getId(), viewerId, best, w);
        int from = Math.max(0, rank - 1 - AROUND);
        List<Entry> around = entries(course, viewerId, w, from, rank - from + AROUND);
        Entry me = around.stream().filter(e -> e.userId() == viewerId).findFirst().orElse(null);
        return new Standing(total, me, around);
    }

    private List<Entry> entries(Course course, Long viewerId, RankingPeriod.Window w, int offset, int limit) {
        double km = Math.max(1, course.getDistanceM()) / 1000.0;
        List<Entry> out = new ArrayList<>();
        List<RankingJdbcRepository.Row> rows = store.page(course.getId(), w, offset, limit);
        for (int i = 0; i < rows.size(); i++) {
            RankingJdbcRepository.Row r = rows.get(i);
            boolean self = viewerId != null && r.userId() == viewerId;
            out.add(new Entry(offset + i + 1, r.userId(), r.nickname(), r.bestSec(), (int) Math.round(r.bestSec() / km),
                    self ? "self" : "normal", self && r.bestSec() == r.allBestSec()));
        }
        return out;
    }

    private static String encode(int offset) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(("o:" + offset).getBytes(StandardCharsets.UTF_8));
    }

    private static int decodeOffset(String cursor) {
        if (cursor == null) return 0;
        try {
            String raw = new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8);
            if (!raw.startsWith("o:")) throw new IllegalArgumentException();
            int n = Integer.parseInt(raw.substring(2));
            if (n < 0) throw new IllegalArgumentException();
            return n;
        } catch (IllegalArgumentException e) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "cursor 값이 올바르지 않아요.");
        }
    }
}
