package com.dallimo.dallimoserver.share.application;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

/**
 * dallimo.share.*
 *
 * @param publicBaseUrl 공유 URL 앞부분 (예: https://dallimo.app). 비어 있으면 요청이 들어온 서버 주소를 쓴다
 * @param webAppUrl     개발용: 웹으로 띄운 앱 주소(예: http://localhost:8081). 있으면 공유 페이지에 "웹에서 열기"를 보여준다
 * @param appLinks      App Link · Universal Link: 앱이 깔려 있으면 공유 페이지 주소를 앱이 바로 연다 (배포 단계에서 값을 넣는다)
 */
@ConfigurationProperties(prefix = "dallimo.share")
public record ShareProperties(String publicBaseUrl, String webAppUrl, AppLinks appLinks) {

    public ShareProperties {
        appLinks = appLinks == null ? new AppLinks(List.of(), null, List.of()) : appLinks;
    }

    /**
     * @param iosAppIds             "팀ID.번들ID" (apple-app-site-association appIDs)
     * @param androidPackage        안드로이드 패키지 이름
     * @param androidSha256         서명 인증서 SHA-256 (assetlinks.json)
     */
    public record AppLinks(List<String> iosAppIds, String androidPackage, List<String> androidSha256) {

        public AppLinks {
            iosAppIds = iosAppIds == null ? List.of() : iosAppIds;
            androidSha256 = androidSha256 == null ? List.of() : androidSha256;
        }
    }
}
