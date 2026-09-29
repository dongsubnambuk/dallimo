package com.dallimo.dallimoserver.share.application;

import com.dallimo.dallimoserver.challenge.application.ChallengeService;
import com.dallimo.dallimoserver.challenge.domain.ChallengeStatus;
import com.dallimo.dallimoserver.common.error.ApiException;
import com.dallimo.dallimoserver.common.error.ErrorCode;
import com.dallimo.dallimoserver.course.application.CourseService;
import com.dallimo.dallimoserver.course.domain.Course;
import com.dallimo.dallimoserver.live.application.LiveRoomService;
import com.dallimo.dallimoserver.running.domain.Run;
import com.dallimo.dallimoserver.running.domain.RunMode;
import com.dallimo.dallimoserver.running.domain.RunStatus;
import com.dallimo.dallimoserver.running.infrastructure.RunJpaRepository;
import com.dallimo.dallimoserver.share.domain.ShareType;
import com.dallimo.dallimoserver.share.infrastructure.ShareJdbcRepository;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;

/**
 * 14.3장 공유 링크 (SHR-001~004). URL은 내부 id 대신 추측하기 어려운 share_code를 쓴다 (16장).
 * 받은 사람에게 보여줄 요약(preview)은 공유한 사람이 고른 대상의 숫자만 담는다. 자유 달리기 경로(GPS)는 내보내지 않는다 (사용자 결정).
 */
@Service
public class ShareService {

    // 31글자(헷갈리는 0 · o · 1 · l · i 제외) × 10자리 ≈ 2^50
    static final String ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
    static final int CODE_LENGTH = 10;

    private final ShareJdbcRepository store;
    private final RunJpaRepository runs;
    private final CourseService courses;
    private final LiveRoomService rooms;
    private final ChallengeService challenges;
    private final JdbcTemplate jdbc;
    private final Clock clock;
    private final SecureRandom random = new SecureRandom();

    public ShareService(ShareJdbcRepository store, RunJpaRepository runs, CourseService courses, LiveRoomService rooms, ChallengeService challenges,
                        JdbcTemplate jdbc, Clock clock) {
        this.store = store;
        this.runs = runs;
        this.courses = courses;
        this.rooms = rooms;
        this.challenges = challenges;
        this.jdbc = jdbc;
        this.clock = clock;
    }

    /**
     * 받은 사람이 보는 요약. 대상마다 필요한 값만 채운다.
     * RUN: 기록 숫자(거리 · 시간 · 페이스, 인증된 코스 기록) · 코스 이름. COURSE: 코스 이름 · 거리. LIVE_ROOM: 방 목표 · 예약 시각 · 인원
     * CHALLENGE: 도전한 사람 · 도전받은 사람 · 코스 · 목표 기록(challengeTargetSec) · 판정(challengeStatus) · 도전 기록(recordSeconds)
     */
    public record Preview(String sharerName, RunMode runMode, Long courseId, String courseName, Integer distanceM, Integer elapsedSeconds,
                          Integer avgPaceSecPerKm, Integer recordSeconds, String liveMode, Integer targetDistanceM, Integer targetSeconds,
                          Instant scheduledAt, String roomStatus, Integer memberCount, String challengeStatus, String challengerName,
                          String challengedName, Integer challengeTargetSec) {

        static Preview of(String sharer, RunMode runMode, Long courseId, String courseName, Integer distanceM, Integer elapsedSeconds, Integer avgPace,
                          Integer recordSeconds, String liveMode, Integer targetDistanceM, Integer targetSeconds, Instant scheduledAt, String roomStatus,
                          Integer memberCount) {
            return new Preview(sharer, runMode, courseId, courseName, distanceM, elapsedSeconds, avgPace, recordSeconds, liveMode, targetDistanceM,
                    targetSeconds, scheduledAt, roomStatus, memberCount, null, null, null, null);
        }
    }

    public record Resolved(ShareType type, long referenceId, Long courseId, Preview preview) {
    }

    /** 같은 사람이 같은 대상을 다시 공유하면 같은 코드 */
    @Transactional
    public String create(long userId, ShareType type, long referenceId) {
        switch (type) {
            case RUN -> {
                Run run = runs.findById(referenceId).orElseThrow(() -> new ApiException(ErrorCode.RUN_NOT_FOUND));
                if (run.getUserId() != userId) throw new ApiException(ErrorCode.RESOURCE_FORBIDDEN);
                if (run.getStatus() != RunStatus.FINISHED) throw new ApiException(ErrorCode.RUN_INVALID_STATE, "끝난 기록만 공유할 수 있어요.");
            }
            case COURSE -> courses.requireViewable(userId, referenceId);
            case LIVE_ROOM -> {
                if (!rooms.isMember(userId, referenceId)) throw new ApiException(ErrorCode.RESOURCE_FORBIDDEN, "참가한 방만 초대할 수 있어요.");
            }
            case CHALLENGE -> {
                // 보낸 사람 · 받은 사람만, 취소한 도전은 공유하지 않는다
                var c = challenges.get(userId, referenceId).row();
                if (c.status() == ChallengeStatus.CANCELED) throw new ApiException(ErrorCode.RUN_INVALID_STATE, "취소한 도전은 공유할 수 없어요.");
            }
        }
        var existing = store.codeOf(userId, type, referenceId);
        if (existing.isPresent()) return existing.get();
        for (int attempt = 0; attempt < 5; attempt++) {
            String code = newCode();
            try {
                store.insert(userId, type, referenceId, code, clock.instant());
                return code;
            } catch (DuplicateKeyException e) {
                // 같은 대상을 동시에 공유했거나(uk_share_target) 코드가 겹쳤다(uk_share_code)
                var raced = store.codeOf(userId, type, referenceId);
                if (raced.isPresent()) return raced.get();
            }
        }
        throw new IllegalStateException("share code 생성 실패");
    }

    /** SHR-004: 로그인 없이 코드를 해석한다. 없거나 만료됐으면 404 */
    @Transactional(readOnly = true)
    public Resolved resolve(String code) {
        var link = store.find(code).filter(l -> l.expiresAt() == null || l.expiresAt().isAfter(clock.instant()))
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND, "공유 링크를 찾을 수 없어요."));
        String sharer = nickname(link.creatorId());
        return switch (link.type()) {
            case RUN -> {
                Run r = runs.findById(link.referenceId()).orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND, "공유 링크를 찾을 수 없어요."));
                String courseName = courseName(r.getCourseId());
                Integer record = r.getCourseId() == null ? null : jdbc.queryForList(
                        "SELECT duration_seconds FROM tbl_course_record WHERE run_id = ?", Integer.class, r.getId()).stream().findFirst().orElse(null);
                Long courseId = courseName == null ? null : r.getCourseId();
                yield new Resolved(link.type(), link.referenceId(), courseId, Preview.of(sharer, r.getMode(), courseId, courseName, r.getDistanceM(),
                        r.getElapsedSeconds(), r.getAvgPaceSecPerKm(), record, null, null, null, null, null, null));
            }
            case COURSE -> {
                String name = courseName(link.referenceId());
                Integer distance = name == null ? null : courses.requireViewable(null, link.referenceId()).getDistanceM();
                yield new Resolved(link.type(), link.referenceId(), link.referenceId(),
                        Preview.of(sharer, null, link.referenceId(), name, distance, null, null, null, null, null, null, null, null, null));
            }
            case LIVE_ROOM -> {
                var s = rooms.preview(link.referenceId());
                var room = s.room();
                yield new Resolved(link.type(), link.referenceId(), room.getCourseId(), Preview.of(sharer, null, room.getCourseId(), s.courseName(), null, null, null,
                        null, room.getMode().name(), room.getTargetDistanceM(), room.getTargetSeconds(), room.getScheduledAt(), room.getStatus().name(),
                        s.members().size()));
            }
            case CHALLENGE -> {
                var c = challenges.forShare(link.referenceId()).filter(x -> x.status() != ChallengeStatus.CANCELED)
                        .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND, "공유 링크를 찾을 수 없어요."));
                // 코스가 숨겨졌으면 코스 이름 · id를 내보내지 않는다
                String name = courseName(c.courseId());
                Long courseId = name == null ? null : c.courseId();
                boolean judged = c.status() == ChallengeStatus.SUCCESS || c.status() == ChallengeStatus.FAILED;
                yield new Resolved(link.type(), link.referenceId(), courseId, new Preview(sharer, null, courseId, name, name == null ? null : c.courseDistanceM(),
                        null, null, judged ? c.resultSec() : null, null, null, null, null, null, null, c.status().name(), c.challengerName(), c.targetName(),
                        c.targetSec()));
            }
        };
    }

    private String courseName(Long courseId) {
        if (courseId == null) return null;
        try {
            Course c = courses.requireViewable(null, courseId);
            return c.getName();
        } catch (ApiException hidden) {
            return null;
        }
    }

    private String nickname(long userId) {
        return jdbc.queryForList("SELECT nickname FROM tbl_user WHERE id = ?", String.class, userId).stream().findFirst().orElse("");
    }

    private String newCode() {
        StringBuilder b = new StringBuilder(CODE_LENGTH);
        for (int i = 0; i < CODE_LENGTH; i++) b.append(ALPHABET.charAt(random.nextInt(ALPHABET.length())));
        return b.toString();
    }
}
