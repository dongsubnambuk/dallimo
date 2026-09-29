package com.dallimo.dallimoserver.course.api;

import com.dallimo.dallimoserver.course.application.CourseService.CourseView;
import com.dallimo.dallimoserver.course.domain.CourseRoute;
import com.dallimo.dallimoserver.course.domain.CourseStatus;
import com.dallimo.dallimoserver.ranking.api.RankingDtos.RankingEntryResponse;
import com.dallimo.dallimoserver.ranking.application.RankingService;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;

/** 43장 Course API 요청 · 응답. 좌표는 [위도, 경도] 배열 */
public final class CourseDtos {

    private CourseDtos() {
    }

    /** 43장 POST /courses. 추천 시간(SCR-E05)은 명세 요청 필드에 없어 받지 않는다 */
    public record CreateCourseRequest(
            @NotNull Long sourceRunId,
            @NotBlank @Size(max = 100) String name,
            @Size(max = 1000) String description,
            @Size(max = 6) List<@NotBlank @Size(max = 20) String> tags) {

        public CreateCourseRequest {
            name = name == null ? null : name.trim();
            description = description == null || description.isBlank() ? null : description.trim();
            tags = tags == null ? List.of() : tags.stream().map(t -> t == null ? null : t.trim()).distinct().toList();
        }
    }

    /** 목록 한 줄 (CourseSummary). displayRoute는 100점 이하로 줄인 경로 */
    public record CourseSummaryResponse(long id, String name, CourseStatus status, int distanceM, List<String> tags,
                                        Integer startDistanceM, List<double[]> displayRoute, int estimatedSec,
                                        Integer myBestSec, int myFinishCount, Integer leaderSec, int finisherCount,
                                        int weeklyRunnerCount, boolean bookmarked, Instant createdAt) {
        static CourseSummaryResponse from(CourseView v) {
            return new CourseSummaryResponse(v.course().getId(), v.course().getName(), v.course().getStatus(), v.course().getDistanceM(),
                    v.tags(), v.startDistanceM() == null ? null : (int) Math.round(v.startDistanceM()),
                    CourseRoute.decimate(v.route(), CourseRoute.SUMMARY_MAX_POINTS), v.estimatedSec(),
                    v.stats().myBestSec(), v.stats().myFinishCount(), v.stats().leaderSec(), v.stats().finisherCount(),
                    v.stats().weeklyRunnerCount(), v.bookmarked(), v.course().getCreatedAt());
        }
    }

    /** CRS-103 내 기록. 공식 기록(tbl_course_record)이 없으면 null */
    public record MyRecord(int bestSec, int lastSec, int finishCount) {
    }

    /** CRS-104 경쟁 정보: 코스 1위(전체 기간), 이번 주 1~3위, 내 이번 주 순위. 친구 기록은 친구 기능(WBS 8) 뒤 */
    public record Competition(Integer leaderSec, Integer myWeeklyRank, List<RankingEntryResponse> weeklyTop, RankingEntryResponse myEntry) {
    }

    /** 상세 (CourseDetail). route는 1000점 이하, elevationProfile은 [거리(m), 고도(m)] (고도가 없으면 null) */
    public record CourseDetailResponse(long id, String name, CourseStatus status, String description, String creatorName,
                                       int distanceM, int estimatedSec, String difficulty, Double elevationGainM, List<String> tags,
                                       List<double[]> route, List<double[]> elevationProfile, int finisherCount, int weeklyRunnerCount,
                                       MyRecord myRecord, Competition competition, boolean bookmarked, Instant createdAt) {
        static CourseDetailResponse from(CourseView v, RankingService.WeeklyPreview weekly) {
            var s = v.stats();
            MyRecord my = s.myBestSec() == null ? null : new MyRecord(s.myBestSec(), s.myLastSec(), s.myFinishCount());
            Double gain = v.course().getElevationGainM() == null ? null : (double) Math.round(v.course().getElevationGainM());
            return new CourseDetailResponse(v.course().getId(), v.course().getName(), v.course().getStatus(), v.course().getDescription(),
                    v.creatorName(), v.course().getDistanceM(), v.estimatedSec(), v.course().getDifficulty(), gain, v.tags(),
                    CourseRoute.decimate(v.route(), CourseRoute.DETAIL_MAX_POINTS), CourseRoute.profile(v.route()),
                    s.finisherCount(), s.weeklyRunnerCount(), my, new Competition(s.leaderSec(), weekly.me() == null ? null : weekly.me().rank(), RankingEntryResponse.from(weekly.top()),
                    RankingEntryResponse.from(weekly.me())), v.bookmarked(), v.course().getCreatedAt());
        }
    }

    /** GET /courses/{id}/route: 정규화한 경로 전체 */
    public record RoutePointResponse(int seq, double latitude, double longitude, Double altitudeM) {
    }
}
