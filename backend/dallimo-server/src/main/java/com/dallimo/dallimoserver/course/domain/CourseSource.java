package com.dallimo.dallimoserver.course.domain;

/**
 * 코스를 어디서 만들었나 (V15). USER는 사용자가 자기 기록으로 등록한 코스(43.1장),
 * 나머지는 외부 공개 데이터로 만든 달리모 추천 코스 (FOUNDATION-DECISION-LOG 52항).
 */
public enum CourseSource {
    USER, OSM, DURUNUBI, GPX;

    public boolean external() {
        return this != USER;
    }
}
