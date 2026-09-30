package com.dallimo.dallimoserver.gamification.api;

import com.dallimo.dallimoserver.common.web.ApiResponse;
import com.dallimo.dallimoserver.gamification.application.CourseTitleService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 126장 GET /courses/{id}/crown · /local-legend (124장 Course Crown · Local Legend). 로그인 없이도 본다 (랭킹과 같다) */
@RestController
@RequestMapping("/api/v1/courses/{courseId}")
public class CourseTitleController {

    private final CourseTitleService titles;

    public CourseTitleController(CourseTitleService titles) {
        this.titles = titles;
    }

    @GetMapping("/crown")
    public ApiResponse<CourseTitleService.Crown> crown(@AuthenticationPrincipal Jwt jwt, @PathVariable long courseId) {
        return ApiResponse.ok(titles.crown(viewer(jwt), courseId));
    }

    @GetMapping("/local-legend")
    public ApiResponse<CourseTitleService.Legend> legend(@AuthenticationPrincipal Jwt jwt, @PathVariable long courseId) {
        return ApiResponse.ok(titles.legend(viewer(jwt), courseId));
    }

    private static Long viewer(Jwt jwt) {
        return jwt == null ? null : Long.parseLong(jwt.getSubject());
    }
}
