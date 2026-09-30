package com.dallimo.dallimoserver.externalcourse.infrastructure;

import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.net.http.HttpClient;
import java.time.Duration;

/** 외부 공개 API 호출용 RestClient. 느린 공용 서버가 요청 스레드를 오래 잡지 않게 시간 제한을 둔다 */
final class ExternalHttp {

    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(10);

    private ExternalHttp() {
    }

    static RestClient client(String userAgent, Duration readTimeout) {
        HttpClient http = HttpClient.newBuilder().connectTimeout(CONNECT_TIMEOUT).followRedirects(HttpClient.Redirect.NORMAL).build();
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(http);
        factory.setReadTimeout(readTimeout);
        return RestClient.builder().requestFactory(factory).defaultHeader("User-Agent", userAgent).build();
    }
}
