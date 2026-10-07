package com.dallimo.dallimoserver.common.admin;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;
import java.util.Locale;

/**
 * 관리 API 접근 (AdminKeyGuard).
 *
 * @param apiKey 관리 API 키 (X-Admin-Key). curl · 스크립트용. 외부 추천 코스 가져오기 · 코스 신고 검토 · 관리 웹 API가 같은 키를 쓴다
 * @param emails 관리 웹에 로그인할 수 있는 달리모 계정 이메일 (FOUNDATION-DECISION-LOG 85항). DB를 고치지 않고 환경변수로 정한다
 *               <p>
 *               둘 다 비어 있으면 관리 API를 모두 닫는다(404).
 */
@ConfigurationProperties("dallimo.admin")
public record AdminProperties(String apiKey, List<String> emails) {

    public AdminProperties {
        emails = emails == null ? List.of() : emails.stream()
                .filter(e -> e != null && !e.isBlank())
                .map(e -> e.trim().toLowerCase(Locale.ROOT))
                .toList();
    }

    public boolean keyEnabled() {
        return apiKey != null && !apiKey.isBlank();
    }

    public boolean enabled() {
        return keyEnabled() || !emails.isEmpty();
    }

    public boolean isAdminEmail(String email) {
        return email != null && emails.contains(email.toLowerCase(Locale.ROOT));
    }
}
