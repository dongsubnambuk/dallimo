package com.dallimo.dallimoserver.course.api;

import com.dallimo.dallimoserver.common.web.ApiResponse;
import com.dallimo.dallimoserver.course.api.CourseDtos.CourseSummaryResponse;
import com.dallimo.dallimoserver.course.application.CourseService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * MY-005 내 코스 (SCR-M04: 등록 · 저장 · 완주). 41~43장 표에 경로가 없어 정했다 (backend/README 결정 사항).
 */
@RestController
public class MyCourseController {

    private final CourseService courses;

    public MyCourseController(CourseService courses) {
        this.courses = courses;
    }

    @GetMapping("/api/v1/users/me/courses")
    public ApiResponse<List<CourseSummaryResponse>> mine(@AuthenticationPrincipal Jwt jwt, @RequestParam CourseService.MyCourseKind kind) {
        return ApiResponse.ok(courses.mine(CourseController.userId(jwt), kind).stream().map(CourseSummaryResponse::from).toList());
    }
}
