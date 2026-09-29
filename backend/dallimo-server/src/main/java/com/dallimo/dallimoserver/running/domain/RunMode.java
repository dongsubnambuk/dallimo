package com.dallimo.dallimoserver.running.domain;

/** 6.3장 RunMode. INTERVAL: 인터벌 달리기 (125장 TRAINING의 내부 Mode INTERVAL) */
public enum RunMode {
    FREE, COURSE, PB, CHALLENGE, LIVE_RACE, TIME_ATTACK, TOGETHER, INTERVAL;

    /** 코스 완주 검증 대상 (25.3장 course selected → PENDING VERIFICATION) */
    public boolean usesCourse() {
        return this == COURSE || this == PB || this == CHALLENGE;
    }
}
