package com.dallimo.dallimoserver.notification.application;

import com.dallimo.dallimoserver.auth.infrastructure.RefreshSessionRepository;
import com.dallimo.dallimoserver.common.error.ApiException;
import com.dallimo.dallimoserver.common.error.ErrorCode;
import com.dallimo.dallimoserver.common.web.CursorPage;
import com.dallimo.dallimoserver.notification.domain.NotificationType;
import com.dallimo.dallimoserver.notification.infrastructure.NotificationJdbcRepository;
import com.dallimo.dallimoserver.notification.infrastructure.NotificationJdbcRepository.Row;
import com.dallimo.dallimoserver.notification.infrastructure.NotificationJdbcRepository.Settings;
import com.dallimo.dallimoserver.notification.infrastructure.PushTokenJdbcRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.util.Base64;
import java.util.List;

/**
 * 알림 (NTF, 14.2장). 알림함에 저장하고, Push 대상 종류면 커밋 뒤 보낸다 (PushDispatcher).
 * 사용자 결정: Push는 친구 요청 · 함께 달리기 초대 · 예약한 방 취소 · 친구가 내 코스 기록을 넘음 네 가지만.
 */
@Service
public class NotificationService {

    public record Created(long id) {
    }

    private final NotificationJdbcRepository store;
    private final PushTokenJdbcRepository tokens;
    private final RefreshSessionRepository sessions;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    public NotificationService(NotificationJdbcRepository store, PushTokenJdbcRepository tokens, RefreshSessionRepository sessions,
                               ApplicationEventPublisher events, Clock clock) {
        this.store = store;
        this.tokens = tokens;
        this.sessions = sessions;
        this.events = events;
        this.clock = clock;
    }

    /** link: 알림을 누르면 열 앱 안 경로 (예: /together/12) */
    @Transactional
    public long notify(long userId, NotificationType type, String title, String body, String link) {
        long id = store.insert(userId, type, title, body, link, clock.instant());
        if (type.push()) events.publishEvent(new Created(id));
        return id;
    }

    @Transactional(readOnly = true)
    public CursorPage<Row> page(long userId, String cursor, int size) {
        Long before = cursor == null ? null : decode(cursor);
        List<Row> rows = store.page(userId, before, size + 1);
        boolean hasNext = rows.size() > size;
        List<Row> items = hasNext ? rows.subList(0, size) : rows;
        return new CursorPage<>(items, hasNext ? encode(items.get(items.size() - 1).id()) : null, hasNext);
    }

    @Transactional
    public void read(long userId, long id) {
        if (store.markRead(userId, id, clock.instant()) == 0) throw new ApiException(ErrorCode.RESOURCE_NOT_FOUND, "알림을 찾을 수 없어요.");
    }

    @Transactional
    public void readAll(long userId) {
        store.markAllRead(userId, clock.instant());
    }

    @Transactional(readOnly = true)
    public int unread(long userId) {
        return store.unread(userId);
    }

    @Transactional(readOnly = true)
    public Settings settings(long userId) {
        return store.settings(userId);
    }

    @Transactional
    public Settings saveSettings(long userId, Settings s) {
        store.saveSettings(userId, s, clock.instant());
        return s;
    }

    /** 이 기기의 Expo Push 토큰. 기기는 로그인 세션의 device_id로 정한다 */
    @Transactional
    public void registerToken(long userId, long sessionId, String token, String platform) {
        tokens.save(userId, deviceOf(userId, sessionId), token, platform, clock.instant());
    }

    /** 로그아웃 · 알림 권한 끔: 이 기기 토큰을 지운다 */
    @Transactional
    public void unregisterSession(long userId, long sessionId) {
        tokens.deleteDevice(userId, deviceOf(userId, sessionId));
    }

    private String deviceOf(long userId, long sessionId) {
        return sessions.findById(sessionId).filter(s -> s.getUserId() == userId).map(s -> s.getDeviceId())
                .orElseThrow(() -> new ApiException(ErrorCode.AUTH_REQUIRED, "다시 로그인해 주세요."));
    }

    @Transactional
    public void forgetUser(long userId) {
        tokens.deleteUser(userId);
    }

    private static String encode(long id) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(("n:" + id).getBytes(StandardCharsets.UTF_8));
    }

    private static long decode(String cursor) {
        try {
            String raw = new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8);
            if (!raw.startsWith("n:")) throw new IllegalArgumentException();
            return Long.parseLong(raw.substring(2));
        } catch (IllegalArgumentException e) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "cursor 값이 올바르지 않아요.");
        }
    }
}
