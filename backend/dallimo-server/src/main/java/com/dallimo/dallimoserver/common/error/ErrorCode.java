package com.dallimo.dallimoserver.common.error;

import org.springframework.http.HttpStatus;

/**
 * 명세 27.1장 오류 코드. 앱(frontend `shared/api/contract.ts`의 ApiErrorCode)과 같은 이름을 쓴다.
 */
public enum ErrorCode {
    VALIDATION_ERROR(HttpStatus.BAD_REQUEST, "요청 값을 확인해 주세요."),
    AUTH_REQUIRED(HttpStatus.UNAUTHORIZED, "로그인이 필요해요."),
    TOKEN_EXPIRED(HttpStatus.UNAUTHORIZED, "로그인이 만료됐어요."),
    RESOURCE_FORBIDDEN(HttpStatus.FORBIDDEN, "접근 권한이 없어요."),
    // 이메일 로그인(사용자 결정, 명세 41장 변경)에서 더한 코드
    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "이메일 또는 비밀번호가 맞지 않아요."),
    EMAIL_ALREADY_EXISTS(HttpStatus.CONFLICT, "이미 가입한 이메일이에요."),
    NICKNAME_ALREADY_EXISTS(HttpStatus.CONFLICT, "이미 쓰고 있는 닉네임이에요."),
    // 명세 표에는 없는 코드. 없는 주소처럼 도메인 코드가 없는 404에 쓴다 (backend/README 결정 사항)
    RESOURCE_NOT_FOUND(HttpStatus.NOT_FOUND, "찾을 수 없어요."),
    RUN_NOT_FOUND(HttpStatus.NOT_FOUND, "러닝 기록을 찾을 수 없어요."),
    COURSE_NOT_FOUND(HttpStatus.NOT_FOUND, "코스를 찾을 수 없어요."),
    RUN_INVALID_STATE(HttpStatus.CONFLICT, "현재 상태에서는 처리할 수 없어요."),
    IDEMPOTENCY_CONFLICT(HttpStatus.CONFLICT, "같은 요청 키로 다른 내용이 들어왔어요."),
    RUN_POINT_INVALID(HttpStatus.UNPROCESSABLE_CONTENT, "처리할 수 없는 GPS 기록이에요."),
    RATE_LIMITED(HttpStatus.TOO_MANY_REQUESTS, "요청이 너무 많아요. 잠시 뒤 다시 시도해 주세요."),
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "일시적인 오류가 발생했어요.");

    private final HttpStatus status;
    private final String defaultMessage;

    ErrorCode(HttpStatus status, String defaultMessage) {
        this.status = status;
        this.defaultMessage = defaultMessage;
    }

    public HttpStatus status() {
        return status;
    }

    public String defaultMessage() {
        return defaultMessage;
    }
}
