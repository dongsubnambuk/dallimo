package com.dallimo.dallimoserver.common.admin;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 관리 API 키 (X-Admin-Key). 앱이 부르지 않는 운영용 API(외부 추천 코스 가져오기 · 코스 신고 검토)가 같은 키를 쓴다.
 * 비어 있으면 관리 API를 모두 닫는다(404).
 */
@ConfigurationProperties("dallimo.admin")
public record AdminProperties(String apiKey) {

    public boolean enabled() {
        return apiKey != null && !apiKey.isBlank();
    }
}
