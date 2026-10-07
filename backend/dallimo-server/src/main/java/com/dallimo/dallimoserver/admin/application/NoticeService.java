package com.dallimo.dallimoserver.admin.application;

import com.dallimo.dallimoserver.admin.infrastructure.NoticeJdbcRepository;
import com.dallimo.dallimoserver.admin.infrastructure.NoticeJdbcRepository.Audience;
import com.dallimo.dallimoserver.admin.infrastructure.NoticeJdbcRepository.Notice;
import com.dallimo.dallimoserver.admin.infrastructure.NoticeJdbcRepository.Target;
import com.dallimo.dallimoserver.common.admin.AdminAuditJdbcRepository;
import com.dallimo.dallimoserver.common.admin.AdminKeyGuard;
import com.dallimo.dallimoserver.common.error.ApiException;
import com.dallimo.dallimoserver.common.error.ErrorCode;
import com.dallimo.dallimoserver.common.observability.DallimoMetrics;
import com.dallimo.dallimoserver.notification.application.NotificationProperties;
import com.dallimo.dallimoserver.notification.application.PushSender;
import com.dallimo.dallimoserver.notification.domain.NotificationType;
import com.dallimo.dallimoserver.notification.domain.QuietHours;
import com.dallimo.dallimoserver.notification.infrastructure.PushTokenJdbcRepository;
import com.dallimo.dallimoserver.user.domain.User;
import com.dallimo.dallimoserver.user.infrastructure.UserJpaRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.Clock;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 관리 웹 공지 푸시 (FOUNDATION-DECISION-LOG 87항). 서비스 공지(점검 · 업데이트 · 약관 변경)만 보낸다. 광고성 정보는 별도 수신 동의가 있어야 해서 보내지 않는다.
 * - 보내기 전에 테스트 발송(관리자 본인의 앱 계정 등 회원 한 명)으로 확인하고, 화면에서 본 대상 수를 함께 보내 그 사이 바뀌었으면 막는다
 * - 받는 회원 알림함에 남기고, 그 회원들의 기기로 Push를 보낸다 (응답을 늦추지 않게 커밋 뒤 비동기)
 * - 밤 10시~아침 8시(한국 시간)에는 보내지 않는다 (14.2장 사용자 결정, QuietHours)
 */
@Service
public class NoticeService {

    public static final String ACTION_SEND = "NOTICE_SEND";
    public static final String TARGET_NOTICE = "NOTICE";
    private static final int CHUNK = 500;
    private static final Logger log = LoggerFactory.getLogger(NoticeService.class);

    public record TestResult(int devices, int ok, int failed) {
    }

    /** 받을 회원 · 기기 수. quietHours: 지금 밤이라 보낼 수 없다 (관리 웹이 미리 알린다) */
    public record AudienceView(int users, int devices, boolean quietHours) {
    }

    record Created(long id) {
    }

    private final NoticeJdbcRepository store;
    private final PushTokenJdbcRepository tokens;
    private final UserJpaRepository users;
    private final PushSender sender;
    private final NotificationProperties props;
    private final AdminAuditJdbcRepository audits;
    private final DallimoMetrics metrics;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    public NoticeService(NoticeJdbcRepository store, PushTokenJdbcRepository tokens, UserJpaRepository users, PushSender sender,
                         NotificationProperties props, AdminAuditJdbcRepository audits, DallimoMetrics metrics, ApplicationEventPublisher events,
                         Clock clock) {
        this.store = store;
        this.tokens = tokens;
        this.users = users;
        this.sender = sender;
        this.props = props;
        this.audits = audits;
        this.metrics = metrics;
        this.events = events;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public AudienceView audience(Target target) {
        Audience a = store.audience(target);
        return new AudienceView(a.users(), a.devices(), quiet());
    }

    @Transactional(readOnly = true)
    public List<Notice> recent() {
        return store.recent(30);
    }

    @Transactional(readOnly = true)
    public Notice get(long id) {
        return store.find(id).orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND, "공지를 찾을 수 없어요."));
    }

    /** 회원 한 명의 기기로만 Push를 보낸다 (알림함에는 남기지 않는다) */
    public TestResult test(long userId, String title, String body, String link) {
        quietHours();
        User u = users.findById(userId).filter(x -> User.PROVIDER_EMAIL.equals(x.getProvider()) && x.isActive())
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND, "이용 중인 회원을 찾을 수 없어요."));
        List<String> to = tokens.tokens(u.getId());
        if (to.isEmpty()) throw new ApiException(ErrorCode.USER_INVALID_STATE, "이 회원은 알림을 받을 기기가 없어요. 앱에서 알림을 켜 주세요.");
        int ok = 0;
        for (PushSender.Result r : sender.send(messages(to, title, body, link, null))) {
            if (r.ok()) ok++;
            if (r.deviceGone()) tokens.deleteToken(r.to());
        }
        return new TestResult(to.size(), ok, to.size() - ok);
    }

    /** 공지를 만들고 알림함에 넣는다. Push는 커밋 뒤 보낸다 */
    @Transactional
    public Notice send(AdminKeyGuard.Admin admin, Target target, String title, String body, String link, int expectedUsers) {
        quietHours();
        Audience a = store.audience(target);
        if (a.users() == 0) throw new ApiException(ErrorCode.USER_INVALID_STATE, "받을 회원이 없어요.");
        if (a.users() != expectedUsers) {
            throw new ApiException(ErrorCode.USER_INVALID_STATE, "대상 수가 바뀌었어요 (" + expectedUsers + " → " + a.users() + "명). 다시 확인해 주세요.");
        }
        var now = clock.instant();
        int inbox = store.insertInbox(title, body, link, target, now);
        long id = store.insert(title, body, link, target, admin.actor(), inbox, now);
        audits.record(admin, ACTION_SEND, TARGET_NOTICE, id, target.name() + " · " + title, now);
        events.publishEvent(new Created(id));
        return store.find(id).orElseThrow();
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onCreated(Created e) {
        Notice n = store.find(e.id()).orElse(null);
        if (n == null) return;
        int ok = 0;
        int failed = 0;
        int removed = 0;
        try {
            List<String> to = store.tokens(n.target());
            for (int from = 0; from < to.size(); from += CHUNK) {
                for (PushSender.Result r : sender.send(messages(to.subList(from, Math.min(to.size(), from + CHUNK)), n.title(), n.body(), n.link(), n.id()))) {
                    if (r.ok()) ok++;
                    else failed++;
                    if (r.deviceGone()) {
                        removed++;
                        tokens.deleteToken(r.to());
                    }
                    metrics.push(NotificationType.NOTICE.name(), r.ok() ? "OK" : r.deviceGone() ? "DEVICE_GONE" : "FAILED");
                }
                store.progress(n.id(), to.size(), ok, failed, removed);
            }
            store.progress(n.id(), to.size(), ok, failed, removed);
            store.finish(n.id(), "SENT", clock.instant());
            log.info("notice.sent id={} target={} users={} tokens={} ok={} failed={} removed={}", n.id(), n.target(), n.targetUsers(), to.size(), ok, failed, removed);
        } catch (RuntimeException ex) {
            log.warn("notice {} push failed: {}", n.id(), ex.getMessage());
            store.finish(n.id(), "FAILED", clock.instant());
        }
    }

    private boolean quiet() {
        return props.quietHours() && QuietHours.NIGHT.contains(clock.instant());
    }

    private void quietHours() {
        if (quiet()) {
            throw new ApiException(ErrorCode.USER_INVALID_STATE, "밤 10시~아침 8시(한국 시간)에는 알림을 보내지 않아요.");
        }
    }

    private static List<PushSender.Message> messages(List<String> to, String title, String body, String link, Long noticeId) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("type", NotificationType.NOTICE.name());
        if (noticeId != null) data.put("noticeId", noticeId);
        if (link != null) data.put("link", link);
        return to.stream().map(t -> new PushSender.Message(t, title, body, data)).toList();
    }
}
