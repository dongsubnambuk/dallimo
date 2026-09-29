package com.dallimo.dallimoserver.notification.application;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Push 발송 설정 (dallimo.push).
 *
 * @param provider          expo: Expo Push API로 보낸다, log: 보내지 않고 로그만 (로컬 · 테스트)
 * @param expoUrl           Expo Push 발송 주소
 * @param expoAccessToken   Expo "Enhanced push security"를 켰을 때의 access token (환경변수, 저장소에 넣지 않는다)
 * @param quietHours        밤 10시~아침 8시(한국 시간)에는 Push를 보내지 않는다
 */
@ConfigurationProperties("dallimo.push")
public record NotificationProperties(String provider, String expoUrl, String expoAccessToken, Boolean quietHours) {

    public NotificationProperties {
        if (provider == null || provider.isBlank()) provider = "expo";
        if (expoUrl == null || expoUrl.isBlank()) expoUrl = "https://exp.host/--/api/v2/push/send";
        if (quietHours == null) quietHours = true;
    }
}
