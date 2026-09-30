package com.dallimo.dallimoserver.activityimport.domain;

/**
 * 가져오기 결과 (tbl_activity_import.status).
 * IMPORTED: 러닝으로 저장, MERGE_CANDIDATE: 같은 시간의 달리모 기록이 있어 새로 만들지 않음(122.2장 병합 후보), FAILED: 가져오지 못함(다시 시도할 수 있다)
 */
public enum ImportStatus {
    IMPORTED, MERGE_CANDIDATE, FAILED
}
