package com.dallimo.dallimoserver.common.admin;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 관리 API 키 (X-Admin-Key). curl · 스크립트용. 외부 추천 코스 가져오기 · 코스 신고 검토 · 관리 웹 API가 같은 키를 쓴다.
 * 비어 있으면 키로는 부를 수 없다. 관리 웹은 키 대신 관리자 계정으로 부른다 (FOUNDATION-DECISION-LOG 86항)
 */
@ConfigurationProperties("dallimo.admin")
public record AdminProperties(String apiKey) {

    public boolean keyEnabled() {
        return apiKey != null && !apiKey.isBlank();
    }
}
