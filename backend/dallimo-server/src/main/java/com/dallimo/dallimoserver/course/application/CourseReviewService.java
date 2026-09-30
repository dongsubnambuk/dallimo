package com.dallimo.dallimoserver.course.application;

import com.dallimo.dallimoserver.common.error.ApiException;
import com.dallimo.dallimoserver.common.error.ErrorCode;
import com.dallimo.dallimoserver.common.web.CursorPage;
import com.dallimo.dallimoserver.course.domain.CourseReportReason;
import com.dallimo.dallimoserver.course.infrastructure.CourseReviewJdbcRepository;
import com.dallimo.dallimoserver.course.infrastructure.CourseReviewJdbcRepository.Row;
import com.dallimo.dallimoserver.course.infrastructure.CourseReviewJdbcRepository.Scores;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.util.Base64;
import java.util.List;
import java.util.Optional;

/**
 * REV-001 코스 평가 · CREG-005 코스 신고.
 * 평가는 그 코스를 인증 완주한 사람만 (완주자 기반 환경 평가). 신고는 코스를 볼 수 있는 사람 누구나.
 */
@Service
public class CourseReviewService {

    private final CourseService courses;
    private final CourseReviewJdbcRepository store;
    private final CourseModerationService moderation;
    private final Clock clock;

    public CourseReviewService(CourseService courses, CourseReviewJdbcRepository store, CourseModerationService moderation, Clock clock) {
        this.courses = courses;
        this.store = store;
        this.moderation = moderation;
        this.clock = clock;
    }

    /** runId가 없으면 이 코스의 가장 최근 인증 완주 기록으로 평가한다 */
    @Transactional
    public Row write(long userId, long courseId, Long runId, Scores scores) {
        courses.requireViewable(userId, courseId);
        long run = store.recordRun(userId, courseId, runId)
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_FORBIDDEN, "이 코스를 인증 완주한 뒤에 평가할 수 있어요."));
        store.upsert(courseId, userId, run, scores, clock.instant());
        return store.find(courseId, userId).orElseThrow();
    }

    @Transactional
    public void delete(long userId, long courseId) {
        store.delete(courseId, userId);
    }

    @Transactional(readOnly = true)
    public CursorPage<Row> list(Long viewerId, long courseId, String cursor, int size) {
        courses.requireViewable(viewerId, courseId);
        List<Row> found = store.list(courseId, cursor == null ? null : decode(cursor), size + 1);
        boolean hasNext = found.size() > size;
        List<Row> page = hasNext ? found.subList(0, size) : found;
        return new CursorPage<>(page, hasNext ? encode(page.get(page.size() - 1).id()) : null, hasNext);
    }

    /** 코스 상세의 내 평가 · 평가할 수 있는지 */
    public record Mine(boolean canReview, Row review) {
    }

    @Transactional(readOnly = true)
    public Mine mine(Long viewerId, long courseId) {
        if (viewerId == null) return new Mine(false, null);
        Optional<Row> review = store.find(courseId, viewerId);
        return new Mine(store.recordRun(viewerId, courseId, null).isPresent(), review.orElse(null));
    }

    /** 한 사람 한 신고. 서로 다른 사람의 신고가 쌓이면 코스를 자동으로 숨긴다 (CourseModerationService) */
    @Transactional
    public void report(long userId, long courseId, CourseReportReason reason, String content) {
        courses.requireViewable(userId, courseId);
        store.report(courseId, userId, reason, content, clock.instant());
        moderation.onReported(courseId);
    }

    private static String encode(long id) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(("v:" + id).getBytes(StandardCharsets.UTF_8));
    }

    private static long decode(String cursor) {
        try {
            String raw = new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8);
            if (!raw.startsWith("v:")) throw new IllegalArgumentException();
            return Long.parseLong(raw.substring(2));
        } catch (IllegalArgumentException e) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "cursor 값이 올바르지 않아요.");
        }
    }
}
