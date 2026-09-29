package com.dallimo.dallimoserver.ranking.api;

import com.dallimo.dallimoserver.common.web.ApiResponse;
import com.dallimo.dallimoserver.common.web.CursorPage;
import com.dallimo.dallimoserver.ranking.api.RankingDtos.RankingEntryResponse;
import com.dallimo.dallimoserver.ranking.api.RankingDtos.StandingResponse;
import com.dallimo.dallimoserver.ranking.application.RankingService;
import com.dallimo.dallimoserver.ranking.domain.RankingPeriod;
import com.dallimo.dallimoserver.ranking.domain.RankingScope;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** 43장 GET /courses/{id}/rankings (RNK-001~004)와 내 주변 순위 (RNK-005). 로그인 없이도 본다 */
@RestController
@RequestMapping("/api/v1/courses/{courseId}/rankings")
public class RankingController {

    private final RankingService ranking;

    public RankingController(RankingService ranking) {
        this.ranking = ranking;
    }

    @GetMapping
    public ApiResponse<CursorPage<RankingEntryResponse>> page(@AuthenticationPrincipal Jwt jwt, @PathVariable long courseId,
                                                              @RequestParam(defaultValue = "ALL") RankingScope scope,
                                                              @RequestParam(defaultValue = "ALL") RankingPeriod period,
                                                              @RequestParam(required = false) String cursor,
                                                              @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size) {
        CursorPage<RankingService.Entry> page = ranking.page(viewer(jwt), courseId, scope, period, cursor, size);
        return ApiResponse.ok(new CursorPage<>(RankingEntryResponse.from(page.items()), page.nextCursor(), page.hasNext()));
    }

    /** RNK-005: 41~43장 표에 경로가 없어 정했다 (backend/README 결정 사항) */
    @GetMapping("/me")
    public ApiResponse<StandingResponse> me(@AuthenticationPrincipal Jwt jwt, @PathVariable long courseId,
                                            @RequestParam(defaultValue = "ALL") RankingScope scope,
                                            @RequestParam(defaultValue = "ALL") RankingPeriod period) {
        RankingService.Standing s = ranking.standing(viewer(jwt), courseId, scope, period);
        return ApiResponse.ok(new StandingResponse(s.total(), RankingEntryResponse.from(s.entry()), RankingEntryResponse.from(s.around())));
    }

    private static Long viewer(Jwt jwt) {
        return jwt == null ? null : Long.parseLong(jwt.getSubject());
    }
}
