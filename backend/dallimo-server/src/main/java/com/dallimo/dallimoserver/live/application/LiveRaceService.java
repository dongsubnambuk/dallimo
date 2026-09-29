package com.dallimo.dallimoserver.live.application;

import com.dallimo.dallimoserver.common.error.ApiException;
import com.dallimo.dallimoserver.common.error.ErrorCode;
import com.dallimo.dallimoserver.live.domain.LiveMemberStatus;
import com.dallimo.dallimoserver.live.domain.LiveMode;
import com.dallimo.dallimoserver.live.domain.LiveRoom;
import com.dallimo.dallimoserver.live.domain.LiveRoomEvents;
import com.dallimo.dallimoserver.live.domain.LiveRoomStatus;
import com.dallimo.dallimoserver.live.infrastructure.LiveMemberJdbcRepository;
import com.dallimo.dallimoserver.live.infrastructure.LiveMemberJdbcRepository.Final;
import com.dallimo.dallimoserver.live.infrastructure.LiveMemberJdbcRepository.Member;
import com.dallimo.dallimoserver.live.infrastructure.LiveRoomJpaRepository;
import com.dallimo.dallimoserver.live.infrastructure.LiveStateStore;
import com.dallimo.dallimoserver.live.infrastructure.LiveStateStore.MemberState;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 8장 · 46장 실시간 경쟁 (WBS 11). 참가자는 3~5초마다 거리 · 시간 · 페이스 · 상태만 보낸다 (GPS 좌표 없음, 8.4장).
 * 최신 상태는 Redis(47장), 최종 결과만 DB. 방 상태 전이와 마감은 서버가 정한다 (45.1장).
 * 연결이 끊겨도 개인 Run은 계속된다: 화면에 DISCONNECTED로만 보이고 다시 연결되면 최신 상태를 보낸다 (30.4장).
 */
@Service
public class LiveRaceService {

    private static final Logger log = LoggerFactory.getLogger(LiveRaceService.class);
    public static final String TOPIC = "/topic/live-runs/";
    public static final String USER_QUEUE = "/queue/live-runs";
    // 사람이 낼 수 없는 평균 속도(m/s). 이보다 빠른 상태는 받지 않는다 (RunMetrics 순간 이동 기준과 같은 값)
    static final double MAX_AVG_SPEED_MPS = 12;
    // 목표 거리 판정 GPS 여유(m)
    static final int FINISH_TOLERANCE_M = 20;

    private final LiveRoomJpaRepository rooms;
    private final LiveMemberJdbcRepository members;
    private final LiveStateStore state;
    private final LiveRoomService roomService;
    private final SimpMessagingTemplate ws;
    private final LiveProperties props;
    private final Clock clock;
    // 이벤트 · 주기 확인은 자기 자신을 부르므로 트랜잭션을 직접 연다 (커밋 뒤 이벤트는 새 트랜잭션)
    private final TransactionTemplate tx;

    public LiveRaceService(LiveRoomJpaRepository rooms, LiveMemberJdbcRepository members, LiveStateStore state, LiveRoomService roomService,
                           SimpMessagingTemplate ws, LiveProperties props, Clock clock, PlatformTransactionManager txManager) {
        this.rooms = rooms;
        this.members = members;
        this.state = state;
        this.roomService = roomService;
        this.ws = ws;
        this.props = props;
        this.clock = clock;
        this.tx = new TransactionTemplate(txManager);
        this.tx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    /** 8.2장 RUN_STATE (C→S) */
    public record StateMessage(Long seq, Integer distanceM, Integer elapsedSeconds, Integer currentPaceSecPerKm, String status, String sentAt) {
    }

    // ── 받기 ──

    @Transactional
    public void onState(long userId, long roomId, StateMessage m) {
        LiveRoom room = lockRoom(roomId);
        Member me = requireMember(room, userId);
        if (room.getStatus() != LiveRoomStatus.RUNNING) {
            error(userId, "RUN_INVALID_STATE", "달리는 중인 방이 아니에요.", false);
            return;
        }
        if (me.status() != LiveMemberStatus.RUNNING) return;
        Instant now = clock.instant();
        if (m == null || m.seq() == null || m.seq() < 1 || m.distanceM() == null || m.elapsedSeconds() == null || m.distanceM() < 0 || m.elapsedSeconds() < 0) {
            error(userId, "VALIDATION_ERROR", "상태 값을 확인해 주세요.", true);
            return;
        }
        // 30.3장: 서버 시각 하나로 시간을 정하지 않지만, 출발 뒤 흐른 시간보다 길 수는 없다
        long wall = Math.max(0, Duration.between(room.getStartedAt(), now).toSeconds()) + 60;
        int elapsed = (int) Math.min(m.elapsedSeconds(), wall);
        if (elapsed > 0 && m.distanceM() / (double) elapsed > MAX_AVG_SPEED_MPS) {
            error(userId, "VALIDATION_ERROR", "비정상적인 속도예요.", true);
            return;
        }
        String status = switch (m.status() == null ? "RUNNING" : m.status()) {
            case "FINISHED" -> reachedGoal(room, m.distanceM(), elapsed) ? "FINISHED" : "RUNNING";
            case "DNF" -> "DNF";
            default -> "RUNNING";
        };
        int distance = status.equals("FINISHED") && room.distanceGoal() ? room.getTargetDistanceM() : m.distanceM();
        if (!state.update(roomId, userId, m.seq(), distance, elapsed, m.currentPaceSecPerKm(), status, now, runningTtl(room))) return;

        if (status.equals("FINISHED")) {
            members.finish(roomId, userId, LiveMemberStatus.FINISHED, distance, elapsed, null, now);
            state.markFirstFinish(roomId, now);
            broadcast(roomId, event("MEMBER_FINISHED", roomId, Map.of("userId", userId, "finishSec", elapsed)));
        } else if (status.equals("DNF")) {
            members.finish(roomId, userId, LiveMemberStatus.DNF, distance, elapsed, null, now);
            broadcast(roomId, event("MEMBER_DNF", roomId, Map.of("userId", userId)));
        }
        broadcastState(room);
        tryFinish(room, now);
    }

    /** heartbeat: 연결 유지. 끊겼다 돌아왔으면 알린다 */
    @Transactional
    public void onHeartbeat(long userId, long roomId) {
        LiveRoom room = lockRoom(roomId);
        requireMember(room, userId);
        if (room.getStatus() != LiveRoomStatus.RUNNING) return;
        if (state.touch(roomId, userId, clock.instant())) {
            broadcast(roomId, event("MEMBER_CONNECTION", roomId, Map.of("userId", userId, "connected", true)));
            broadcastState(room);
        }
    }

    /** 구독 · 재접속 때 방 최신 snapshot (SYNC_STATE). 끝난 방이면 결과 */
    @Transactional
    public void sync(long userId, long roomId) {
        LiveRoom room = rooms.findById(roomId).orElse(null);
        if (room == null || members.list(roomId).stream().noneMatch(m -> m.userId() == userId)) return;
        if (room.getStatus() == LiveRoomStatus.RUNNING) state.touch(roomId, userId, clock.instant());
        Map<String, Object> e = event("SYNC_STATE", roomId, Map.of("status", room.getStatus().name(), "members", views(room)));
        if (room.getStatus() == LiveRoomStatus.FINISHED) e.put("result", result(room, userId));
        ws.convertAndSendToUser(String.valueOf(userId), USER_QUEUE, (Object) e);
    }

    public boolean isMember(long userId, long roomId) {
        return members.list(roomId).stream().anyMatch(m -> m.userId() == userId);
    }

    // ── 방 상태 변화 ──

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onStarted(LiveRoomEvents.Started e) {
        LiveRoom room = rooms.findById(e.roomId()).orElse(null);
        if (room == null || room.getStartedAt() == null) return;
        List<Long> ids = members.list(room.getId()).stream().filter(m -> m.status() == LiveMemberStatus.RUNNING).map(Member::userId).toList();
        state.start(room.getId(), ids, room.getStartedAt(), runningTtl(room));
        broadcast(room.getId(), event("ROOM_STARTED", room.getId(), Map.of("startedAt", room.getStartedAt().toString())));
        broadcastState(room);
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onLeft(LiveRoomEvents.Left e) {
        state.setStatus(e.roomId(), e.userId(), "DNF");
        broadcast(e.roomId(), event("MEMBER_DNF", e.roomId(), Map.of("userId", e.userId())));
        checkRoom(e.roomId());
    }

    /** 연결 끊김 · 출발 시각 · 마감을 주기적으로 확인한다 */
    @Scheduled(fixedDelayString = "${dallimo.live.sweep-interval:5s}", initialDelayString = "${dallimo.live.sweep-interval:5s}")
    public void sweep() {
        for (Long id : members.activeRoomIds(clock.instant())) {
            try {
                roomService.tick(id);
                checkRoom(id);
            } catch (RuntimeException ex) {
                log.error("live room {} sweep failed", id, ex);
            }
        }
    }

    /** 한 방: 연결 끊김 표시 + 마감 확인 */
    public void checkRoom(long roomId) {
        tx.executeWithoutResult(status -> checkRoomLocked(roomId));
    }

    private void checkRoomLocked(long roomId) {
        LiveRoom room = rooms.findForUpdate(roomId).orElse(null);
        if (room == null || room.getStatus() != LiveRoomStatus.RUNNING) return;
        Instant now = clock.instant();
        boolean changed = false;
        for (MemberState s : state.states(roomId).values()) {
            if (s.status().equals("RUNNING") && s.connected() && s.lastSeenAt().isBefore(now.minus(props.presenceTimeout()))) {
                state.setConnected(roomId, s.userId(), false);
                broadcast(roomId, event("MEMBER_CONNECTION", roomId, Map.of("userId", s.userId(), "connected", false)));
                changed = true;
            }
        }
        if (changed) broadcastState(room);
        tryFinish(room, now);
    }

    // ── 마감 (사용자 결정) ──

    /** 모두 끝났거나 마감 시각이 지났으면 결과를 확정한다 */
    private void tryFinish(LiveRoom room, Instant now) {
        List<Member> list = members.list(room.getId());
        boolean allDone = !list.isEmpty() && list.stream().allMatch(m -> m.status() == LiveMemberStatus.FINISHED || m.status() == LiveMemberStatus.DNF);
        if (allDone || now.isAfter(deadline(room)) || now.equals(deadline(room))) finalizeRoom(room, now);
    }

    /** 레이스 · 거리 함께: 첫 완주 + 30분, 타임 어택 · 시간 함께: 목표 시간 + 5분, 그리고 출발 + 6시간 안전장치 */
    private Instant deadline(LiveRoom room) {
        Instant safety = room.getStartedAt().plus(props.maxDuration());
        Instant goal;
        if (room.distanceGoal()) {
            Instant first = state.firstFinishAt(room.getId());
            goal = first == null ? safety : first.plus(props.raceGrace());
        } else {
            goal = room.getStartedAt().plusSeconds(room.getTargetSeconds()).plus(props.timeGrace());
        }
        return goal.isBefore(safety) ? goal : safety;
    }

    private void finalizeRoom(LiveRoom room, Instant now) {
        long roomId = room.getId();
        Map<Long, MemberState> states = state.states(roomId);
        Map<Long, LiveMemberStatus> db = new HashMap<>();
        for (Member m : members.list(roomId)) db.put(m.userId(), m.status());

        record Row(long userId, LiveMemberStatus status, int distanceM, int elapsed) {
        }
        List<Row> rows = new ArrayList<>();
        for (var e : db.entrySet()) {
            MemberState s = states.get(e.getKey());
            int distance = s == null ? 0 : s.distanceM();
            int elapsed = s == null ? 0 : (s.finishSec() != null ? s.finishSec() : s.elapsedSec());
            LiveMemberStatus status = e.getValue();
            if (status != LiveMemberStatus.FINISHED && status != LiveMemberStatus.DNF) {
                // 시간 목표는 마감 때 달린 거리로 끝, 거리 목표는 도착하지 못했으면 DNF
                status = room.distanceGoal() ? LiveMemberStatus.DNF : LiveMemberStatus.FINISHED;
                if (!room.distanceGoal()) elapsed = room.getTargetSeconds();
            }
            rows.add(new Row(e.getKey(), status, distance, elapsed));
        }
        // 순위: 레이스 = 완주 시간, 타임 어택 = 거리, 함께 = 없음. DNF는 순위 없음
        Map<Long, Integer> rank = new HashMap<>();
        if (room.getMode() != LiveMode.TOGETHER) {
            Comparator<Row> order = room.getMode() == LiveMode.LIVE_RACE
                    ? Comparator.comparingInt(Row::elapsed).thenComparingLong(Row::userId)
                    : Comparator.comparingInt(Row::distanceM).reversed().thenComparingLong(Row::userId);
            List<Row> ranked = rows.stream().filter(r -> r.status() == LiveMemberStatus.FINISHED).sorted(order).toList();
            for (int i = 0; i < ranked.size(); i++) rank.put(ranked.get(i).userId(), i + 1);
        }
        for (Row r : rows) members.finish(roomId, r.userId(), r.status(), r.distanceM(), r.elapsed(), rank.get(r.userId()), now);
        room.finish(now);
        state.expireRoom(roomId, props.finishedTtl());
        // 결과를 읽을 수 있게 커밋한 뒤 알린다
        afterCommit(() -> {
            LiveRoom done = rooms.findById(roomId).orElse(room);
            broadcast(roomId, event("ROOM_FINISHED", roomId, Map.of("result", result(done, null))));
        });
    }

    // ── 결과 (45장 GET /live-runs/{id}/result) ──

    public record ResultEntry(long userId, String name, boolean isMe, Integer rank, String status, Integer timeSec, int distanceM) {
    }

    public record Result(long roomId, LiveMode mode, Integer targetDistanceM, Integer targetSeconds, Instant finishedAt, List<ResultEntry> entries,
                         Long myRunId) {
    }

    @Transactional(readOnly = true)
    public Result result(long userId, long roomId) {
        LiveRoom room = rooms.findById(roomId).orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND, "방을 찾을 수 없어요."));
        if (!isMember(userId, roomId)) throw new ApiException(ErrorCode.RESOURCE_NOT_FOUND, "방을 찾을 수 없어요.");
        if (room.getStatus() != LiveRoomStatus.FINISHED) throw new ApiException(ErrorCode.RESOURCE_NOT_FOUND, "결과가 아직 없어요.");
        return result(room, userId);
    }

    private Result result(LiveRoom room, Long viewerId) {
        List<Final> finals = members.finals(room.getId());
        List<ResultEntry> entries = finals.stream()
                .map(f -> new ResultEntry(f.userId(), f.nickname(), viewerId != null && f.userId() == viewerId, f.rank(),
                        f.status() == LiveMemberStatus.DNF ? "DNF" : "FINISHED", f.status() == LiveMemberStatus.DNF ? null : f.elapsedSeconds(),
                        f.distanceM() == null ? 0 : f.distanceM()))
                .toList();
        Long myRunId = viewerId == null ? null : finals.stream().filter(f -> f.userId() == viewerId).findFirst().map(Final::runId).orElse(null);
        return new Result(room.getId(), room.getMode(), room.getTargetDistanceM(), room.getTargetSeconds(), room.getEndedAt(), entries, myRunId);
    }

    // ── 보내기 ──

    /** 참가자 최신 상태. 달리는 중인데 연결이 끊겼으면 DISCONNECTED */
    private List<Map<String, Object>> views(LiveRoom room) {
        Map<Long, MemberState> states = state.states(room.getId());
        List<Map<String, Object>> out = new ArrayList<>();
        for (Member m : members.list(room.getId())) {
            MemberState s = states.get(m.userId());
            String status = s == null ? m.status().name() : s.status();
            if (s != null && status.equals("RUNNING") && !s.connected()) status = "DISCONNECTED";
            Map<String, Object> v = new LinkedHashMap<>();
            v.put("userId", m.userId());
            v.put("name", m.nickname());
            v.put("status", status);
            v.put("distanceM", s == null ? 0 : s.distanceM());
            v.put("elapsedSec", s == null ? 0 : s.elapsedSec());
            v.put("paceSec", s == null ? null : s.paceSec());
            v.put("finishSec", s == null ? null : s.finishSec());
            out.add(v);
        }
        return out;
    }

    private void broadcastState(LiveRoom room) {
        broadcast(room.getId(), event("MEMBER_STATE", room.getId(), Map.of("members", views(room))));
    }

    private void broadcast(long roomId, Map<String, Object> payload) {
        ws.convertAndSend(TOPIC + roomId, (Object) payload);
    }

    private void error(long userId, String code, String message, boolean recoverable) {
        ws.convertAndSendToUser(String.valueOf(userId), USER_QUEUE, (Object) Map.of("type", "ERROR", "code", code, "message", message, "recoverable", recoverable));
    }

    private Map<String, Object> event(String type, long roomId, Map<String, Object> fields) {
        Map<String, Object> e = new LinkedHashMap<>();
        e.put("type", type);
        e.put("roomId", roomId);
        e.putAll(fields);
        e.put("serverTime", clock.instant().toString());
        return e;
    }

    private static void afterCommit(Runnable r) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            r.run();
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                r.run();
            }
        });
    }

    private boolean reachedGoal(LiveRoom room, int distanceM, int elapsed) {
        if (room.distanceGoal()) return distanceM >= room.getTargetDistanceM() - FINISH_TOLERANCE_M;
        return elapsed >= room.getTargetSeconds() - 5;
    }

    private Duration runningTtl(LiveRoom room) {
        // 47.1장: 최대 러닝 시간 + 복구 여유
        return props.maxDuration().plus(props.finishedTtl());
    }

    private LiveRoom lockRoom(long roomId) {
        return rooms.findForUpdate(roomId).orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND, "방을 찾을 수 없어요."));
    }

    private Member requireMember(LiveRoom room, long userId) {
        return members.list(room.getId()).stream().filter(m -> m.userId() == userId).findFirst()
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_FORBIDDEN, "이 방에 참가하지 않았어요."));
    }
}
