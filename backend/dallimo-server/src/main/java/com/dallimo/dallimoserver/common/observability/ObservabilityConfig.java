package com.dallimo.dallimoserver.common.observability;

import org.slf4j.MDC;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.task.TaskDecorator;

import java.util.Map;

/**
 * 비동기 작업(커밋 뒤 완주 검증 · Push 보내기)에 요청의 MDC를 넘긴다. finish 요청과 그 뒤 검증 로그가 같은 요청 id로 이어진다.
 * Spring Boot가 기본 실행기(@Async)에 이 TaskDecorator를 붙인다
 */
@Configuration(proxyBeanMethods = false)
public class ObservabilityConfig {

    @Bean
    TaskDecorator mdcTaskDecorator() {
        return task -> {
            Map<String, String> context = MDC.getCopyOfContextMap();
            return () -> {
                Map<String, String> previous = MDC.getCopyOfContextMap();
                if (context == null) MDC.clear();
                else MDC.setContextMap(context);
                try {
                    task.run();
                } finally {
                    if (previous == null) MDC.clear();
                    else MDC.setContextMap(previous);
                }
            };
        };
    }
}
