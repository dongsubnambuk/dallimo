package com.dallimo.dallimoserver.activity.application;

import com.dallimo.dallimoserver.activity.domain.ActivityType;
import com.dallimo.dallimoserver.activity.infrastructure.ActivityJdbcRepository;
import com.dallimo.dallimoserver.activity.infrastructure.ActivityJdbcRepository.Row;
import com.dallimo.dallimoserver.common.error.ApiException;
import com.dallimo.dallimoserver.common.error.ErrorCode;
import com.dallimo.dallimoserver.common.web.CursorPage;
import com.dallimo.dallimoserver.friend.application.FriendService;
import com.dallimo.dallimoserver.gamification.application.CourseTitleService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;

/**
 * ACT-001~002 행동형 친구 활동 (12장 ActivityService "행동 이벤트 생성").
 * 코스 검증 · 코스 등록 · 도전 판정이 같은 트랜잭션 안에서 기록을 남기고, 친구와 나의 활동을 최근 먼저 보여준다.
 * 활동은 독립 탭이 아니라 마이 · 친구에서 들어간다 (65장).
 */
@Service
public class ActivityService {

    // 이번 주 이 순위 안에 들면 랭킹 활동 (명세에 값이 없어 정한 시작값)
    public static final int WEEKLY_TOP_RANK = 3;

    private final ActivityJdbcRepository store;
    private final FriendService friends;

    public ActivityService(ActivityJdbcRepository store, FriendService friends) {
        this.store = store;
        this.friends = friends;
    }

    // ── 만들기 (호출한 쪽 트랜잭션 안에서) ──

    /** 코스 공식 기록이 생겼을 때: 첫 기록 · PB 갱신이면 PB, 이번 주 3위 안으로 올라섰으면 WEEKLY_TOP */
    @Transactional(propagation = Propagation.MANDATORY)
    public void onRecord(long courseId, long recordId, long userId, int seconds, Integer weeklyRankBefore, Integer weeklyRankAfter, Instant now) {
        Integer previous = store.previousBest(courseId, userId, recordId);
        if (previous == null || seconds < previous) store.insert(userId, ActivityType.PB, "COURSE_RECORD", recordId, previous, now);
        boolean climbed = weeklyRankAfter != null && weeklyRankAfter <= WEEKLY_TOP_RANK && (weeklyRankBefore == null || weeklyRankAfter < weeklyRankBefore);
        if (climbed) store.insert(userId, ActivityType.WEEKLY_TOP, "COURSE_RECORD", recordId, weeklyRankAfter, now);
    }

    /** 124장: 코스 크라운 · 로컬 레전드를 새로 가졌을 때. LEGEND의 value는 그때 완주 수 */
    @Transactional(propagation = Propagation.MANDATORY)
    public void onTitles(long recordId, long userId, CourseTitleService.TitleChange change, Instant now) {
        if (change.crownTaken()) store.insert(userId, ActivityType.CROWN, "COURSE_RECORD", recordId, null, now);
        if (change.legendTaken()) store.insert(userId, ActivityType.LEGEND, "COURSE_RECORD", recordId, change.legendFinishes(), now);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void onCourseCreated(long userId, long courseId, Instant now) {
        store.insert(userId, ActivityType.COURSE_CREATED, "COURSE", courseId, null, now);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void onChallengeWon(long userId, long challengeId, Instant now) {
        store.insert(userId, ActivityType.CHALLENGE_WON, "CHALLENGE", challengeId, null, now);
    }

    // ── 보기 ──

    public record Item(long id, ActivityType type, long userId, String nickname, boolean isMine, Instant createdAt, Long courseId, String courseName,
                       Integer courseDistanceM, Integer timeSec, Integer previousSec, Integer rank, String targetNickname, Integer targetSec,
                       boolean targetIsMe, Integer finishCount) {
    }

    /** 친구와 나의 활동. 볼 수 없는 코스(숨김 · 비공개)에 딸린 활동은 뺀다 */
    @Transactional(readOnly = true)
    public CursorPage<Item> feed(long viewerId, String cursor, int size) {
        List<Long> who = new ArrayList<>(friends.friendIds(viewerId));
        who.add(viewerId);
        Long before = cursor == null ? null : decode(cursor);
        List<Item> out = new ArrayList<>();
        Long lastRead = null;
        boolean hasNext = false;
        // 숨긴 코스 활동을 빼도 한 쪽을 채우도록 몇 번 더 읽는다
        for (int round = 0; round < 5 && out.size() < size; round++) {
            List<Row> rows = store.feed(who, before, size + 1);
            boolean more = rows.size() > size;
            List<Row> page = more ? rows.subList(0, size) : rows;
            List<Row> read = resolveInto(page, viewerId, out, size);
            if (!read.isEmpty()) lastRead = before = read.get(read.size() - 1).id();
            // 쪽이 찼는데 이번에 읽은 줄 뒤에 더 있으면 다음 쪽이 있다
            hasNext = read.size() < page.size() || more;
            if (!more) break;
        }
        hasNext = hasNext && lastRead != null;
        return new CursorPage<>(out, hasNext ? encode(lastRead) : null, hasNext);
    }

    /** 활동 줄을 대상 값과 이어 out에 더한다. 읽은(건너뛴 것 포함) 줄을 돌려준다 */
    private List<Row> resolveInto(List<Row> rows, long viewerId, List<Item> out, int size) {
        List<Long> recordIds = rows.stream().filter(r -> r.referenceType().equals("COURSE_RECORD")).map(Row::referenceId).toList();
        List<Long> challengeIds = rows.stream().filter(r -> r.referenceType().equals("CHALLENGE")).map(Row::referenceId).toList();
        var records = store.records(recordIds);
        var challenges = store.challenges(challengeIds);
        List<Long> courseIds = new ArrayList<>();
        rows.stream().filter(r -> r.referenceType().equals("COURSE")).forEach(r -> courseIds.add(r.referenceId()));
        records.values().forEach(r -> courseIds.add(r.courseId()));
        challenges.values().forEach(c -> courseIds.add(c.courseId()));
        var courses = store.courses(courseIds.stream().distinct().toList(), viewerId);
        List<Row> read = new ArrayList<>();
        for (Row r : rows) {
            if (out.size() >= size) break;
            read.add(r);
            Long courseId = switch (r.referenceType()) {
                case "COURSE_RECORD" -> records.containsKey(r.referenceId()) ? records.get(r.referenceId()).courseId() : null;
                case "CHALLENGE" -> challenges.containsKey(r.referenceId()) ? challenges.get(r.referenceId()).courseId() : null;
                default -> r.referenceId();
            };
            var course = courseId == null ? null : courses.get(courseId);
            if (course == null || !course.viewable()) continue;
            // 대상 id는 종류마다 다른 테이블 id라 종류를 보고 찾는다 (코스 id와 기록 id가 같을 수 있다)
            var record = r.referenceType().equals("COURSE_RECORD") ? records.get(r.referenceId()) : null;
            var challenge = r.referenceType().equals("CHALLENGE") ? challenges.get(r.referenceId()) : null;
            out.add(new Item(r.id(), r.type(), r.userId(), r.nickname(), r.userId() == viewerId, r.createdAt(), course.id(), course.name(), course.distanceM(),
                    record != null ? Integer.valueOf(record.seconds()) : challenge != null ? challenge.resultSec() : null,
                    r.type() == ActivityType.PB ? r.value() : null,
                    r.type() == ActivityType.WEEKLY_TOP ? r.value() : null,
                    challenge == null ? null : challenge.targetNickname(), challenge == null ? null : challenge.targetSec(),
                    challenge != null && challenge.targetUserId() == viewerId,
                    r.type() == ActivityType.LEGEND ? r.value() : null));
        }
        return read;
    }

    private static String encode(long id) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(("a:" + id).getBytes(StandardCharsets.UTF_8));
    }

    private static long decode(String cursor) {
        try {
            String raw = new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8);
            if (!raw.startsWith("a:")) throw new IllegalArgumentException();
            return Long.parseLong(raw.substring(2));
        } catch (IllegalArgumentException e) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "cursor 값이 올바르지 않아요.");
        }
    }
}
