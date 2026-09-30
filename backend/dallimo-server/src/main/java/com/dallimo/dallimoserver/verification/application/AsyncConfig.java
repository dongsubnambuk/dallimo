package com.dallimo.dallimoserver.verification.application;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.task.TaskDecorator;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

/**
 * 완주 검증을 커밋 뒤 비동기로, 남은 검증 대기를 주기적으로.
 * WebSocket 실행기가 있으면 Spring Boot 기본 실행기가 만들어지지 않아 @Async가 작업마다 새 스레드를 만들었다(SimpleAsyncTaskExecutor).
 * 그래서 @Async가 찾는 이름(taskExecutor)으로 크기가 정해진 실행기를 직접 둔다. 요청의 MDC(요청 id)를 넘긴다 (ObservabilityConfig)
 */
@Configuration
@EnableAsync
@EnableScheduling
public class AsyncConfig {

    // 검증 · Push 보내기. 값은 명세에 없어 정한 시작값 (backend/README 결정 사항)
    static final int CORE = 2;
    static final int MAX = 8;
    static final int QUEUE = 500;

    @Bean(name = "taskExecutor")
    ThreadPoolTaskExecutor taskExecutor(TaskDecorator mdcTaskDecorator) {
        ThreadPoolTaskExecutor e = new ThreadPoolTaskExecutor();
        e.setThreadNamePrefix("async-");
        e.setCorePoolSize(CORE);
        e.setMaxPoolSize(MAX);
        e.setQueueCapacity(QUEUE);
        e.setTaskDecorator(mdcTaskDecorator);
        // 끄는 동안 하던 검증은 마친다 (못 마친 검증은 다음 실행의 주기 재검사가 다시 찾는다)
        e.setWaitForTasksToCompleteOnShutdown(true);
        e.setAwaitTerminationSeconds(20);
        return e;
    }
}
