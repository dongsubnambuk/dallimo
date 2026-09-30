package com.dallimo.dallimoserver.gamification.application;

import com.dallimo.dallimoserver.course.application.CourseService;
import com.dallimo.dallimoserver.course.domain.Course;
import com.dallimo.dallimoserver.friend.application.FriendService;
import com.dallimo.dallimoserver.gamification.domain.CourseTitlePolicy;
import com.dallimo.dallimoserver.gamification.domain.CourseTitlePolicy.Window;
import com.dallimo.dallimoserver.gamification.infrastructure.CourseTitleJdbcRepository;
import com.dallimo.dallimoserver.gamification.infrastructure.CourseTitleJdbcRepository.CrownRow;
import com.dallimo.dallimoserver.gamification.infrastructure.CourseTitleJdbcRepository.LegendRow;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.Optional;
import java.util.Set;

/**
 * 124장 Course Crown · Local Legend. Crown은 기록을, Legend는 반복 참여를 보상한다 (둘을 합치지 않는다).
 * 둘 다 검증된 코스 공식 기록만 센다. 다른 사람의 위치는 쓰지 않는다 (129장).
 */
@Service
public class CourseTitleService {

    private final CourseTitleJdbcRepository store;
    private final CourseService courses;
    private final FriendService friends;
    private final Clock clock;

    public CourseTitleService(CourseTitleJdbcRepository store, CourseService courses, FriendService friends, Clock clock) {
        this.store = store;
        this.courses = courses;
        this.friends = friends;
        this.clock = clock;
    }

    /** relation: self · friend · normal (랭킹과 같다) */
    public record Holder(long userId, String name, String relation) {
    }

    /** me: 로그인했고 기간 안 내 기록이 있을 때. gapSec: 크라운까지 남은 초 (내가 크라운이면 0) */
    public record Crown(int periodDays, Instant from, Holder holder, Integer timeSec, Integer paceSecPerKm, Instant achievedAt, Long recordId, CrownMe me) {
    }

    public record CrownMe(int bestSec, int gapSec, boolean holder) {
    }

    /** me: 로그인했을 때. needed: 레전드가 되려면 더 필요한 완주 수 (지금 기준, 내가 레전드면 0) */
    public record Legend(int periodDays, Instant from, int minFinishes, Holder holder, Integer finishCount, Instant lastFinishedAt, LegendMe me) {
    }

    public record LegendMe(int finishCount, int needed, boolean holder) {
    }

    /** 이 기록으로 크라운 · 레전드가 됐는가 (기록한 순간 기준, 기록 전에 이미 가졌으면 false) */
    public record TitleChange(boolean crownTaken, boolean legendTaken, Integer legendFinishes) {
        public static final TitleChange NONE = new TitleChange(false, false, null);
    }

    @Transactional(readOnly = true)
    public Crown crown(Long viewerId, long courseId) {
        Course course = courses.requireViewable(viewerId, courseId);
        Window w = CourseTitlePolicy.windowEndingAt(clock.instant());
        Optional<CrownRow> top = store.crown(courseId, w, null);
        Set<Long> mine = viewerId == null ? Set.of() : Set.copyOf(friends.friendIds(viewerId));
        Integer myBest = viewerId == null ? null : store.best(courseId, viewerId, w);
        CrownMe me = myBest == null || top.isEmpty() ? null
                : new CrownMe(myBest, Math.max(0, myBest - top.get().seconds()), top.get().userId() == viewerId);
        double km = Math.max(1, course.getDistanceM()) / 1000.0;
        return top.map(c -> new Crown(CourseTitlePolicy.PERIOD_DAYS, w.from(), holder(c.userId(), c.nickname(), viewerId, mine),
                        c.seconds(), (int) Math.round(c.seconds() / km), c.achievedAt(), c.recordId(), me))
                .orElse(new Crown(CourseTitlePolicy.PERIOD_DAYS, w.from(), null, null, null, null, null, null));
    }

    @Transactional(readOnly = true)
    public Legend legend(Long viewerId, long courseId) {
        courses.requireViewable(viewerId, courseId);
        Window w = CourseTitlePolicy.windowEndingAt(clock.instant());
        Optional<LegendRow> top = store.legend(courseId, w, null);
        Set<Long> mine = viewerId == null ? Set.of() : Set.copyOf(friends.friendIds(viewerId));
        LegendMe me = null;
        if (viewerId != null) {
            int count = store.finishes(courseId, viewerId, w);
            boolean holder = top.isPresent() && top.get().userId() == viewerId;
            // 같은 횟수면 먼저 채운 사람이 레전드라 한 번 더 달려야 넘는다
            int needed = holder ? 0 : Math.max(1, top.map(l -> l.finishes() - count + 1).orElse(CourseTitlePolicy.LEGEND_MIN_FINISHES - count));
            me = new LegendMe(count, needed, holder);
        }
        LegendMe m = me;
        return top.map(l -> new Legend(CourseTitlePolicy.PERIOD_DAYS, w.from(), CourseTitlePolicy.LEGEND_MIN_FINISHES,
                        holder(l.userId(), l.nickname(), viewerId, mine), l.finishes(), l.lastFinishedAt(), m))
                .orElse(new Legend(CourseTitlePolicy.PERIOD_DAYS, w.from(), CourseTitlePolicy.LEGEND_MIN_FINISHES, null, null, null, m));
    }

    /** 코스 공식 기록이 생긴 순간 크라운 · 레전드를 새로 가졌는가 (결과 화면 · 활동) */
    @Transactional(readOnly = true)
    public TitleChange change(long courseId, long userId, long recordId, Instant recordedAt) {
        Window w = CourseTitlePolicy.windowEndingAt(recordedAt);
        boolean crownAfter = store.crown(courseId, w, null).map(c -> c.userId() == userId).orElse(false);
        boolean crownBefore = store.crown(courseId, w, recordId).map(c -> c.userId() == userId).orElse(false);
        Optional<LegendRow> legendAfter = store.legend(courseId, w, null).filter(l -> l.userId() == userId);
        boolean legendBefore = store.legend(courseId, w, recordId).map(l -> l.userId() == userId).orElse(false);
        return new TitleChange(crownAfter && !crownBefore, legendAfter.isPresent() && !legendBefore, legendAfter.map(LegendRow::finishes).orElse(null));
    }

    private static Holder holder(long userId, String name, Long viewerId, Set<Long> friendIds) {
        String relation = viewerId != null && userId == viewerId ? "self" : friendIds.contains(userId) ? "friend" : "normal";
        return new Holder(userId, name, relation);
    }
}
