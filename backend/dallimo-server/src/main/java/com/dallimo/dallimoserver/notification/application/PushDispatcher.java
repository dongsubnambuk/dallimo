package com.dallimo.dallimoserver.notification.application;

import com.dallimo.dallimoserver.notification.domain.NotificationType.Category;
import com.dallimo.dallimoserver.notification.domain.QuietHours;
import com.dallimo.dallimoserver.notification.infrastructure.NotificationJdbcRepository;
import com.dallimo.dallimoserver.notification.infrastructure.NotificationJdbcRepository.Row;
import com.dallimo.dallimoserver.notification.infrastructure.NotificationJdbcRepository.Settings;
import com.dallimo.dallimoserver.notification.infrastructure.PushTokenJdbcRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.Clock;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 알림이 커밋된 뒤 Push를 보낸다 (요청 응답을 늦추지 않게 비동기).
 * 보내지 않는 때: 그 종류를 설정에서 껐을 때, 밤(22~8시, 한국 시간), 등록한 기기가 없을 때. 알림함에는 그대로 남는다.
 */
@Component
public class PushDispatcher {

    private static final Logger log = LoggerFactory.getLogger(PushDispatcher.class);

    private final NotificationJdbcRepository store;
    private final PushTokenJdbcRepository tokens;
    private final PushSender sender;
    private final NotificationProperties props;
    private final Clock clock;

    public PushDispatcher(NotificationJdbcRepository store, PushTokenJdbcRepository tokens, PushSender sender, NotificationProperties props, Clock clock) {
        this.store = store;
        this.tokens = tokens;
        this.sender = sender;
        this.props = props;
        this.clock = clock;
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onCreated(NotificationService.Created e) {
        try {
            store.find(e.id()).ifPresent(this::dispatch);
        } catch (RuntimeException ex) {
            log.warn("push {} failed: {}", e.id(), ex.getMessage());
        }
    }

    void dispatch(Row n) {
        if (!enabled(store.settings(n.userId()), n.type().category())) return;
        if (props.quietHours() && QuietHours.NIGHT.contains(clock.instant())) return;
        List<String> to = tokens.tokens(n.userId());
        if (to.isEmpty()) return;
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("notificationId", n.id());
        data.put("type", n.type().name());
        if (n.link() != null) data.put("link", n.link());
        int ok = 0;
        int gone = 0;
        List<PushSender.Result> results = sender.send(to.stream().map(t -> new PushSender.Message(t, n.title(), n.body(), data)).toList());
        for (PushSender.Result r : results) {
            if (r.ok()) ok++;
            if (r.deviceGone()) {
                gone++;
                tokens.deleteToken(r.to());
            }
        }
        // 34장 Push: 알림 종류 · provider ticket 결과 (토큰 · 내용은 남기지 않는다)
        log.info("push.sent notificationId={} type={} tokens={} ok={} failed={} deviceGone={}", n.id(), n.type(), results.size(), ok, results.size() - ok, gone);
    }

    private static boolean enabled(Settings s, Category c) {
        return switch (c) {
            case FRIEND -> s.friend();
            case LIVE -> s.live();
            case RECORD -> s.record();
        };
    }
}
