package com.dallimo.dallimoserver.common.ratelimit;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

/**
 * 요청 제한 (명세 27장 RATE_LIMITED, "Rate limit 대상 후보: 로그인, 사용자 검색, 친구 요청, share resolve, WebSocket connect").
 * 한 창(window) 안에 허용하는 요청 수. 값은 명세에 없어 정한 시작값 (backend/README 결정 사항).
 */
@ConfigurationProperties("dallimo.rate-limit")
public record RateLimitProperties(Boolean enabled, Duration window, Integer login, Integer search, Integer friendRequest, Integer shareResolve,
                                  Integer wsConnect) {

    public RateLimitProperties {
        enabled = enabled == null || enabled;
        window = window == null ? Duration.ofMinutes(1) : window;
        // 로그인 · 가입 (IP마다)
        login = login == null ? 10 : login;
        // 사용자 · 코스 검색 (사람마다)
        search = search == null ? 60 : search;
        // 친구 요청 (사람마다)
        friendRequest = friendRequest == null ? 20 : friendRequest;
        // 공유 링크 해석 · 공유 페이지 (IP마다, 코드 추측 방지)
        shareResolve = shareResolve == null ? 60 : shareResolve;
        // 실시간 연결 (사람마다)
        wsConnect = wsConnect == null ? 20 : wsConnect;
    }
}
