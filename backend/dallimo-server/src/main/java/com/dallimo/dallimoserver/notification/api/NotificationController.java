package com.dallimo.dallimoserver.notification.api;

import com.dallimo.dallimoserver.common.web.ApiResponse;
import com.dallimo.dallimoserver.common.web.CursorPage;
import com.dallimo.dallimoserver.notification.application.NotificationService;
import com.dallimo.dallimoserver.notification.domain.NotificationType;
import com.dallimo.dallimoserver.notification.infrastructure.NotificationJdbcRepository.Row;
import com.dallimo.dallimoserver.notification.infrastructure.NotificationJdbcRepository.Settings;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;

/**
 * 7장 알림 API(GET /notifications, POST /notifications/{id}/read) + 모두 읽음 · 안 읽은 수 ·
 * Push 토큰 · 알림 설정 (명세 표에 경로 없음, backend/README 결정 사항)
 */
@RestController
public class NotificationController {

    private final NotificationService notifications;

    public NotificationController(NotificationService notifications) {
        this.notifications = notifications;
    }

    /** link: 누르면 열 앱 안 경로 */
    public record NotificationResponse(long id, NotificationType type, String title, String body, String link, boolean read, Instant createdAt) {
        static NotificationResponse from(Row r) {
            return new NotificationResponse(r.id(), r.type(), r.title(), r.body(), r.link(), r.readAt() != null, r.createdAt());
        }
    }

    public record UnreadCount(int count) {
    }

    /** Expo Push 토큰. platform: ios · android */
    public record PushTokenRequest(@NotBlank @Size(max = 255) String token, @NotBlank @Pattern(regexp = "ios|android") String platform) {
    }

    /** 종류별 Push: friend(친구 요청), live(함께 달리기 초대 · 취소), record(친구가 내 기록을 넘음) */
    public record SettingsBody(@NotNull Boolean friend, @NotNull Boolean live, @NotNull Boolean record) {
        static SettingsBody from(Settings s) {
            return new SettingsBody(s.friend(), s.live(), s.record());
        }
    }

    @GetMapping("/api/v1/notifications")
    public ApiResponse<CursorPage<NotificationResponse>> list(@AuthenticationPrincipal Jwt jwt, @RequestParam(required = false) String cursor,
                                                              @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size) {
        CursorPage<Row> page = notifications.page(userId(jwt), cursor, size);
        return ApiResponse.ok(new CursorPage<>(page.items().stream().map(NotificationResponse::from).toList(), page.nextCursor(), page.hasNext()));
    }

    @PostMapping("/api/v1/notifications/{id}/read")
    public ResponseEntity<Void> read(@AuthenticationPrincipal Jwt jwt, @PathVariable long id) {
        notifications.read(userId(jwt), id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/api/v1/notifications/read-all")
    public ResponseEntity<Void> readAll(@AuthenticationPrincipal Jwt jwt) {
        notifications.readAll(userId(jwt));
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/api/v1/notifications/unread-count")
    public ApiResponse<UnreadCount> unread(@AuthenticationPrincipal Jwt jwt) {
        return ApiResponse.ok(new UnreadCount(notifications.unread(userId(jwt))));
    }

    /** 이 기기(로그인 세션의 기기)의 Push 토큰을 등록한다. 같은 토큰을 다시 보내도 결과가 같다 */
    @PutMapping("/api/v1/users/me/push-token")
    public ResponseEntity<Void> registerToken(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody PushTokenRequest req) {
        notifications.registerToken(userId(jwt), sessionId(jwt), req.token(), req.platform());
        return ResponseEntity.noContent().build();
    }

    /** 알림 권한을 끄면 이 기기 토큰을 지운다 */
    @DeleteMapping("/api/v1/users/me/push-token")
    public ResponseEntity<Void> unregisterToken(@AuthenticationPrincipal Jwt jwt) {
        notifications.unregisterSession(userId(jwt), sessionId(jwt));
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/api/v1/users/me/notification-settings")
    public ApiResponse<SettingsBody> settings(@AuthenticationPrincipal Jwt jwt) {
        return ApiResponse.ok(SettingsBody.from(notifications.settings(userId(jwt))));
    }

    @PutMapping("/api/v1/users/me/notification-settings")
    public ApiResponse<SettingsBody> saveSettings(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody SettingsBody req) {
        return ApiResponse.ok(SettingsBody.from(notifications.saveSettings(userId(jwt), new Settings(req.friend(), req.live(), req.record()))));
    }

    private static long userId(Jwt jwt) {
        return Long.parseLong(jwt.getSubject());
    }

    private static long sessionId(Jwt jwt) {
        return ((Number) jwt.getClaims().get("sid")).longValue();
    }
}
