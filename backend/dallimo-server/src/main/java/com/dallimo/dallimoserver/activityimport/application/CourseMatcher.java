package com.dallimo.dallimoserver.activityimport.application;

import com.dallimo.dallimoserver.course.domain.Course;
import com.dallimo.dallimoserver.course.domain.CourseRoute;
import com.dallimo.dallimoserver.course.infrastructure.CourseJdbcRepository;
import com.dallimo.dallimoserver.course.infrastructure.CourseJpaRepository;
import com.dallimo.dallimoserver.running.domain.RunMetrics;
import com.dallimo.dallimoserver.running.domain.RunPoint;
import com.dallimo.dallimoserver.verification.domain.CourseVerifier;
import com.dallimo.dallimoserver.verification.domain.VerificationOutcome;
import com.dallimo.dallimoserver.verification.domain.VerificationPolicy;
import com.dallimo.dallimoserver.verification.domain.VerificationResult;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * 122.2장 Course Matcher: 가져온 경로가 완주한 코스를 찾는다.
 * 출발점이 경로 근처인 코스만 후보로 두고(경로 둘레 박스 + 출발 반경), 코스 완주 검증(CourseVerifier)을 미리 돌려
 * 출발 · 도착 · 거리 · 경로 일치 · 속도를 모두 통과한 코스 중 따라 달린 비율이 가장 높은 것 하나 (같으면 긴 코스).
 */
@Component
public class CourseMatcher {

    // 한 경로에서 볼 코스 수 (출발점이 경로 첫 point에 가까운 순)
    static final int MAX_CANDIDATES = 30;
    private static final double METERS_PER_DEGREE = 111_320;

    private final CourseJpaRepository courses;
    private final CourseJdbcRepository store;

    public CourseMatcher(CourseJpaRepository courses, CourseJdbcRepository store) {
        this.courses = courses;
        this.store = store;
    }

    public record Match(long courseId, String name, int courseDistanceM, double matchRate, VerificationResult result) {
    }

    public Optional<Match> match(long userId, List<RunPoint> points, VerificationPolicy policy) {
        List<RunPoint> accepted = RunMetrics.compute(points, policy.checkAccuracy()).accepted();
        if (accepted.size() < 2) return Optional.empty();
        double minLat = Double.MAX_VALUE, maxLat = -Double.MAX_VALUE, minLng = Double.MAX_VALUE, maxLng = -Double.MAX_VALUE;
        for (RunPoint p : accepted) {
            minLat = Math.min(minLat, p.latitude());
            maxLat = Math.max(maxLat, p.latitude());
            minLng = Math.min(minLng, p.longitude());
            maxLng = Math.max(maxLng, p.longitude());
        }
        double dLat = policy.startRadiusM() / METERS_PER_DEGREE;
        double dLng = policy.startRadiusM() / (METERS_PER_DEGREE * Math.max(0.01, Math.cos(Math.toRadians((minLat + maxLat) / 2))));
        List<Course> inBox = courses.findInBox(userId, bd(minLat - dLat), bd(maxLat + dLat), bd(minLng - dLng), bd(maxLng + dLng));
        RunPoint first = accepted.get(0);
        List<Course> near = inBox.stream()
                .filter(c -> passesNear(accepted, c.getStartLat(), c.getStartLng(), policy.startRadiusM()))
                .sorted(Comparator.comparingDouble(c -> CourseRoute.haversineM(first.latitude(), first.longitude(), c.getStartLat(), c.getStartLng())))
                .limit(MAX_CANDIDATES)
                .toList();
        if (near.isEmpty()) return Optional.empty();
        Map<Long, List<CourseRoute.Point>> routes = store.routes(near.stream().map(Course::getId).toList());
        return near.stream()
                .map(c -> new Match(c.getId(), c.getName(), c.getDistanceM(), 0, CourseVerifier.verify(routes.getOrDefault(c.getId(), List.of()), points, policy)))
                .filter(m -> m.result().outcome() == VerificationOutcome.VERIFIED)
                .map(m -> new Match(m.courseId(), m.name(), m.courseDistanceM(), m.result().matchRate(), m.result()))
                .max(Comparator.comparingDouble(Match::matchRate).thenComparingInt(Match::courseDistanceM));
    }

    private static boolean passesNear(List<RunPoint> pts, double lat, double lng, double radius) {
        for (RunPoint p : pts) if (CourseRoute.haversineM(p.latitude(), p.longitude(), lat, lng) <= radius) return true;
        return false;
    }

    private static BigDecimal bd(double v) {
        return BigDecimal.valueOf(v);
    }
}
