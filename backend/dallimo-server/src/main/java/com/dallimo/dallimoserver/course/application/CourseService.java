package com.dallimo.dallimoserver.course.application;

import com.dallimo.dallimoserver.activity.application.ActivityService;
import com.dallimo.dallimoserver.common.error.ApiException;
import com.dallimo.dallimoserver.common.error.ErrorCode;
import com.dallimo.dallimoserver.common.web.CursorPage;
import com.dallimo.dallimoserver.course.domain.Course;
import com.dallimo.dallimoserver.course.domain.CourseRoute;
import com.dallimo.dallimoserver.course.infrastructure.CourseJdbcRepository;
import com.dallimo.dallimoserver.course.infrastructure.CourseJpaRepository;
import com.dallimo.dallimoserver.course.infrastructure.CourseStats;
import com.dallimo.dallimoserver.course.infrastructure.ReviewSummary;
import com.dallimo.dallimoserver.running.domain.Run;
import com.dallimo.dallimoserver.running.domain.RunMetrics;
import com.dallimo.dallimoserver.running.domain.RunStatus;
import com.dallimo.dallimoserver.running.infrastructure.RunJpaRepository;
import com.dallimo.dallimoserver.running.infrastructure.RunPointJdbcRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 43장 Course API. 탐색 · 검색 · 상세 · 경로 · 등록 · 저장, 그리고 내 코스(MY-005).
 * 랭킹(WBS 6) · 평가(WBS 14) · 검증(WBS 5)은 뒤에 붙는다.
 */
@Service
public class CourseService {

    // 주간 러너 수를 세는 기간 ("이번 주"를 최근 7일로 본다)
    static final Duration WEEK = Duration.ofDays(7);
    // 예상 소요 시간: 6'00"/km (공식 기록이 쌓이기 전 기준)
    static final int ESTIMATE_SEC_PER_KM = 360;

    public enum MyCourseKind {CREATED, SAVED, FINISHED}

    /** 화면에 필요한 코스 한 개의 모든 값 */
    public record CourseView(Course course, List<CourseRoute.Point> route, List<String> tags, CourseStats stats,
                             boolean bookmarked, String creatorName, Double startDistanceM, ReviewSummary reviews) {

        public int estimatedSec() {
            return (int) Math.round(course.getDistanceM() / 1000.0 * ESTIMATE_SEC_PER_KM);
        }
    }

    private final CourseJpaRepository courses;
    private final CourseJdbcRepository store;
    private final RunJpaRepository runs;
    private final RunPointJdbcRepository runPoints;
    private final ActivityService activities;
    private final Clock clock;

    public CourseService(CourseJpaRepository courses, CourseJdbcRepository store, RunJpaRepository runs, RunPointJdbcRepository runPoints,
                         ActivityService activities, Clock clock) {
        this.courses = courses;
        this.store = store;
        this.runs = runs;
        this.runPoints = runPoints;
        this.activities = activities;
        this.clock = clock;
    }

    /**
     * CRS-001 · 23.2장: bounding box로 후보를 줄이고 출발점까지 실제 거리로 거른 뒤 가까운 순.
     * 후보는 id · 출발점만 읽고, 거리순으로 자른 한 페이지만 엔티티로 불러온다 (결정 로그 70항)
     */
    @Transactional(readOnly = true)
    public CursorPage<CourseView> nearby(Long viewerId, double lat, double lng, int radiusM, String cursor, int size) {
        double dLat = radiusM / 111_320.0;
        double dLng = radiusM / (111_320.0 * Math.max(0.01, Math.cos(Math.toRadians(lat))));
        List<Object[]> box = courses.findStartsInBox(viewerId, bd(lat - dLat), bd(lat + dLat), bd(lng - dLng), bd(lng + dLng));
        Map<Long, Double> distance = new HashMap<>();
        for (Object[] row : box) {
            double d = CourseRoute.haversineM(lat, lng, ((BigDecimal) row[1]).doubleValue(), ((BigDecimal) row[2]).doubleValue());
            if (d <= radiusM) distance.put((Long) row[0], d);
        }
        List<Long> hits = distance.keySet().stream()
                .sorted(Comparator.comparingDouble((Long id) -> distance.get(id)).thenComparing(id -> id))
                .toList();
        int offset = decodeOffset(cursor);
        List<Long> pageIds = hits.subList(Math.min(offset, hits.size()), Math.min(offset + size, hits.size()));
        Map<Long, Course> loaded = new HashMap<>();
        if (!pageIds.isEmpty()) for (Course c : courses.findVisible(viewerId, pageIds)) loaded.put(c.getId(), c);
        List<Course> page = pageIds.stream().map(loaded::get).filter(Objects::nonNull).toList();
        boolean hasNext = offset + size < hits.size();
        return new CursorPage<>(assemble(page, viewerId, distance), hasNext ? encode("o:" + (offset + size)) : null, hasNext);
    }

    /** CRS-003: 이름 · 지역 · 태그로 찾기. 최근 등록순 */
    @Transactional(readOnly = true)
    public CursorPage<CourseView> search(Long viewerId, String query, String cursor, int size) {
        String q = query.trim().toLowerCase(Locale.ROOT);
        if (q.isEmpty()) throw new ApiException(ErrorCode.VALIDATION_ERROR, "검색어를 입력해 주세요.");
        String pattern = "%" + q.replace("!", "!!").replace("%", "!%").replace("_", "!_") + "%";
        Long beforeId = cursor == null ? null : decodeId(cursor);
        List<Long> tagIds = store.idsWithTagLike(pattern);
        List<Course> found = courses.search(viewerId, pattern, tagIds.isEmpty() ? List.of(-1L) : tagIds, beforeId, PageRequest.of(0, size + 1));
        boolean hasNext = found.size() > size;
        List<Course> page = hasNext ? found.subList(0, size) : found;
        String next = hasNext ? encode("i:" + page.get(page.size() - 1).getId()) : null;
        return new CursorPage<>(assemble(page, viewerId, Map.of()), next, hasNext);
    }

    @Transactional(readOnly = true)
    public CourseView detail(Long viewerId, long courseId) {
        return assemble(List.of(viewable(viewerId, courseId)), viewerId, Map.of()).get(0);
    }

    @Transactional(readOnly = true)
    public List<CourseRoute.Point> route(Long viewerId, long courseId) {
        viewable(viewerId, courseId);
        return store.routes(List.of(courseId)).getOrDefault(courseId, List.of());
    }

    /**
     * CREG-004 · 43.1장: 내 FINISHED Run의 정상 point로 경로를 만든다. 경로는 이때 한 번 만들고 바꾸지 않는다.
     */
    @Transactional
    public CourseView create(long userId, long sourceRunId, String name, String description, String region, String recommendedTime, List<String> tags) {
        Run run = runs.findById(sourceRunId).orElseThrow(() -> new ApiException(ErrorCode.RUN_NOT_FOUND));
        if (run.getUserId() != userId) throw new ApiException(ErrorCode.RESOURCE_FORBIDDEN);
        if (run.getStatus() != RunStatus.FINISHED) throw new ApiException(ErrorCode.RUN_INVALID_STATE, "끝난 러닝만 코스로 만들 수 있어요.");

        List<CourseRoute.Point> accepted = RunMetrics.compute(runPoints.findAll(sourceRunId)).accepted().stream()
                .map(p -> new CourseRoute.Point(p.latitude(), p.longitude(), p.altitudeM()))
                .toList();
        CourseRoute.Normalized route = CourseRoute.normalize(accepted);
        if (route == null) throw new ApiException(ErrorCode.RUN_POINT_INVALID, "경로 기록이 부족해서 코스로 만들 수 없어요.");

        Course course = courses.save(Course.create(userId, name, description, region, recommendedTime, route, clock.instant()));
        store.insertRoute(course.getId(), route.points());
        store.insertTags(course.getId(), tags);
        activities.onCourseCreated(userId, course.getId(), clock.instant());
        return assemble(List.of(course), userId, Map.of()).get(0);
    }

    /**
     * 내가 만든 코스의 이름 · 설명 · 태그 · 추천 시간 고치기 (FOUNDATION-DECISION-LOG 90항). 경로는 바꾸지 않는다 (43.1장).
     * 운영 정책으로 숨겨진 코스는 고칠 수 없다
     */
    @Transactional
    public CourseView edit(long userId, long courseId, String name, String description, String recommendedTime, List<String> tags) {
        Course c = owned(userId, courseId);
        if (!c.getStatus().viewable()) throw new ApiException(ErrorCode.RESOURCE_FORBIDDEN, "숨겨진 코스는 고칠 수 없어요.");
        c.edit(name, description, recommendedTime, clock.instant());
        store.replaceTags(courseId, tags);
        return assemble(List.of(c), userId, Map.of()).get(0);
    }

    /**
     * 내가 만든 코스 지우기 (FOUNDATION-DECISION-LOG 90항). 22.3장: deleted_at으로 감춘다.
     * 탐색 · 검색 · 랭킹 · 상세에서 빠지고, 이 코스를 달린 사람들의 Run은 기록에 그대로 남는다. 끝나지 않은 도전은 취소한다.
     * 같은 요청을 다시 보내도 결과가 같다
     */
    @Transactional
    public void delete(long userId, long courseId) {
        Course c = courses.findById(courseId).orElseThrow(() -> new ApiException(ErrorCode.COURSE_NOT_FOUND));
        if (!c.getCreatorId().equals(userId)) throw new ApiException(ErrorCode.RESOURCE_FORBIDDEN, "내가 만든 코스만 지울 수 있어요.");
        if (c.deleted()) return;
        Instant now = clock.instant();
        c.delete(now);
        store.cancelOpenChallenges(courseId, now);
    }

    private Course owned(long userId, long courseId) {
        Course c = courses.findById(courseId).filter(x -> !x.deleted()).orElseThrow(() -> new ApiException(ErrorCode.COURSE_NOT_FOUND));
        if (!c.getCreatorId().equals(userId)) throw new ApiException(ErrorCode.RESOURCE_FORBIDDEN, "내가 만든 코스만 고칠 수 있어요.");
        return c;
    }

    /** CRS-105. 같은 요청을 다시 보내도 결과가 같다 */
    @Transactional
    public void bookmark(long userId, long courseId, boolean saved) {
        if (saved) {
            viewable(userId, courseId);
            store.bookmark(userId, courseId, clock.instant());
        } else {
            store.unbookmark(userId, courseId);
        }
    }

    /** MY-005 내 코스: 등록 · 저장 · 완주 */
    @Transactional(readOnly = true)
    public List<CourseView> mine(long userId, MyCourseKind kind) {
        List<Course> list = switch (kind) {
            case CREATED -> courses.findCreatedBy(userId);
            case SAVED -> inOrder(store.bookmarkedIds(userId), userId);
            case FINISHED -> inOrder(store.finishedIds(userId), userId);
        };
        return assemble(list, userId, Map.of());
    }

    private List<Course> inOrder(List<Long> ids, long viewerId) {
        if (ids.isEmpty()) return List.of();
        Map<Long, Course> byId = courses.findVisible(viewerId, ids).stream().collect(Collectors.toMap(Course::getId, Function.identity()));
        return ids.stream().map(byId::get).filter(c -> c != null).toList();
    }

    /** 없으면 COURSE_NOT_FOUND, 볼 수 없으면 RESOURCE_FORBIDDEN (랭킹 등 코스에 딸린 조회에서도 쓴다) */
    @Transactional(readOnly = true)
    public Course requireViewable(Long viewerId, long courseId) {
        return viewable(viewerId, courseId);
    }

    private Course viewable(Long viewerId, long courseId) {
        Course c = courses.findById(courseId).filter(x -> !x.deleted()).orElseThrow(() -> new ApiException(ErrorCode.COURSE_NOT_FOUND));
        if (!c.visibleTo(viewerId)) throw new ApiException(ErrorCode.RESOURCE_FORBIDDEN, "볼 수 없는 코스예요.");
        return c;
    }

    private List<CourseView> assemble(List<Course> list, Long viewerId, Map<Long, Double> distance) {
        if (list.isEmpty()) return List.of();
        List<Long> ids = list.stream().map(Course::getId).toList();
        Map<Long, List<CourseRoute.Point>> routes = store.routes(ids);
        Map<Long, List<String>> tags = store.tags(ids);
        Map<Long, CourseStats> stats = store.stats(ids, viewerId, clock.instant().minus(WEEK));
        List<Long> saved = viewerId == null ? List.of() : store.bookmarkedIds(viewerId, ids);
        Map<Long, String> names = store.nicknames(list.stream().map(Course::getCreatorId).distinct().toList());
        Map<Long, ReviewSummary> reviews = store.reviewSummaries(ids);
        List<CourseView> out = new ArrayList<>(list.size());
        for (Course c : list) {
            out.add(new CourseView(c, routes.getOrDefault(c.getId(), List.of()), tags.getOrDefault(c.getId(), List.of()),
                    stats.getOrDefault(c.getId(), CourseStats.EMPTY), saved.contains(c.getId()), names.getOrDefault(c.getCreatorId(), ""),
                    distance.get(c.getId()), reviews.getOrDefault(c.getId(), ReviewSummary.EMPTY)));
        }
        return out;
    }

    private static BigDecimal bd(double v) {
        return BigDecimal.valueOf(v);
    }

    // cursor는 앱이 해석하지 않는 값 (27.3장 opaque). 주변 목록은 거리순 위치, 검색은 마지막 id
    private static String encode(String raw) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(raw.getBytes(StandardCharsets.UTF_8));
    }

    private static String decode(String cursor, String prefix) {
        try {
            String raw = new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8);
            if (!raw.startsWith(prefix)) throw new IllegalArgumentException();
            return raw.substring(prefix.length());
        } catch (IllegalArgumentException e) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "cursor 값이 올바르지 않아요.");
        }
    }

    private static int decodeOffset(String cursor) {
        if (cursor == null) return 0;
        try {
            int n = Integer.parseInt(decode(cursor, "o:"));
            if (n < 0) throw new NumberFormatException();
            return n;
        } catch (NumberFormatException e) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "cursor 값이 올바르지 않아요.");
        }
    }

    private static long decodeId(String cursor) {
        try {
            return Long.parseLong(decode(cursor, "i:"));
        } catch (NumberFormatException e) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "cursor 값이 올바르지 않아요.");
        }
    }
}
