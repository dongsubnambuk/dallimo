package com.dallimo.dallimoserver.gamification.application;

import com.dallimo.dallimoserver.course.application.CourseService;
import com.dallimo.dallimoserver.course.domain.Course;
import com.dallimo.dallimoserver.course.domain.CourseRoute;
import com.dallimo.dallimoserver.friend.application.FriendService;
import com.dallimo.dallimoserver.gamification.domain.CourseSegments;
import com.dallimo.dallimoserver.gamification.domain.SegmentTimer;
import com.dallimo.dallimoserver.gamification.infrastructure.SegmentJdbcRepository;
import com.dallimo.dallimoserver.running.domain.RunPoint;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 124장 Segment Attack. 코스를 약 1km씩 나눈 구간마다 인증된 러닝의 구간 기록을 남기고, 구간 1위 · 내 최고 기록을 보여준다.
 * 달리는 중 비교(구간에 들어서면 내 최고 · 1위와 비교)는 앱이 이 값으로 한다. 다른 사람의 위치는 쓰지 않는다 (129장).
 */
@Service
public class SegmentService {

    private final SegmentJdbcRepository store;
    private final CourseService courses;
    private final FriendService friends;

    public SegmentService(SegmentJdbcRepository store, CourseService courses, FriendService friends) {
        this.store = store;
        this.courses = courses;
        this.friends = friends;
    }

    public record Leader(long userId, String name, String relation, int timeSec) {
    }

    /** 구간 하나. startM · endM은 코스 거리(courseLengthM) 위 위치 */
    public record SegmentView(int index, int startM, int endM, int distanceM, Leader leader, Integer myBestSec, int runnerCount) {
    }

    public record Segments(int courseLengthM, List<SegmentView> segments) {
    }

    /** 러닝 한 번의 구간 기록. previousBestSec: 이 러닝 전 내 최고(PB는 그때 기준), rank: 이 기록의 지금 구간 순위, leaderSec: 지금 구간 1위 기록 */
    public record RunSegmentResult(int index, int timeSec, Integer previousBestSec, boolean personalBest, int rank, int leaderSec) {
    }

    @Transactional(readOnly = true)
    public Segments segments(Long viewerId, long courseId) {
        Course course = courses.requireViewable(viewerId, courseId);
        int length = course.getDistanceM();
        int count = CourseSegments.count(length);
        Map<Integer, Integer> mine = viewerId == null ? Map.of() : store.bests(courseId, count, viewerId);
        Map<Integer, Integer> runners = store.runners(courseId, count);
        Set<Long> friendIds = viewerId == null ? Set.of() : Set.copyOf(friends.friendIds(viewerId));
        List<SegmentView> out = new ArrayList<>();
        for (CourseSegments.Segment s : CourseSegments.of(length)) {
            Leader leader = store.leader(courseId, count, s.index())
                    .map(l -> new Leader(l.userId(), l.nickname(),
                            viewerId != null && l.userId() == viewerId ? "self" : friendIds.contains(l.userId()) ? "friend" : "normal", l.seconds()))
                    .orElse(null);
            out.add(new SegmentView(s.index(), (int) Math.round(s.startM()), (int) Math.round(s.endM()), (int) Math.round(s.lengthM()), leader,
                    mine.get(s.index()), runners.getOrDefault(s.index(), 0)));
        }
        return new Segments(length, out);
    }

    /** 코스 검증이 공식 기록을 만든 뒤 (같은 트랜잭션): 구간 기록을 잰다. 끝까지 가지 못한 구간은 남기지 않는다 */
    @Transactional(propagation = Propagation.MANDATORY)
    public void record(long courseId, int courseDistanceM, long runId, long userId, List<CourseRoute.Point> route, List<RunPoint> points, Instant now) {
        List<CourseSegments.Segment> segments = CourseSegments.of(courseDistanceM);
        if (segments.isEmpty()) return;
        List<Integer> times = SegmentTimer.time(route, points, segments);
        for (int i = 0; i < times.size(); i++) {
            Integer sec = times.get(i);
            if (sec != null && sec > 0) store.insert(courseId, i, segments.size(), runId, userId, sec, now);
        }
    }

    @Transactional(readOnly = true)
    public List<RunSegmentResult> forRun(long courseId, long runId, long userId) {
        List<RunSegmentResult> out = new ArrayList<>();
        for (SegmentJdbcRepository.RunSegment s : store.forRun(runId)) {
            int count = s.count();
            Integer previous = store.previousBest(courseId, count, s.index(), userId, s.id());
            int leader = store.leader(courseId, count, s.index()).map(SegmentJdbcRepository.Leader::seconds).orElse(s.seconds());
            out.add(new RunSegmentResult(s.index(), s.seconds(), previous, previous == null || s.seconds() < previous,
                    store.rank(courseId, count, s.index(), userId, s.seconds()), leader));
        }
        return out;
    }
}
