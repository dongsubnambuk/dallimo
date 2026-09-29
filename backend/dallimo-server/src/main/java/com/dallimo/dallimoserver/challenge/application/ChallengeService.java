package com.dallimo.dallimoserver.challenge.application;

import com.dallimo.dallimoserver.challenge.domain.ChallengeStatus;
import com.dallimo.dallimoserver.challenge.infrastructure.ChallengeJdbcRepository;
import com.dallimo.dallimoserver.challenge.infrastructure.ChallengeJdbcRepository.Row;
import com.dallimo.dallimoserver.challenge.infrastructure.ChallengeJdbcRepository.TargetRecord;
import com.dallimo.dallimoserver.activity.application.ActivityService;
import com.dallimo.dallimoserver.common.error.ApiException;
import com.dallimo.dallimoserver.common.error.ErrorCode;
import com.dallimo.dallimoserver.course.application.CourseService;
import com.dallimo.dallimoserver.friend.application.FriendService;
import com.dallimo.dallimoserver.notification.application.NotificationService;
import com.dallimo.dallimoserver.notification.domain.NotificationType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * 도전 (CHL-001~004, 44장). 친구의 인증된 코스 기록 하나를 목표로 만든다 (사용자 결정: 친구 기록만, 980행: 검증된 기록만).
 * 목표 기록은 만든 때의 기록으로 고정한다. 이 도전으로 달린 Run이 인증되면 공식 기록이 목표와 같거나 빠를 때 성공,
 * 미인증 · 거부이거나 느리면 실패다 (사용자 결정).
 */
@Service
public class ChallengeService {

    // 목록 한 번에 보여줄 수
    static final int LIST_LIMIT = 30;

    private final ChallengeJdbcRepository store;
    private final FriendService friends;
    private final CourseService courses;
    private final NotificationService notifications;
    private final ActivityService activities;
    private final Clock clock;

    public ChallengeService(ChallengeJdbcRepository store, FriendService friends, CourseService courses, NotificationService notifications,
                            ActivityService activities, Clock clock) {
        this.store = store;
        this.friends = friends;
        this.courses = courses;
        this.notifications = notifications;
        this.activities = activities;
        this.clock = clock;
    }

    /** role: 보는 사람 기준 SENT(내가 도전) · RECEIVED(내 기록에 도전) */
    public record View(Row row, String role) {
    }

    /** CHL-001 도전 만들기 */
    @Transactional
    public View create(long me, long targetRecordId) {
        TargetRecord target = store.targetRecord(targetRecordId).orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND, "기록을 찾을 수 없어요."));
        if (target.userId() == me) throw new ApiException(ErrorCode.VALIDATION_ERROR, "내 기록에는 PB 어택으로 도전해 주세요.");
        if (!friends.areFriends(me, target.userId())) throw new ApiException(ErrorCode.RESOURCE_FORBIDDEN, "친구의 기록에만 도전할 수 있어요.");
        courses.requireViewable(me, target.courseId());
        long id = store.insert(me, target, clock.instant());
        return view(me, store.find(id).orElseThrow());
    }

    /** 보낸 사람 · 받은 사람만 본다. 다른 사람에게는 없는 것과 같다 */
    @Transactional(readOnly = true)
    public View get(long me, long id) {
        Row r = store.find(id).orElse(null);
        if (r == null || (r.challengerId() != me && r.targetUserId() != me)) throw new ApiException(ErrorCode.RESOURCE_NOT_FOUND, "도전을 찾을 수 없어요.");
        return view(me, r);
    }

    /** 아직 달리지 않은 내 도전만 취소한다. 이미 취소했으면 그대로 */
    @Transactional
    public View cancel(long me, long id) {
        View v = get(me, id);
        if (v.row().challengerId() != me) throw new ApiException(ErrorCode.RESOURCE_FORBIDDEN, "보낸 사람만 취소할 수 있어요.");
        ChallengeStatus s = store.lockStatus(id).orElseThrow();
        if (s == ChallengeStatus.OPEN) store.setStatus(id, ChallengeStatus.CANCELED, clock.instant());
        else if (s != ChallengeStatus.CANCELED) throw new ApiException(ErrorCode.RUN_INVALID_STATE, "이미 달린 도전은 취소할 수 없어요.");
        return get(me, id);
    }

    /** SHR-003 공유 링크로 받은 사람이 보는 도전. 링크가 있으면 누구나 (공유한 사람이 고른 대상) */
    @Transactional(readOnly = true)
    public Optional<Row> forShare(long id) {
        return store.find(id);
    }

    /** 보낸 · 받은 도전 (최근 먼저). otherId가 있으면 그 친구와 주고받은 것만 */
    @Transactional(readOnly = true)
    public List<View> list(long me, Long otherId) {
        return store.list(me, otherId, LIST_LIMIT).stream().map(r -> view(me, r)).toList();
    }

    /** POST /runs의 challengeId: 내 OPEN 도전이고 같은 코스일 때만 잇는다. 아니면 Run만 만든다 */
    @Transactional
    public void attachRun(long me, long challengeId, Long courseId, long runId) {
        if (courseId == null) return;
        store.attachRun(challengeId, me, courseId, runId);
    }

    /** 이 Run의 도전 (러닝 상세 결과 판정 표시) */
    @Transactional(readOnly = true)
    public Optional<View> forRun(long me, long runId) {
        return store.findByRun(runId).filter(r -> r.challengerId() == me).map(r -> view(me, r));
    }

    /** 코스 검증이 끝나면 판정한다. recordSeconds: 인증된 공식 기록 (미인증 · 거부면 null) */
    @Transactional
    public void judge(long runId, Integer recordSeconds, Instant now) {
        store.lockRunning(runId).ifPresent(id -> {
            Row c = store.find(id).orElseThrow();
            boolean won = recordSeconds != null && recordSeconds <= c.targetSec();
            store.setStatus(id, won ? ChallengeStatus.SUCCESS : ChallengeStatus.FAILED, now);
            if (won) activities.onChallengeWon(c.challengerId(), id, now);
            // 막아낸 도전은 알림함에만 (Push 없음). 넘은 경우는 "친구가 내 코스 기록을 넘음"으로 알린다
            if (!won) {
                notifications.notify(c.targetUserId(), NotificationType.CHALLENGE_DEFENDED, "도전을 막아냈어요",
                        c.challengerName() + "님이 " + c.courseName() + " 내 기록에 도전했지만 넘지 못했어요", "/course/" + c.courseId());
            }
        });
    }

    private static View view(long me, Row r) {
        return new View(r, r.challengerId() == me ? "SENT" : "RECEIVED");
    }
}
