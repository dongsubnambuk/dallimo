package com.dallimo.dallimoserver.share.api;

import com.dallimo.dallimoserver.common.web.ApiResponse;
import com.dallimo.dallimoserver.share.application.ShareProperties;
import com.dallimo.dallimoserver.share.application.ShareService;
import com.dallimo.dallimoserver.share.domain.ShareType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

/** 7장 POST /shares (SHR-001~003) · GET /shares/{code} (SHR-004, 로그인 없이) */
@RestController
@RequestMapping("/api/v1/shares")
public class ShareController {

    private final ShareService shares;
    private final ShareProperties props;

    public ShareController(ShareService shares, ShareProperties props) {
        this.shares = shares;
        this.props = props;
    }

    public record CreateShareRequest(@NotNull ShareType type, @NotNull @Positive Long referenceId) {
    }

    /** url: 메신저에서 눌리는 http(s) 주소. 서버의 공유 페이지(/s/{code})가 앱을 연다 */
    public record ShareLinkResponse(String code, String url) {
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ShareLinkResponse>> create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody CreateShareRequest req) {
        String code = shares.create(Long.parseLong(jwt.getSubject()), req.type(), req.referenceId());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(new ShareLinkResponse(code, baseUrl(props) + "/s/" + code)));
    }

    @GetMapping("/{code}")
    public ApiResponse<ShareService.Resolved> resolve(@PathVariable String code) {
        return ApiResponse.ok(shares.resolve(code));
    }

    static String baseUrl(ShareProperties props) {
        String configured = props.publicBaseUrl();
        if (configured != null && !configured.isBlank()) return configured.replaceAll("/+$", "");
        return ServletUriComponentsBuilder.fromCurrentContextPath().build().toUriString();
    }
}
