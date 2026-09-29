package com.dallimo.dallimoserver.verification.domain;

/**
 * 검증 결과와 근거 (26.1장 verification result + evidence).
 *
 * @param matchRate     코스 경로 중 따라 달린 비율(%)
 * @param recordSeconds 공식 기록: 출발점에 가장 가까운 point부터 도착점에 가장 가까운 point까지 달린 시간, 일시정지 제외 (사용자 결정). 도착하지 못했으면 null
 * @param segmentDistanceM 출발~도착 사이 달린 거리
 */
public record VerificationResult(VerificationOutcome outcome, CheckResult start, CheckResult end, CheckResult distance,
                                 CheckResult route, CheckResult speed, Double matchRate, FailureReason failureReason,
                                 Integer recordSeconds, Integer segmentDistanceM) {
}
