package com.dallimo.dallimoserver.activity.api;

import com.dallimo.dallimoserver.activity.application.ActivityService;
import com.dallimo.dallimoserver.common.web.ApiResponse;
import com.dallimo.dallimoserver.common.web.CursorPage;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** 7장 GET /api/v1/activities (ACT-001 친구 Activity) */
@RestController
public class ActivityController {

    private final ActivityService activities;

    public ActivityController(ActivityService activities) {
        this.activities = activities;
    }

    @GetMapping("/api/v1/activities")
    public ApiResponse<CursorPage<ActivityService.Item>> feed(@AuthenticationPrincipal Jwt jwt, @RequestParam(required = false) String cursor,
                                                             @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size) {
        return ApiResponse.ok(activities.feed(Long.parseLong(jwt.getSubject()), cursor, size));
    }
}
