package com.dallimo.dallimoserver.verification.domain;

/** 검사 하나의 결과. 앞 검사가 실패해 계산할 수 없으면 SKIPPED */
public enum CheckResult {
    PASS, FAIL, SKIPPED
}
