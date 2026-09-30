package com.dallimo.dallimoserver.activity.domain;

/**
 * SCR-M06 행동형 친구 활동: PB · 코스 등록 · Challenge · 랭킹 이벤트.
 * PB: 코스 첫 공식 기록 또는 PB 갱신, WEEKLY_TOP: 이번 주 코스 3위 안에 들어가거나 순위를 올림.
 * CROWN · LEGEND (124장): 이 기록으로 코스 크라운 · 로컬 레전드를 새로 가짐 (최근 90일).
 */
public enum ActivityType {
    PB, COURSE_CREATED, CHALLENGE_WON, WEEKLY_TOP, CROWN, LEGEND
}
