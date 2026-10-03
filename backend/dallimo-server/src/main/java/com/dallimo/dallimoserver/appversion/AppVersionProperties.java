package com.dallimo.dallimoserver.appversion;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 강제 업데이트 (사용자 결정, 결정 로그 79항). 앱 버전이 minVersion보다 낮으면 앱이 "업데이트가 필요해요" 화면을 띄운다.
 * 비어 있으면 강제하지 않는다. 플랫폼마다 App Store · Play 스토어 주소
 */
@ConfigurationProperties("dallimo.app-version")
public record AppVersionProperties(Platform ios, Platform android) {

    public record Platform(String minVersion, String storeUrl) {
    }

    public Platform of(String platform) {
        Platform p = "android".equals(platform) ? android : ios;
        return p == null ? new Platform(null, null) : p;
    }
}
