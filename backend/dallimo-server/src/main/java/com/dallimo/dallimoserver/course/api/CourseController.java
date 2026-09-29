package com.dallimo.dallimoserver.course.api;

import com.dallimo.dallimoserver.common.web.ApiResponse;
import com.dallimo.dallimoserver.common.web.CursorPage;
import com.dallimo.dallimoserver.course.api.CourseDtos.CourseDetailResponse;
import com.dallimo.dallimoserver.course.api.CourseDtos.CourseSummaryResponse;
import com.dallimo.dallimoserver.course.api.CourseDtos.CreateCourseRequest;
import com.dallimo.dallimoserver.course.api.CourseDtos.RoutePointResponse;
import com.dallimo.dallimoserver.course.application.CourseService;
import com.dallimo.dallimoserver.course.application.CourseService.CourseView;
import com.dallimo.dallimoserver.course.domain.CourseRoute;
import com.dallimo.dallimoserver.ranking.application.RankingService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;

/** 43장 Course API. 조회는 로그인 없이도 된다 (User/Optional) */
@RestController
@RequestMapping("/api/v1/courses")
public class CourseController {

    private final CourseService courses;
    private final RankingService ranking;

    public CourseController(CourseService courses, RankingService ranking) {
        this.courses = courses;
        this.ranking = ranking;
    }

    /** CRS-001 주변 코스. radius는 출발점까지 거리(m) */
    @GetMapping("/nearby")
    public ApiResponse<CursorPage<CourseSummaryResponse>> nearby(@AuthenticationPrincipal Jwt jwt,
                                                                 @RequestParam @DecimalMin("-90") @DecimalMax("90") double lat,
                                                                 @RequestParam @DecimalMin("-180") @DecimalMax("180") double lng,
                                                                 @RequestParam(defaultValue = "5000") @Min(100) @Max(20000) int radius,
                                                                 @RequestParam(required = false) String cursor,
                                                                 @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size) {
        return ApiResponse.ok(summaries(courses.nearby(viewer(jwt), lat, lng, radius, cursor, size)));
    }

    /** CRS-003 이름 검색 */
    @GetMapping("/search")
    public ApiResponse<CursorPage<CourseSummaryResponse>> search(@AuthenticationPrincipal Jwt jwt,
                                                                 @RequestParam @Size(min = 1, max = 50) String query,
                                                                 @RequestParam(required = false) String cursor,
                                                                 @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size) {
        return ApiResponse.ok(summaries(courses.search(viewer(jwt), query, cursor, size)));
    }

    @GetMapping("/{courseId}")
    public ApiResponse<CourseDetailResponse> detail(@AuthenticationPrincipal Jwt jwt, @PathVariable long courseId) {
        CourseView v = courses.detail(viewer(jwt), courseId);
        return ApiResponse.ok(CourseDetailResponse.from(v, ranking.weekly(viewer(jwt), v.course())));
    }

    @GetMapping("/{courseId}/route")
    public ApiResponse<List<RoutePointResponse>> route(@AuthenticationPrincipal Jwt jwt, @PathVariable long courseId) {
        List<CourseRoute.Point> points = courses.route(viewer(jwt), courseId);
        List<RoutePointResponse> out = new ArrayList<>(points.size());
        for (int i = 0; i < points.size(); i++) {
            CourseRoute.Point p = points.get(i);
            out.add(new RoutePointResponse(i + 1, p.latitude(), p.longitude(), p.altitudeM()));
        }
        return ApiResponse.ok(out);
    }

    /** CREG-004: 201 + 상세 */
    @PostMapping
    public ResponseEntity<ApiResponse<CourseDetailResponse>> create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody CreateCourseRequest req) {
        CourseView v = courses.create(userId(jwt), req.sourceRunId(), req.name(), req.description(), req.tags());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(CourseDetailResponse.from(v, ranking.weekly(userId(jwt), v.course()))));
    }

    @PostMapping("/{courseId}/bookmarks")
    public ResponseEntity<Void> bookmark(@AuthenticationPrincipal Jwt jwt, @PathVariable long courseId) {
        courses.bookmark(userId(jwt), courseId, true);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{courseId}/bookmarks")
    public ResponseEntity<Void> unbookmark(@AuthenticationPrincipal Jwt jwt, @PathVariable long courseId) {
        courses.bookmark(userId(jwt), courseId, false);
        return ResponseEntity.noContent().build();
    }

    static CursorPage<CourseSummaryResponse> summaries(CursorPage<CourseView> page) {
        return new CursorPage<>(page.items().stream().map(CourseSummaryResponse::from).toList(), page.nextCursor(), page.hasNext());
    }

    static Long viewer(Jwt jwt) {
        return jwt == null ? null : Long.parseLong(jwt.getSubject());
    }

    static long userId(Jwt jwt) {
        return Long.parseLong(jwt.getSubject());
    }
}
