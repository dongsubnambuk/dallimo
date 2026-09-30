package com.dallimo.dallimoserver.gamification.api;

import com.dallimo.dallimoserver.common.web.ApiResponse;
import com.dallimo.dallimoserver.gamification.application.SegmentService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

/** 126장 GET /courses/{id}/segments (124장 Segment Attack). 로그인 없이도 본다 (랭킹과 같다) */
@RestController
public class SegmentController {

    private final SegmentService segments;

    public SegmentController(SegmentService segments) {
        this.segments = segments;
    }

    @GetMapping("/api/v1/courses/{courseId}/segments")
    public ApiResponse<SegmentService.Segments> segments(@AuthenticationPrincipal Jwt jwt, @PathVariable long courseId) {
        return ApiResponse.ok(segments.segments(jwt == null ? null : Long.parseLong(jwt.getSubject()), courseId));
    }
}
