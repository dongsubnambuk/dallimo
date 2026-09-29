package com.dallimo.dallimoserver.verification.application;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

/** 완주 검증을 커밋 뒤 비동기로, 남은 검증 대기를 주기적으로 (Spring Boot 기본 실행기) */
@Configuration
@EnableAsync
@EnableScheduling
public class AsyncConfig {
}
