package com.dallimo.dallimoserver.course.domain;

/** 6.3장 CourseStatus. HIDDEN · BLOCKED는 목록 · 상세에 보이지 않는다 */
public enum CourseStatus {
    NEW, VERIFIED, POPULAR, HIDDEN, BLOCKED;

    public boolean viewable() {
        return this != HIDDEN && this != BLOCKED;
    }
}
