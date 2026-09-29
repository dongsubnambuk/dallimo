package com.dallimo.dallimoserver.share.domain;

/**
 * share_link.type (SHR-001~004). RUN · COURSE · CHALLENGE는 14.3장, LIVE_ROOM은 함께 달리기 초대 링크(TGT)로 더했다.
 * CHALLENGE는 도전을 보낸 사람 · 받은 사람이 만든다 (취소한 도전 제외).
 */
public enum ShareType {
    RUN, COURSE, CHALLENGE, LIVE_ROOM
}
