package com.dallimo.dallimoserver.gamification.application;

import com.dallimo.dallimoserver.common.error.ApiException;
import com.dallimo.dallimoserver.common.error.ErrorCode;
import com.dallimo.dallimoserver.course.application.CourseService;
import com.dallimo.dallimoserver.course.domain.Course;
import com.dallimo.dallimoserver.course.infrastructure.CourseJdbcRepository;
import com.dallimo.dallimoserver.friend.application.FriendService;
import com.dallimo.dallimoserver.gamification.domain.GhostProfile;
import com.dallimo.dallimoserver.gamification.infrastructure.GhostJdbcRepository;
import com.dallimo.dallimoserver.running.domain.RunMetrics;
import com.dallimo.dallimoserver.running.infrastructure.RunPointJdbcRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * 124장 Ghost / Pace Chase. PB 어택은 내 최고 공식 기록, 도전은 도전 대상 기록을 고스트로 쓴다.
 * 공식 기록(랭킹에 보이는 기록)만 쓰고, 코스 위 거리 · 걸린 초만 준다 (GPS 좌표는 주지 않는다, 129장).
 */
@Service
public class GhostService {

    private final GhostJdbcRepository store;
    private final CourseService courses;
    private final CourseJdbcRepository routes;
    private final RunPointJdbcRepository points;
    private final FriendService friends;

    public GhostService(GhostJdbcRepository store, CourseService courses, CourseJdbcRepository routes, RunPointJdbcRepository points, FriendService friends) {
        this.store = store;
        this.courses = courses;
        this.routes = routes;
        this.points = points;
        this.friends = friends;
    }

    /** samples: [코스 위 거리(m), 걸린 초]. relation: self · friend · normal */
    public record Ghost(long recordId, long userId, String name, String relation, int timeSec, int courseLengthM, List<double[]> samples) {
    }

    /** recordId가 없으면 내 최고 공식 기록. 기록이 없거나 이 코스 기록이 아니면 404 */
    @Transactional(readOnly = true)
    public Ghost ghost(Long viewerId, long courseId, Long recordId) {
        Course course = courses.requireViewable(viewerId, courseId);
        Optional<GhostJdbcRepository.RecordRow> found = recordId != null ? store.find(recordId) : viewerId != null ? store.best(courseId, viewerId) : Optional.empty();
        GhostJdbcRepository.RecordRow r = found.filter(x -> x.courseId() == courseId)
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND, "고스트로 쓸 공식 기록이 없어요."));
        List<double[]> samples = GhostProfile.of(routes.routes(List.of(courseId)).getOrDefault(courseId, List.of()), points.findAll(r.runId()),
                course.getDistanceM(), r.seconds(), RunMetrics.checksAccuracy(r.source()));
        String relation = viewerId != null && r.userId() == viewerId ? "self" : viewerId != null && friends.friendIds(viewerId).contains(r.userId()) ? "friend" : "normal";
        return new Ghost(r.id(), r.userId(), r.nickname(), relation, r.seconds(), course.getDistanceM(), samples);
    }
}
