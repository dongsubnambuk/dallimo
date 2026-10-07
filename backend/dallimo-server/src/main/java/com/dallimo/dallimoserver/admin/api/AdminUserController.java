package com.dallimo.dallimoserver.admin.api;

import com.dallimo.dallimoserver.admin.application.AdminUserService;
import com.dallimo.dallimoserver.admin.infrastructure.AdminUserJdbcRepository.UserRow;
import com.dallimo.dallimoserver.common.admin.AdminKeyGuard;
import com.dallimo.dallimoserver.common.web.ApiResponse;
import com.dallimo.dallimoserver.common.web.CursorPage;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
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

/**
 * 관리 웹 회원 조회 · 정지 (FOUNDATION-DECISION-LOG 85항). 관리자 계정(Bearer) 또는 X-Admin-Key (AdminKeyGuard)
 */
@RestController
@RequestMapping("/api/v1/admin")
public class AdminUserController {

    private final AdminUserService service;
    private final AdminKeyGuard admin;

    public AdminUserController(AdminUserService service, AdminKeyGuard admin) {
        this.service = service;
        this.admin = admin;
    }

    /** 관리 웹 로그인 확인: 이 계정이 관리자인지. 관리 키로 부르면 userId · nickname이 없다 */
    public record MeResponse(Long userId, String nickname) {
    }

    public record ActionRequest(@NotBlank @Size(max = 500) String reason) {

        public ActionRequest {
            reason = reason == null ? null : reason.trim();
        }
    }

    public record ActionResponse(long userId, String status) {
    }

    @GetMapping("/me")
    public ApiResponse<MeResponse> me(@RequestHeader(name = AdminKeyGuard.HEADER, required = false) String key) {
        AdminKeyGuard.Admin a = admin.check(key);
        return ApiResponse.ok(new MeResponse(a.userId(), a.nickname()));
    }

    /** 최근 가입 순. q: 회원 id · 이메일 · 닉네임 */
    @GetMapping("/users")
    public ApiResponse<CursorPage<UserRow>> users(@RequestHeader(name = AdminKeyGuard.HEADER, required = false) String key,
                                                  @RequestParam(required = false) @Size(max = 100) String q,
                                                  @RequestParam(required = false) @Pattern(regexp = "ACTIVE|SUSPENDED|WITHDRAWN") String status,
                                                  @RequestParam(required = false) String cursor,
                                                  @RequestParam(defaultValue = "30") @Min(1) @Max(100) int size) {
        admin.check(key);
        return ApiResponse.ok(service.search(q, status, cursor, size));
    }

    @GetMapping("/users/{userId}")
    public ApiResponse<AdminUserService.Detail> user(@RequestHeader(name = AdminKeyGuard.HEADER, required = false) String key,
                                                     @PathVariable long userId) {
        admin.check(key);
        return ApiResponse.ok(service.detail(userId));
    }

    /** 이용 정지: 모든 기기에서 로그아웃되고 다시 로그인할 수 없다. 사유는 조치 기록에 남는다 */
    @PostMapping("/users/{userId}/suspend")
    public ApiResponse<ActionResponse> suspend(@RequestHeader(name = AdminKeyGuard.HEADER, required = false) String key,
                                               @PathVariable long userId, @Valid @RequestBody ActionRequest req) {
        AdminKeyGuard.Admin a = admin.check(key);
        return ApiResponse.ok(new ActionResponse(userId, service.suspend(a, userId, req.reason())));
    }

    @PostMapping("/users/{userId}/unsuspend")
    public ApiResponse<ActionResponse> unsuspend(@RequestHeader(name = AdminKeyGuard.HEADER, required = false) String key,
                                                 @PathVariable long userId, @Valid @RequestBody ActionRequest req) {
        AdminKeyGuard.Admin a = admin.check(key);
        return ApiResponse.ok(new ActionResponse(userId, service.unsuspend(a, userId, req.reason())));
    }
}
