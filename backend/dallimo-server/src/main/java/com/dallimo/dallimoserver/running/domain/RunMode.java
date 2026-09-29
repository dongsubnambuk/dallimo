package com.dallimo.dallimoserver.running.domain;

/** 6.3장 RunMode */
public enum RunMode {
    FREE, COURSE, PB, CHALLENGE, LIVE_RACE, TIME_ATTACK, TOGETHER;

    /** 코스 완주 검증 대상 (25.3장 course selected → PENDING VERIFICATION) */
    public boolean usesCourse() {
        return this == COURSE || this == PB || this == CHALLENGE;
    }
}
