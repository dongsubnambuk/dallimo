package com.dallimo.dallimoserver.common.web;

import com.dallimo.dallimoserver.common.error.ErrorCode;

import java.time.Instant;

/**
 * 명세 7.1장 공통 응답. 성공이면 data, 실패면 error만 채운다.
 * timestamp는 ISO-8601(UTC)로 나간다 (40.4장).
 */
public record ApiResponse<T>(boolean success, T data, ApiError error, Instant timestamp) {

    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(true, data, null, Instant.now());
    }

    public static ApiResponse<Void> fail(ErrorCode code, String message, Object details) {
        return new ApiResponse<>(false, null, new ApiError(code.name(), message, details), Instant.now());
    }

    /** 27.1장 오류 모델 */
    public record ApiError(String code, String message, Object details) {
    }
}
