package com.dallimo.dallimoserver.challenge.domain;

/** 6.3장 ChallengeStatus. OPEN: 만들고 아직 달리지 않음, RUNNING: Run이 이어짐, SUCCESS · FAILED: 검증 뒤 판정 */
public enum ChallengeStatus {
    OPEN, RUNNING, SUCCESS, FAILED, CANCELED
}
