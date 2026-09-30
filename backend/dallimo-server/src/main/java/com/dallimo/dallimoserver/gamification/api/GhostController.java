package com.dallimo.dallimoserver.gamification.api;

import com.dallimo.dallimoserver.common.web.ApiResponse;
import com.dallimo.dallimoserver.gamification.application.GhostService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** 124장 Ghost: GET /courses/{id}/ghost?recordId= (없으면 내 PB). 명세 126장 표에 경로가 없어 정했다 */
@RestController
public class GhostController {

    private final GhostService ghosts;

    public GhostController(GhostService ghosts) {
        this.ghosts = ghosts;
    }

    @GetMapping("/api/v1/courses/{courseId}/ghost")
    public ApiResponse<GhostService.Ghost> ghost(@AuthenticationPrincipal Jwt jwt, @PathVariable long courseId, @RequestParam(required = false) Long recordId) {
        return ApiResponse.ok(ghosts.ghost(jwt == null ? null : Long.parseLong(jwt.getSubject()), courseId, recordId));
    }
}
