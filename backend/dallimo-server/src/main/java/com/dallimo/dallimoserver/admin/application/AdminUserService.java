package com.dallimo.dallimoserver.admin.application;

import com.dallimo.dallimoserver.admin.infrastructure.AdminUserJdbcRepository;
import com.dallimo.dallimoserver.admin.infrastructure.AdminUserJdbcRepository.Account;
import com.dallimo.dallimoserver.admin.infrastructure.AdminUserJdbcRepository.CourseRow;
import com.dallimo.dallimoserver.admin.infrastructure.AdminUserJdbcRepository.Device;
import com.dallimo.dallimoserver.admin.infrastructure.AdminUserJdbcRepository.ReportRow;
import com.dallimo.dallimoserver.admin.infrastructure.AdminUserJdbcRepository.RunRow;
import com.dallimo.dallimoserver.admin.infrastructure.AdminUserJdbcRepository.Stats;
import com.dallimo.dallimoserver.admin.infrastructure.AdminUserJdbcRepository.UserRow;
import com.dallimo.dallimoserver.auth.infrastructure.RefreshSessionRepository;
import com.dallimo.dallimoserver.common.admin.AdminAuditJdbcRepository;
import com.dallimo.dallimoserver.common.admin.AdminAuditJdbcRepository.Entry;
import com.dallimo.dallimoserver.common.admin.AdminKeyGuard;
import com.dallimo.dallimoserver.common.error.ApiException;
import com.dallimo.dallimoserver.common.error.ErrorCode;
import com.dallimo.dallimoserver.common.web.CursorPage;
import com.dallimo.dallimoserver.notification.application.NotificationService;
import com.dallimo.dallimoserver.user.domain.User;
import com.dallimo.dallimoserver.user.infrastructure.UserJpaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.List;

/**
 * 관리 웹 회원 조회 · 정지 (FOUNDATION-DECISION-LOG 85항).
 * 정지: 로그인 · 토큰 갱신을 막고 모든 기기 세션과 Push 토큰을 지운다. 기록 · 코스 · 랭킹은 그대로 둔다.
 * App Store 심사 기준 1.2(회원이 올리는 콘텐츠가 있는 앱은 악성 회원을 막을 수단이 있어야 한다) 대응
 */
@Service
public class AdminUserService {

    public static final String ACTION_SUSPEND = "USER_SUSPEND";
    public static final String ACTION_UNSUSPEND = "USER_UNSUSPEND";

    public record Detail(Account account, boolean admin, Stats stats, List<Device> devices, List<RunRow> runs, List<CourseRow> courses,
                         List<ReportRow> reportsMade, List<ReportRow> reportsReceived, List<Entry> actions) {
    }

    private static final int LIST = 20;

    private final AdminUserJdbcRepository store;
    private final UserJpaRepository users;
    private final RefreshSessionRepository sessions;
    private final NotificationService notifications;
    private final AdminAuditJdbcRepository audits;
    private final AdminKeyGuard guard;
    private final Clock clock;

    public AdminUserService(AdminUserJdbcRepository store, UserJpaRepository users, RefreshSessionRepository sessions,
                            NotificationService notifications, AdminAuditJdbcRepository audits, AdminKeyGuard guard, Clock clock) {
        this.store = store;
        this.users = users;
        this.sessions = sessions;
        this.notifications = notifications;
        this.audits = audits;
        this.guard = guard;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public CursorPage<UserRow> search(String q, String status, String cursor, int size) {
        Long before = null;
        if (cursor != null && !cursor.isBlank()) {
            try {
                before = Long.parseLong(cursor);
            } catch (NumberFormatException e) {
                throw new ApiException(ErrorCode.VALIDATION_ERROR, "cursor가 올바르지 않아요.");
            }
        }
        List<UserRow> rows = store.search(q, status, before, size + 1);
        boolean more = rows.size() > size;
        List<UserRow> page = more ? rows.subList(0, size) : rows;
        return new CursorPage<>(page, more ? String.valueOf(page.get(page.size() - 1).id()) : null, more);
    }

    @Transactional(readOnly = true)
    public Detail detail(long userId) {
        Account a = store.account(userId).orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND, "회원을 찾을 수 없어요."));
        return new Detail(a, guard.isAdminEmail(a.email()), store.stats(userId), store.devices(userId), store.runs(userId, LIST),
                store.courses(userId, LIST), store.reportsMade(userId, LIST), store.reportsReceived(userId, LIST),
                audits.of(AdminAuditJdbcRepository.TARGET_USER, userId, LIST));
    }

    @Transactional
    public String suspend(AdminKeyGuard.Admin admin, long userId, String reason) {
        User u = find(userId);
        if (u.isSuspended()) throw new ApiException(ErrorCode.USER_INVALID_STATE, "이미 정지된 회원이에요.");
        if (!u.isActive()) throw new ApiException(ErrorCode.USER_INVALID_STATE, "탈퇴한 회원은 정지할 수 없어요.");
        if (guard.isAdminEmail(u.getEmail())) throw new ApiException(ErrorCode.USER_INVALID_STATE, "관리자 계정은 정지할 수 없어요.");
        Instant now = clock.instant();
        u.suspend(now);
        sessions.revokeAllOfUser(userId, now);
        notifications.forgetUser(userId);
        audits.record(admin, ACTION_SUSPEND, AdminAuditJdbcRepository.TARGET_USER, userId, reason, now);
        return u.getStatus();
    }

    @Transactional
    public String unsuspend(AdminKeyGuard.Admin admin, long userId, String reason) {
        User u = find(userId);
        if (!u.isSuspended()) throw new ApiException(ErrorCode.USER_INVALID_STATE, "정지된 회원이 아니에요.");
        Instant now = clock.instant();
        u.unsuspend(now);
        audits.record(admin, ACTION_UNSUSPEND, AdminAuditJdbcRepository.TARGET_USER, userId, reason, now);
        return u.getStatus();
    }

    private User find(long userId) {
        return users.findById(userId)
                .filter(u -> User.PROVIDER_EMAIL.equals(u.getProvider()))
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND, "회원을 찾을 수 없어요."));
    }
}
