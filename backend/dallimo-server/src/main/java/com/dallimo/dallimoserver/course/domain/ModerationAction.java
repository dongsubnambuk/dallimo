package com.dallimo.dallimoserver.course.domain;

/**
 * 코스 신고 처리 기록 (V16 tbl_course_moderation). FOUNDATION-DECISION-LOG 53항
 * AUTO_HIDE: 신고가 쌓여 자동으로 숨김. HIDE · BLOCK · RESTORE: 관리자 검토
 */
public enum ModerationAction {
    AUTO_HIDE, HIDE, BLOCK, RESTORE
}
