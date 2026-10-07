package com.dallimo.dallimoserver.course.application;

import com.dallimo.dallimoserver.common.error.ApiException;
import com.dallimo.dallimoserver.common.error.ErrorCode;
import com.dallimo.dallimoserver.course.domain.CourseStatus;
import com.dallimo.dallimoserver.course.domain.ModerationAction;
import com.dallimo.dallimoserver.course.infrastructure.CourseModerationJdbcRepository;
import com.dallimo.dallimoserver.course.infrastructure.CourseModerationJdbcRepository.Info;
import com.dallimo.dallimoserver.course.infrastructure.CourseModerationJdbcRepository.Log;
import com.dallimo.dallimoserver.course.infrastructure.CourseModerationJdbcRepository.Report;
import com.dallimo.dallimoserver.course.infrastructure.CourseModerationJdbcRepository.ReportedCourse;
import com.dallimo.dallimoserver.course.infrastructure.CourseModerationJdbcRepository.Target;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.List;

/**
 * 코스 신고 처리 (사용자 결정: 신고가 쌓이면 자동 숨김 + 관리자 검토, 명세 20.2장 "코스 공개 정책", FOUNDATION-DECISION-LOG 53항).
 * - 자동 숨김: 만든 사람이 아닌 서로 다른 사람의 열린 신고가 기준 수만큼 쌓이면 HIDDEN (목록 · 상세에서 빠진다, 6.3장)
 * - 관리자 검토: 숨김(HIDE) · 차단(BLOCK) · 다시 공개(RESTORE). 검토하면 그때까지의 신고는 닫힌다
 */
@Service
@EnableConfigurationProperties(CourseModerationProperties.class)
public class CourseModerationService {

    public record Detail(Target course, Info info, List<double[]> route, List<Report> reports, List<Log> history) {
    }

    // 검토 화면 경로 미리보기 점 수
    private static final int ROUTE_POINTS = 300;

    private final CourseModerationJdbcRepository store;
    private final CourseModerationProperties props;
    private final Clock clock;

    public CourseModerationService(CourseModerationJdbcRepository store, CourseModerationProperties props, Clock clock) {
        this.store = store;
        this.props = props;
        this.clock = clock;
    }

    /** 신고를 저장한 같은 트랜잭션에서 부른다. 기준을 넘으면 숨긴다. 숨겼으면 true */
    @Transactional(propagation = Propagation.MANDATORY)
    public boolean onReported(long courseId) {
        Target c = store.lock(courseId).orElse(null);
        if (c == null || !c.status().viewable()) return false;
        int open = store.openReports(courseId);
        if (open < props.autoHideReports()) return false;
        Instant now = clock.instant();
        store.update(courseId, CourseStatus.HIDDEN, false, now);
        store.log(courseId, ModerationAction.AUTO_HIDE, c.status(), CourseStatus.HIDDEN, open, null, now);
        return true;
    }

    @Transactional(readOnly = true)
    public List<ReportedCourse> reported(CourseStatus status, int size) {
        return store.reported(status, size);
    }

    @Transactional(readOnly = true)
    public Detail detail(long courseId) {
        Target c = store.find(courseId).orElseThrow(() -> new ApiException(ErrorCode.COURSE_NOT_FOUND));
        Info info = store.info(courseId).orElseThrow(() -> new ApiException(ErrorCode.COURSE_NOT_FOUND));
        return new Detail(c, info, store.route(courseId, ROUTE_POINTS), store.reports(courseId), store.history(courseId));
    }

    /**
     * 관리자 검토. HIDE → HIDDEN, BLOCK → BLOCKED, RESTORE → 숨기기 전 상태(기록이 없으면 NEW, 공개 중이면 그대로).
     * 상태가 같아도 검토 시각을 남겨 그때까지의 신고를 닫는다 (예: 신고가 근거 없으면 RESTORE로 공개 유지)
     */
    @Transactional
    public Target moderate(long courseId, ModerationAction action, String note) {
        if (action == ModerationAction.AUTO_HIDE) throw new ApiException(ErrorCode.VALIDATION_ERROR, "action은 HIDE · BLOCK · RESTORE 중 하나예요.");
        Target c = store.lock(courseId).orElseThrow(() -> new ApiException(ErrorCode.COURSE_NOT_FOUND));
        CourseStatus to = switch (action) {
            case HIDE -> CourseStatus.HIDDEN;
            case BLOCK -> CourseStatus.BLOCKED;
            default -> c.status().viewable() ? c.status() : store.statusBeforeHidden(courseId).orElse(CourseStatus.NEW);
        };
        int open = store.openReports(courseId);
        Instant now = clock.instant();
        store.update(courseId, to, true, now);
        store.log(courseId, action, c.status(), to, open, note, now);
        return new Target(c.id(), to, c.creatorId(), now);
    }
}
