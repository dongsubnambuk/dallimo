package com.dallimo.dallimoserver.running.domain;

/** 9.3 · 25.3장 Run 상태. RUNNING ↔ PAUSED → FINISHING → FINISHED */
public enum RunStatus {
    RUNNING, PAUSED, FINISHING, FINISHED, CANCELED;

    /** point를 더 받을 수 있는 상태 (42.3장: FINISHED · CANCELED에는 새 point를 받지 않는다) */
    public boolean acceptsPoints() {
        return this == RUNNING || this == PAUSED || this == FINISHING;
    }
}
