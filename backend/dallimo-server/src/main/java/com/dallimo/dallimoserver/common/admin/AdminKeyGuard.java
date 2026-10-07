package com.dallimo.dallimoserver.common.admin;

import com.dallimo.dallimoserver.common.error.ApiException;
import com.dallimo.dallimoserver.common.error.ErrorCode;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/**
 * 관리 API 요청 확인. 둘 중 하나면 통과한다 (FOUNDATION-DECISION-LOG 53 · 85항).
 * - X-Admin-Key: curl · 스크립트. 시간 차로 키를 알아내지 못하게 고정 시간 비교
 * - 관리 웹: 달리모 로그인 토큰(Bearer)의 계정 이메일이 ADMIN_EMAILS에 있고 이용 중인 계정
 * 관리 API가 모두 꺼져 있으면 404(닫힘), 권한이 없으면 403.
 */
@Component
@EnableConfigurationProperties(AdminProperties.class)
public class AdminKeyGuard {

    public static final String HEADER = "X-Admin-Key";

    /** 조치 기록(tbl_admin_audit.actor)에 남길 관리자. 관리 키면 userId가 없다 */
    public record Admin(Long userId, String nickname) {

        public String actor() {
            return userId == null ? "key" : "user:" + userId;
        }
    }

    private static final Admin KEY = new Admin(null, null);

    private final AdminProperties props;
    private final JdbcTemplate jdbc;

    public AdminKeyGuard(AdminProperties props, JdbcTemplate jdbc) {
        this.props = props;
        this.jdbc = jdbc;
    }

    public Admin check(String key) {
        if (!props.enabled()) throw new ApiException(ErrorCode.RESOURCE_NOT_FOUND);
        if (key != null && !key.isEmpty()) {
            if (!props.keyEnabled()) throw new ApiException(ErrorCode.RESOURCE_FORBIDDEN, "관리 키가 맞지 않아요.");
            byte[] expected = props.apiKey().getBytes(StandardCharsets.UTF_8);
            byte[] given = key.getBytes(StandardCharsets.UTF_8);
            if (!MessageDigest.isEqual(expected, given)) throw new ApiException(ErrorCode.RESOURCE_FORBIDDEN, "관리 키가 맞지 않아요.");
            return KEY;
        }
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth instanceof JwtAuthenticationToken jwt) {
            long userId = Long.parseLong(jwt.getToken().getSubject());
            Admin admin = jdbc.query("""
                            SELECT provider_user_id, nickname FROM tbl_user
                            WHERE id = ? AND provider = 'EMAIL' AND status = 'ACTIVE' AND deleted_at IS NULL""",
                    (rs, i) -> props.isAdminEmail(rs.getString(1)) ? new Admin(userId, rs.getString(2)) : null, userId).stream()
                    .filter(a -> a != null).findFirst().orElse(null);
            if (admin != null) return admin;
        }
        throw new ApiException(ErrorCode.RESOURCE_FORBIDDEN, "관리자 계정이 아니에요.");
    }

    /** 이 이메일이 관리자 계정인지 (관리자는 정지할 수 없게) */
    public boolean isAdminEmail(String email) {
        return props.isAdminEmail(email);
    }
}
