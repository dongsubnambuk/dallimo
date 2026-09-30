package com.dallimo.dallimoserver.verification.domain;

/** tbl_run_verification.failure_reason. 앱이 사용자 문구로 바꾼다 */
public enum FailureReason {
    // 코스 경로가 없다
    COURSE_UNAVAILABLE,
    // 쓸 수 있는 GPS point가 모자라다
    GPS_INSUFFICIENT,
    // 출발점 반경 안에 들어온 적이 없다
    START_NOT_NEAR,
    // 도착점 반경에 닿지 못했다
    END_NOT_REACHED,
    // 출발~도착 사이 거리가 코스보다 많이 짧다
    DISTANCE_SHORT,
    // 코스 경로를 충분히 따라 달리지 않았다
    ROUTE_MISMATCH,
    // 사람이 낼 수 없는 속도가 이어졌다
    SPEED_ANOMALY,
    // 가져온 기록의 경로 point가 너무 성기다 (IMPORTED 정책)
    GPS_SPARSE
}
