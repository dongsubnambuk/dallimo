package com.dallimo.dallimoserver.running.domain;

import java.time.Instant;

/** tbl_run_point 한 줄 (10.1장). 원본 그대로 저장하고 거리 계산 때 품질을 판단한다 */
public record RunPoint(int seq, double latitude, double longitude, Double altitudeM, Double accuracyM, Double speedMps, Instant recordedAt) {
}
