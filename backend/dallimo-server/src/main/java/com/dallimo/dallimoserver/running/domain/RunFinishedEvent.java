package com.dallimo.dallimoserver.running.domain;

/** 코스 러닝이 끝나 완주 검증을 기다린다. 커밋 뒤 검증이 받는다 (12.4장 비동기 처리) */
public record RunFinishedEvent(long runId) {
}
