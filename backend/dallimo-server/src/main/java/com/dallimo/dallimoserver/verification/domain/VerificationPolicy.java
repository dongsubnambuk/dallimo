package com.dallimo.dallimoserver.verification.domain;

import java.time.Duration;

/**
 * 코스 완주 검증 기준 (10.5장 정책값). 명세 값은 "후보"라 실기기 테스트 뒤 조정한다.
 * 값을 바꾸면 version도 바꿔 결과마다 어떤 기준으로 판정했는지 남긴다 (26.4장 policy_version).
 *
 * @param startRadiusM      출발점 반경 (course.start_radius_m, 명세 후보 약 100m)
 * @param endRadiusM        도착점 반경 (course.end_radius_m, 명세 후보 약 100m)
 * @param matchBufferM      경로에서 이만큼 안이면 코스를 따라 달린 것으로 본다 (course.match_buffer_m, 명세 후보 약 50m)
 * @param minMatchRate      코스 경로 중 따라 달린 비율 최소값 (course.minimum_match_rate, 명세 후보 80~90%)
 * @param minDistanceRatio  출발~도착 사이 달린 거리가 코스 거리의 이 비율 이상 (명세에 값 없음)
 * @param endMinProgress    출발 뒤 코스 거리의 이 비율 이상 달린 다음부터 도착으로 본다. 출발 = 도착인 루프 · 왕복 코스에서 출발하자마자 도착으로 보지 않게 (명세에 값 없음)
 * @param maxSustainedSpeedMps 이 속도로 speedWindow 이상 이어지면 사람이 달린 기록이 아니라고 본다 (명세에 값 없음)
 * @param maxMedianGapSec   출발~도착 구간 point 간격의 가운데 값이 이보다 크면 경로가 너무 성겨 판정하지 않는다 (가져온 기록용, 명세에 값 없음)
 */
public record VerificationPolicy(String version, double startRadiusM, double endRadiusM, double matchBufferM, double minMatchRate,
                                 double minDistanceRatio, double endMinProgress, double maxSustainedSpeedMps, Duration speedWindow,
                                 double maxMedianGapSec) {

    public static final VerificationPolicy CURRENT = new VerificationPolicy(
            "2026-09-v1", 100, 100, 50, 85, 0.9, 0.5, 7.0, Duration.ofSeconds(30), Double.MAX_VALUE);

    /**
     * 122.1장 "추가 검증 후 가능": 건강 앱에서 가져온 기록 (APPLE_HEALTH · HEALTH_CONNECT).
     * 달리모 앱이 직접 잰 기록보다 따라 달린 비율을 더 높게(90%) 보고, point가 성긴(가운데 간격 5초 초과) 경로는 인정하지 않는다
     */
    public static final VerificationPolicy IMPORTED = new VerificationPolicy(
            "2026-09-imp-v1", 100, 100, 50, 90, 0.9, 0.5, 7.0, Duration.ofSeconds(30), 5);
}
