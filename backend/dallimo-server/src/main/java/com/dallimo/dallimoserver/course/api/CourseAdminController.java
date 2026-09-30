package com.dallimo.dallimoserver.course.api;

import com.dallimo.dallimoserver.common.admin.AdminKeyGuard;
import com.dallimo.dallimoserver.common.web.ApiResponse;
import com.dallimo.dallimoserver.course.application.CourseModerationService;
import com.dallimo.dallimoserver.course.domain.CourseStatus;
import com.dallimo.dallimoserver.course.domain.ModerationAction;
import com.dallimo.dallimoserver.course.infrastructure.CourseModerationJdbcRepository.Log;
import com.dallimo.dallimoserver.course.infrastructure.CourseModerationJdbcRepository.Report;
import com.dallimo.dallimoserver.course.infrastructure.CourseModerationJdbcRepository.ReportedCourse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;

/**
 * 코스 신고 검토 관리 API (FOUNDATION-DECISION-LOG 53항). 앱이 부르지 않는다. X-Admin-Key (AdminKeyGuard)
 */
@RestController
@Validated
@RequestMapping("/api/v1/admin/courses")
public class CourseAdminController {

    private final CourseModerationService moderation;
    private final AdminKeyGuard admin;

    public CourseAdminController(CourseModerationService moderation, AdminKeyGuard admin) {
        this.moderation = moderation;
        this.admin = admin;
    }

    public record ModerationRequest(@NotNull ModerationAction action, @Size(max = 500) String note) {

        public ModerationRequest {
            note = note == null || note.isBlank() ? null : note.trim();
        }
    }

    public record ModerationResponse(long courseId, CourseStatus status, Instant moderatedAt) {
    }

    public record ReportsResponse(long courseId, CourseStatus status, Instant moderatedAt, List<Report> reports, List<Log> history) {
    }

    /** 검토할 코스. status가 없으면 검토 대기(열린 신고가 있거나 숨김) */
    @GetMapping("/reported")
    public ApiResponse<List<ReportedCourse>> reported(@RequestHeader(name = AdminKeyGuard.HEADER, required = false) String key,
                                                      @RequestParam(required = false) CourseStatus status,
                                                      @RequestParam(defaultValue = "50") @Min(1) @Max(200) int size) {
        admin.check(key);
        return ApiResponse.ok(moderation.reported(status, size));
    }

    @GetMapping("/{courseId}/reports")
    public ApiResponse<ReportsResponse> reports(@RequestHeader(name = AdminKeyGuard.HEADER, required = false) String key, @PathVariable long courseId) {
        admin.check(key);
        CourseModerationService.Detail d = moderation.detail(courseId);
        return ApiResponse.ok(new ReportsResponse(d.course().id(), d.course().status(), d.course().moderatedAt(), d.reports(), d.history()));
    }

    /** HIDE · BLOCK · RESTORE */
    @PostMapping("/{courseId}/moderation")
    public ApiResponse<ModerationResponse> moderate(@RequestHeader(name = AdminKeyGuard.HEADER, required = false) String key, @PathVariable long courseId,
                                                    @Valid @RequestBody ModerationRequest req) {
        admin.check(key);
        var c = moderation.moderate(courseId, req.action(), req.note());
        return ApiResponse.ok(new ModerationResponse(c.id(), c.status(), c.moderatedAt()));
    }
}
