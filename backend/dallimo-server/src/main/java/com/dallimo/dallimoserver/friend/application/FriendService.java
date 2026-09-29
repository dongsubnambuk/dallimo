package com.dallimo.dallimoserver.friend.application;

import com.dallimo.dallimoserver.common.error.ApiException;
import com.dallimo.dallimoserver.common.error.ErrorCode;
import com.dallimo.dallimoserver.common.web.CursorPage;
import com.dallimo.dallimoserver.friend.domain.FriendRelation;
import com.dallimo.dallimoserver.friend.domain.FriendshipStatus;
import com.dallimo.dallimoserver.friend.infrastructure.FriendJdbcRepository;
import com.dallimo.dallimoserver.friend.infrastructure.FriendJdbcRepository.CourseBest;
import com.dallimo.dallimoserver.friend.infrastructure.FriendJdbcRepository.Link;
import com.dallimo.dallimoserver.friend.infrastructure.FriendJdbcRepository.Pair;
import com.dallimo.dallimoserver.friend.infrastructure.FriendJdbcRepository.UserRow;
import com.dallimo.dallimoserver.notification.application.NotificationService;
import com.dallimo.dallimoserver.notification.domain.NotificationType;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * 친구 (FND-001~005, 44장). 두 사람 사이 관계는 한 줄이다 (44.1장 canonical pair).
 * 요청 → 받은 사람이 승인 · 거절. 상대가 이미 나에게 요청했는데 내가 요청하면 바로 친구가 된다 (FRD-IT-001 동시 요청).
 * 거절 · 취소 · 삭제된 관계는 새 요청으로 다시 쓴다.
 */
@Service
public class FriendService {

    // 친구 프로필에 보여줄 코스 기록 수
    static final int PROFILE_RECORDS = 5;
    // 친구 코드: RUN- + 헷갈리는 글자를 뺀 6자리 (FriendCodes). 앞의 RUN-는 빼고 입력해도 된다
    private static final Pattern FRIEND_CODE = Pattern.compile("^(?:RUN-)?([23456789A-HJ-NP-Z]{6})$");

    private final FriendJdbcRepository store;
    private final NotificationService notifications;
    private final Clock clock;

    public FriendService(FriendJdbcRepository store, NotificationService notifications, Clock clock) {
        this.store = store;
        this.notifications = notifications;
        this.clock = clock;
    }

    /** requestId: 관계가 요청 중일 때 그 요청 id (받은 요청을 승인 · 거절할 때) */
    public record UserSummary(long userId, String nickname, String profileImageUrl, FriendRelation relation, Long requestId) {
    }

    public record Friend(long userId, String nickname, String profileImageUrl, Instant since) {
    }

    public record Request(long requestId, long userId, String nickname, String profileImageUrl, Instant requestedAt) {
    }

    public record Requests(List<Request> received, List<Request> sent) {
    }

    /** 친구 프로필. 기록 · 마지막 러닝은 친구(와 나)에게만 보인다 */
    public record Profile(UserSummary user, Instant lastRunAt, List<CourseBest> records) {
    }

    // ── 검색 (FND-001) ──

    @Transactional(readOnly = true)
    public CursorPage<UserSummary> search(long viewerId, String query, String cursor, int size) {
        String q = query == null ? "" : query.trim();
        if (q.isEmpty() || q.length() > 40) throw new ApiException(ErrorCode.VALIDATION_ERROR, "검색어를 1~40자로 입력해 주세요.");
        String lower = q.toLowerCase(Locale.ROOT);
        String pattern = "%" + lower.replace("!", "!!").replace("%", "!%").replace("_", "!_") + "%";
        var code = FRIEND_CODE.matcher(q.toUpperCase(Locale.ROOT));
        String friendCode = code.matches() ? "RUN-" + code.group(1) : "";
        int offset = decodeOffset(cursor);
        List<UserRow> rows = store.search(viewerId, pattern, friendCode, offset, size + 1);
        boolean hasNext = rows.size() > size;
        List<UserRow> page = hasNext ? rows.subList(0, size) : rows;
        Map<Long, Pair> pairs = store.pairsWith(viewerId, page.stream().map(UserRow::userId).toList());
        List<UserSummary> items = page.stream().map(u -> summary(viewerId, u, pairs.get(u.userId()))).toList();
        return new CursorPage<>(items, hasNext ? encode(offset + size) : null, hasNext);
    }

    // ── 요청 (FND-002) ──

    /** 친구 요청. 이미 친구면 그대로, 상대가 먼저 요청했으면 승인한다. 같은 요청을 다시 보내도 결과가 같다 */
    @Transactional
    public UserSummary request(long me, long targetId) {
        if (me == targetId) throw new ApiException(ErrorCode.VALIDATION_ERROR, "나에게는 친구 요청을 보낼 수 없어요.");
        UserRow target = store.activeUser(targetId).orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND, "사용자를 찾을 수 없어요."));
        Instant now = clock.instant();
        Pair pair = null;
        boolean sent = false;
        if (store.findPair(me, targetId).isEmpty()) {
            try {
                store.insert(me, targetId, now);
                sent = true;
            } catch (DuplicateKeyException race) {
                // 상대가 같은 때 나에게 요청했다. 그 줄로 이어서 처리한다
                pair = store.lockPair(me, targetId).orElseThrow();
            }
        } else {
            pair = store.lockPair(me, targetId).orElseThrow();
        }
        if (pair != null) {
            switch (pair.status()) {
                case PENDING -> {
                    if (pair.requesterId() != me) store.respond(pair.id(), FriendshipStatus.ACCEPTED, now);
                }
                case REJECTED, CANCELED -> {
                    store.reopen(pair.id(), me, now);
                    sent = true;
                }
                case ACCEPTED -> {
                }
            }
        }
        // Push (사용자 결정): 새 요청일 때만. 다시 보낸 같은 요청 · 바로 친구가 된 경우는 알리지 않는다
        if (sent) {
            String name = store.activeUser(me).map(UserRow::nickname).orElse("");
            notifications.notify(targetId, NotificationType.FRIEND_REQUEST, "친구 요청", name + "님이 친구 요청을 보냈어요", "/my/friends");
        }
        return summary(me, target, store.lockPair(me, targetId).orElseThrow());
    }

    /** FND-003 받은 · 보낸 요청 */
    @Transactional(readOnly = true)
    public Requests requests(long me) {
        return new Requests(store.pending(me, true).stream().map(FriendService::request).toList(),
                store.pending(me, false).stream().map(FriendService::request).toList());
    }

    /** 받은 요청 승인. 이미 승인했으면 그대로 */
    @Transactional
    public UserSummary accept(long me, long requestId) {
        Pair p = received(me, requestId);
        if (p.status() == FriendshipStatus.PENDING) store.respond(p.id(), FriendshipStatus.ACCEPTED, clock.instant());
        else if (p.status() != FriendshipStatus.ACCEPTED) throw new ApiException(ErrorCode.RUN_INVALID_STATE, "이미 처리한 요청이에요.");
        return profileSummary(me, p.other(me));
    }

    /** 받은 요청 거절. 이미 거절했으면 그대로. 보낸 사람에게 알리지 않는다 */
    @Transactional
    public void reject(long me, long requestId) {
        Pair p = received(me, requestId);
        if (p.status() == FriendshipStatus.PENDING) store.respond(p.id(), FriendshipStatus.REJECTED, clock.instant());
        else if (p.status() != FriendshipStatus.REJECTED) throw new ApiException(ErrorCode.RUN_INVALID_STATE, "이미 처리한 요청이에요.");
    }

    /**
     * FND-004 친구 삭제. 요청 중이면 보낸 요청 취소 · 받은 요청 거절로 끝낸다. 관계가 없으면 그대로 (같은 요청을 다시 보내도 결과가 같다)
     */
    @Transactional
    public void remove(long me, long otherId) {
        Pair p = store.lockPair(me, otherId).orElse(null);
        if (p == null) return;
        Instant now = clock.instant();
        switch (p.status()) {
            case ACCEPTED -> store.respond(p.id(), FriendshipStatus.CANCELED, now);
            case PENDING -> store.respond(p.id(), p.requesterId() == me ? FriendshipStatus.CANCELED : FriendshipStatus.REJECTED, now);
            case REJECTED, CANCELED -> {
            }
        }
    }

    // ── 목록 · 프로필 (FND-005) ──

    @Transactional(readOnly = true)
    public List<Friend> friends(long me) {
        return store.friends(me).stream().map(l -> new Friend(l.user().userId(), l.user().nickname(), l.user().profileImageUrl(), l.at())).toList();
    }

    /** 친구 랭킹 · 함께 달리기 초대에서 쓴다 */
    @Transactional(readOnly = true)
    public List<Long> friendIds(long me) {
        return store.friendIds(me);
    }

    @Transactional(readOnly = true)
    public boolean areFriends(long a, long b) {
        return store.pairsWith(a, List.of(b)).values().stream().anyMatch(p -> p.status() == FriendshipStatus.ACCEPTED);
    }

    @Transactional(readOnly = true)
    public Profile profile(long viewerId, long userId) {
        UserSummary user = profileSummary(viewerId, userId);
        boolean open = viewerId == userId || user.relation() == FriendRelation.FRIEND;
        if (!open) return new Profile(user, null, List.of());
        return new Profile(user, store.lastRunAt(userId), store.courseBests(userId, viewerId, PROFILE_RECORDS));
    }

    /** 탈퇴한 사용자의 친구 · 요청을 끝낸다 */
    @Transactional
    public void endAllOf(long userId) {
        store.cancelAllOf(userId, clock.instant());
    }

    private UserSummary profileSummary(long viewerId, long userId) {
        UserRow u = store.activeUser(userId).orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND, "사용자를 찾을 수 없어요."));
        return summary(viewerId, u, viewerId == userId ? null : store.pairsWith(viewerId, List.of(userId)).get(userId));
    }

    /** 내가 받은 요청만 승인 · 거절할 수 있다. 남의 요청 · 내가 보낸 요청은 없는 것과 같게 404 */
    private Pair received(long me, long requestId) {
        Pair p = store.lockById(requestId).orElse(null);
        if (p == null || (p.lowId() != me && p.highId() != me) || p.requesterId() == me) {
            throw new ApiException(ErrorCode.RESOURCE_NOT_FOUND, "친구 요청을 찾을 수 없어요.");
        }
        return p;
    }

    private static UserSummary summary(long viewerId, UserRow u, Pair p) {
        FriendRelation relation = FriendRelation.NONE;
        Long requestId = null;
        if (p != null && p.status() == FriendshipStatus.ACCEPTED) relation = FriendRelation.FRIEND;
        else if (p != null && p.status() == FriendshipStatus.PENDING) {
            relation = p.requesterId() == viewerId ? FriendRelation.SENT : FriendRelation.RECEIVED;
            requestId = p.id();
        }
        return new UserSummary(u.userId(), u.nickname(), u.profileImageUrl(), relation, requestId);
    }

    private static Request request(Link l) {
        return new Request(l.id(), l.user().userId(), l.user().nickname(), l.user().profileImageUrl(), l.at());
    }

    // cursor는 앱이 해석하지 않는 값 (27.3장). 검색 결과 안 위치
    private static String encode(int offset) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(("o:" + offset).getBytes(StandardCharsets.UTF_8));
    }

    private static int decodeOffset(String cursor) {
        if (cursor == null) return 0;
        try {
            String raw = new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8);
            if (!raw.startsWith("o:")) throw new IllegalArgumentException();
            int n = Integer.parseInt(raw.substring(2));
            if (n < 0) throw new IllegalArgumentException();
            return n;
        } catch (IllegalArgumentException e) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "cursor 값이 올바르지 않아요.");
        }
    }
}
