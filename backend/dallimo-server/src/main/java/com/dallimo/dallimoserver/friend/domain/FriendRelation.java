package com.dallimo.dallimoserver.friend.domain;

/** 보는 사람 기준 관계: 친구 · 내가 요청함 · 나에게 요청함 · 없음 */
public enum FriendRelation {
    NONE, FRIEND, SENT, RECEIVED
}
