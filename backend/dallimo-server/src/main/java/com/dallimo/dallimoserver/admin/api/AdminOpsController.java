package com.dallimo.dallimoserver.admin.api;

import com.dallimo.dallimoserver.admin.application.AdminMonitoringService;
import com.dallimo.dallimoserver.admin.application.NoticeService;
import com.dallimo.dallimoserver.admin.infrastructure.NoticeJdbcRepository.Notice;
import com.dallimo.dallimoserver.admin.infrastructure.NoticeJdbcRepository.Target;
import com.dallimo.dallimoserver.common.admin.AdminKeyGuard;
import com.dallimo.dallimoserver.common.web.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 관리 웹 2단계 (FOUNDATION-DECISION-LOG 87항): 성능 모니터링 · 서버 오류 · 공지 푸시. 관리자 계정(Bearer) 또는 X-Admin-Key (AdminKeyGuard)
 */
@RestController
@RequestMapping("/api/v1/admin")
public class AdminOpsController {

    // 누르면 열릴 앱 화면 (앱 안 경로만)
    static final String LINK = "^/[A-Za-z0-9/_-]{0,199}$";

    private final AdminMonitoringService monitoring;
    private final NoticeService notices;
    private final AdminKeyGuard admin;

    public AdminOpsController(AdminMonitoringService monitoring, NoticeService notices, AdminKeyGuard admin) {
        this.monitoring = monitoring;
        this.notices = notices;
        this.admin = admin;
    }

    public record TestRequest(@NotNull Long userId, @NotBlank @Size(max = 100) String title, @NotBlank @Size(max = 500) String body,
                              @Pattern(regexp = LINK, message = "앱 안 경로(/로 시작)만 넣을 수 있어요.") String link) {
    }

    public record SendRequest(@NotNull Target target, @NotBlank @Size(max = 100) String title, @NotBlank @Size(max = 500) String body,
                              @Pattern(regexp = LINK, message = "앱 안 경로(/로 시작)만 넣을 수 있어요.") String link,
                              @NotNull @Min(1) Integer expectedUsers) {

        public SendRequest {
            title = title == null ? null : title.trim();
            body = body == null ? null : body.trim();
            link = link == null || link.isBlank() ? null : link.trim();
        }
    }

    /** 서버 상태 · 최근 60분 API · 주요 API · 오늘 수치 */
    @GetMapping("/monitoring")
    public ApiResponse<AdminMonitoringService.Monitoring> monitoring(@RequestHeader(name = AdminKeyGuard.HEADER, required = false) String key) {
        admin.check(key);
        return ApiResponse.ok(monitoring.monitoring());
    }

    /** 처리하지 못한 서버 오류: 최근 24시간 수, days일 동안 종류별, 최근 50건 */
    @GetMapping("/errors")
    public ApiResponse<AdminMonitoringService.Errors> errors(@RequestHeader(name = AdminKeyGuard.HEADER, required = false) String key,
                                                            @RequestParam(defaultValue = "7") @Min(1) @Max(30) int days) {
        admin.check(key);
        return ApiResponse.ok(monitoring.errors(days));
    }

    /** 받을 회원 수 · 기기 수 */
    @GetMapping("/notices/audience")
    public ApiResponse<NoticeService.AudienceView> audience(@RequestHeader(name = AdminKeyGuard.HEADER, required = false) String key,
                                          @RequestParam(defaultValue = "ALL") Target target) {
        admin.check(key);
        return ApiResponse.ok(notices.audience(target));
    }

    @GetMapping("/notices")
    public ApiResponse<List<Notice>> list(@RequestHeader(name = AdminKeyGuard.HEADER, required = false) String key) {
        admin.check(key);
        return ApiResponse.ok(notices.recent());
    }

    @GetMapping("/notices/{id}")
    public ApiResponse<Notice> get(@RequestHeader(name = AdminKeyGuard.HEADER, required = false) String key, @PathVariable long id) {
        admin.check(key);
        return ApiResponse.ok(notices.get(id));
    }

    /** 회원 한 명의 기기로 테스트 Push (알림함에는 남기지 않는다) */
    @PostMapping("/notices/test")
    public ApiResponse<NoticeService.TestResult> test(@RequestHeader(name = AdminKeyGuard.HEADER, required = false) String key,
                                                      @Valid @RequestBody TestRequest req) {
        admin.check(key);
        return ApiResponse.ok(notices.test(req.userId(), req.title().trim(), req.body().trim(), req.link() == null || req.link().isBlank() ? null : req.link()));
    }

    /** 공지 보내기. expectedUsers: 화면에서 확인한 대상 수 (그 사이 바뀌었으면 409) */
    @PostMapping("/notices")
    public ApiResponse<Notice> send(@RequestHeader(name = AdminKeyGuard.HEADER, required = false) String key, @Valid @RequestBody SendRequest req) {
        AdminKeyGuard.Admin a = admin.check(key);
        return ApiResponse.ok(notices.send(a, req.target(), req.title(), req.body(), req.link(), req.expectedUsers()));
    }
}
