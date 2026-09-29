package com.dallimo.dallimoserver.common.time;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;

/**
 * 40.4장: 도메인 기준 시간은 UTC Instant. 현재 시각은 이 Clock으로 얻어 테스트에서 바꿀 수 있게 한다.
 */
@Configuration(proxyBeanMethods = false)
public class TimeConfig {

    @Bean
    Clock clock() {
        return Clock.systemUTC();
    }
}
