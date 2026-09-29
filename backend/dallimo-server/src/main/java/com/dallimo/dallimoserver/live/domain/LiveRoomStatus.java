package com.dallimo.dallimoserver.live.domain;

/** 6.3장 LiveRoomStatus. 상태 전이는 서버가 정한다 (45.1장) */
public enum LiveRoomStatus {
    WAITING, READY, RUNNING, FINISHED, CANCELED;

    public boolean beforeStart() {
        return this == WAITING || this == READY;
    }
}
