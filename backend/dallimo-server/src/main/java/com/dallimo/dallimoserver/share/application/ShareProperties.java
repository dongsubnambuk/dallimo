package com.dallimo.dallimoserver.share.application;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * dallimo.share.*
 *
 * @param publicBaseUrl 공유 URL 앞부분 (예: https://dallimo.app). 비어 있으면 요청이 들어온 서버 주소를 쓴다
 * @param webAppUrl     개발용: 웹으로 띄운 앱 주소(예: http://localhost:8081). 있으면 공유 페이지에 "웹에서 열기"를 보여준다
 */
@ConfigurationProperties(prefix = "dallimo.share")
public record ShareProperties(String publicBaseUrl, String webAppUrl) {
}
