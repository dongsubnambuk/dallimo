package com.dallimo.dallimoserver.live.domain;

/** 방 상태가 바뀐 뒤(커밋 뒤) 실시간 채널이 받는 이벤트 */
public final class LiveRoomEvents {

    private LiveRoomEvents() {
    }

    /** 서버가 방을 출발시켰다 (45.1장) */
    public record Started(long roomId) {
    }

    /** 달리는 중 참가자가 나갔다 → DNF (TGT-011) */
    public record Left(long roomId, long userId) {
    }
}
