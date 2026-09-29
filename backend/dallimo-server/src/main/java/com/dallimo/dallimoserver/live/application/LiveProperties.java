package com.dallimo.dallimoserver.live.application;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

/**
 * dallimo.live.* 실시간 경쟁 정책. 명세(8.4 · 10.5장)는 값을 테스트로 정하라고 하므로 시작값이다.
 *
 * @param presenceTimeout 마지막 상태 · heartbeat 뒤 이만큼 소식이 없으면 연결 끊김(DISCONNECTED)으로 보인다 (30.4장, Run은 계속)
 * @param raceGrace       레이스 · 함께(거리): 첫 완주자 뒤 이만큼 지나면 남은 사람은 DNF로 방을 끝낸다 (사용자 결정 30분)
 * @param timeGrace       타임 어택 · 함께(시간): 목표 시간 뒤 이만큼 기다렸다 끝낸다 (사용자 결정 5분)
 * @param maxDuration     아무도 끝내지 않아도 출발 뒤 이만큼 지나면 끝낸다 (안전장치)
 * @param finishedTtl     끝난 방의 Redis 상태 보관 시간 (47.1장 짧은 복구용 TTL)
 * @param sweepInterval   연결 끊김 · 방 종료를 확인하는 주기
 */
@ConfigurationProperties(prefix = "dallimo.live")
public record LiveProperties(Duration presenceTimeout, Duration raceGrace, Duration timeGrace, Duration maxDuration,
                             Duration finishedTtl, Duration sweepInterval) {

    public LiveProperties {
        if (presenceTimeout == null) presenceTimeout = Duration.ofSeconds(15);
        if (raceGrace == null) raceGrace = Duration.ofMinutes(30);
        if (timeGrace == null) timeGrace = Duration.ofMinutes(5);
        if (maxDuration == null) maxDuration = Duration.ofHours(6);
        if (finishedTtl == null) finishedTtl = Duration.ofHours(1);
        if (sweepInterval == null) sweepInterval = Duration.ofSeconds(5);
    }
}
