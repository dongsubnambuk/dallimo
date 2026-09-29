package com.dallimo.dallimoserver.course.api;

import com.dallimo.dallimoserver.course.application.CourseReviewService;
import com.dallimo.dallimoserver.course.application.CourseService.CourseView;
import com.dallimo.dallimoserver.course.domain.CourseReportReason;
import com.dallimo.dallimoserver.course.domain.CourseRoute;
import com.dallimo.dallimoserver.course.domain.CourseStatus;
import com.dallimo.dallimoserver.course.infrastructure.CourseReviewJdbcRepository;
import com.dallimo.dallimoserver.course.infrastructure.ReviewSummary;
import com.dallimo.dallimoserver.ranking.api.RankingDtos.RankingEntryResponse;
import com.dallimo.dallimoserver.ranking.application.RankingService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;

/** 43장 Course API 요청 · 응답. 좌표는 [위도, 경도] 배열 */
public final class CourseDtos {

    private CourseDtos() {
    }

    /**
     * 43장 POST /courses. region · recommendedTime은 명세 요청 필드에 없어 더했다 (CREG-002 추천 시간, 앱이 출발점으로 알아낸 지역).
     */
    public record CreateCourseRequest(
            @NotNull Long sourceRunId,
            @NotBlank @Size(max = 100) String name,
            @Size(max = 1000) String description,
            @Size(max = 6) List<@NotBlank @Size(max = 20) String> tags,
            @Size(max = 50) String region,
            @Size(max = 30) String recommendedTime) {

        public CreateCourseRequest {
            name = name == null ? null : name.trim();
            description = description == null || description.isBlank() ? null : description.trim();
            region = region == null || region.isBlank() ? null : region.trim();
            recommendedTime = recommendedTime == null || recommendedTime.isBlank() ? null : recommendedTime.trim();
            tags = tags == null ? List.of() : tags.stream().map(t -> t == null ? null : t.trim()).distinct().toList();
        }
    }

    /** 목록 한 줄 (CourseSummary). displayRoute는 100점 이하로 줄인 경로 */
    /** ratingAvg: 평가 평균(소수 한 자리, 평가가 없으면 null) · reviewCount (CRS-004 평점 필터 · 정렬) */
    public record CourseSummaryResponse(long id, String name, CourseStatus status, int distanceM, List<String> tags,
                                        Integer startDistanceM, List<double[]> displayRoute, int estimatedSec,
                                        Integer myBestSec, int myFinishCount, Integer leaderSec, int finisherCount,
                                        int weeklyRunnerCount, boolean bookmarked, Instant createdAt, String region, Double ratingAvg,
                                        int reviewCount) {
        static CourseSummaryResponse from(CourseView v) {
            return new CourseSummaryResponse(v.course().getId(), v.course().getName(), v.course().getStatus(), v.course().getDistanceM(),
                    v.tags(), v.startDistanceM() == null ? null : (int) Math.round(v.startDistanceM()),
                    CourseRoute.decimate(v.route(), CourseRoute.SUMMARY_MAX_POINTS), v.estimatedSec(),
                    v.stats().myBestSec(), v.stats().myFinishCount(), v.stats().leaderSec(), v.stats().finisherCount(),
                    v.stats().weeklyRunnerCount(), v.bookmarked(), v.course().getCreatedAt(), v.course().getRegion(), oneDecimal(v.reviews().ratingAvg()),
                    v.reviews().reviewCount());
        }
    }

    /**
     * CRS-102 러닝 환경 (완주자 평가를 모은 값). signals · nightLight · crowd: LOW · MEDIUM · HIGH,
     * surface: ROUGH · NORMAL · SMOOTH, toilet · water: 있음 여부. 평가가 없으면 null
     */
    public record Environment(String signals, String nightLight, String crowd, String surface, Boolean toilet, Boolean water) {
        static Environment from(ReviewSummary r) {
            return new Environment(level(r.signal()), level(r.night()), level(r.crowd()), surfaceLevel(r.surface()), r.toilet(), r.water());
        }
    }

    /** REV-001 평가 요약 · 내 평가 */
    public record Rating(Double avg, int count, boolean canReview, ReviewResponse mine) {
    }

    public record ReviewResponse(long id, String nickname, boolean isMine, int rating, Integer surfaceScore, Integer signalScore, Integer nightScore,
                                 Integer crowdScore, Boolean hasToilet, Boolean hasWater, String content, Instant createdAt) {
        public static ReviewResponse from(CourseReviewJdbcRepository.Row r, Long viewerId) {
            return new ReviewResponse(r.id(), r.nickname(), viewerId != null && r.userId() == viewerId, r.rating(), r.surface(), r.signal(), r.night(),
                    r.crowd(), r.toilet(), r.water(), r.content(), r.createdAt());
        }
    }

    /** 43장 POST /courses/{id}/reviews: runId · 점수 · 내용. runId가 없으면 가장 최근 인증 완주 기록 */
    public record ReviewRequest(Long runId, @NotNull @Min(1) @Max(5) Integer rating, @Min(1) @Max(3) Integer surfaceScore,
                                @Min(1) @Max(3) Integer signalScore, @Min(1) @Max(3) Integer nightScore, @Min(1) @Max(3) Integer crowdScore,
                                Boolean hasToilet, Boolean hasWater, @Size(max = 1000) String content) {

        public ReviewRequest {
            content = content == null || content.isBlank() ? null : content.trim();
        }

        public CourseReviewJdbcRepository.Scores scores() {
            return new CourseReviewJdbcRepository.Scores(rating, surfaceScore, signalScore, nightScore, crowdScore, hasToilet, hasWater, content);
        }
    }

    /** CREG-005 POST /courses/{id}/reports */
    public record ReportRequest(@NotNull CourseReportReason reason, @Size(max = 1000) String content) {

        public ReportRequest {
            content = content == null || content.isBlank() ? null : content.trim();
        }
    }

    static Double oneDecimal(Double v) {
        return v == null ? null : Math.round(v * 10) / 10.0;
    }

    // 1~3 평균을 세 단계로
    static String level(Double v) {
        if (v == null) return null;
        return v < 1.67 ? "LOW" : v < 2.34 ? "MEDIUM" : "HIGH";
    }

    static String surfaceLevel(Double v) {
        if (v == null) return null;
        return v < 1.67 ? "ROUGH" : v < 2.34 ? "NORMAL" : "SMOOTH";
    }

    /** CRS-103 내 기록. 공식 기록(tbl_course_record)이 없으면 null */
    public record MyRecord(int bestSec, int lastSec, int finishCount) {
    }

    /** CRS-104 경쟁 정보: 코스 1위(전체 기간), 이번 주 1~3위, 내 이번 주 순위. 친구 기록은 친구 기능(WBS 8) 뒤 */
    /** friendBest: 친구 최고 기록(전체 기간, 친구가 없거나 기록이 없으면 null) */
    public record Competition(Integer leaderSec, Integer myWeeklyRank, List<RankingEntryResponse> weeklyTop, RankingEntryResponse myEntry,
                              RankingService.FriendBest friendBest) {
    }

    /** 상세 (CourseDetail). route는 1000점 이하, elevationProfile은 [거리(m), 고도(m)] (고도가 없으면 null) */
    public record CourseDetailResponse(long id, String name, CourseStatus status, String description, String creatorName,
                                       int distanceM, int estimatedSec, String difficulty, Double elevationGainM, List<String> tags,
                                       List<double[]> route, List<double[]> elevationProfile, int finisherCount, int weeklyRunnerCount,
                                       MyRecord myRecord, Competition competition, boolean bookmarked, Instant createdAt, String region,
                                       String recommendedTime, Environment environment, Rating rating) {
        static CourseDetailResponse from(CourseView v, RankingService.WeeklyPreview weekly, CourseReviewService.Mine mine, Long viewerId) {
            var s = v.stats();
            MyRecord my = s.myBestSec() == null ? null : new MyRecord(s.myBestSec(), s.myLastSec(), s.myFinishCount());
            Double gain = v.course().getElevationGainM() == null ? null : (double) Math.round(v.course().getElevationGainM());
            return new CourseDetailResponse(v.course().getId(), v.course().getName(), v.course().getStatus(), v.course().getDescription(),
                    v.creatorName(), v.course().getDistanceM(), v.estimatedSec(), v.course().getDifficulty(), gain, v.tags(),
                    CourseRoute.decimate(v.route(), CourseRoute.DETAIL_MAX_POINTS), CourseRoute.profile(v.route()),
                    s.finisherCount(), s.weeklyRunnerCount(), my, new Competition(s.leaderSec(), weekly.me() == null ? null : weekly.me().rank(), RankingEntryResponse.from(weekly.top()),
                    RankingEntryResponse.from(weekly.me()), weekly.friendBest()), v.bookmarked(), v.course().getCreatedAt(), v.course().getRegion(),
                    v.course().getRecommendedTime(), Environment.from(v.reviews()),
                    new Rating(oneDecimal(v.reviews().ratingAvg()), v.reviews().reviewCount(), mine.canReview(),
                            mine.review() == null ? null : ReviewResponse.from(mine.review(), viewerId)));
        }
    }

    /** GET /courses/{id}/route: 정규화한 경로 전체 */
    public record RoutePointResponse(int seq, double latitude, double longitude, Double altitudeM) {
    }
}
