package com.dallimo.dallimoserver.common.error;

/**
 * 도메인 · 애플리케이션 계층에서 던지는 예외. {@link GlobalExceptionHandler}가 27.1장 오류 응답으로 바꾼다.
 */
public class ApiException extends RuntimeException {

    private final ErrorCode code;
    private final transient Object details;

    public ApiException(ErrorCode code) {
        this(code, code.defaultMessage(), null);
    }

    public ApiException(ErrorCode code, String message) {
        this(code, message, null);
    }

    public ApiException(ErrorCode code, String message, Object details) {
        super(message);
        this.code = code;
        this.details = details;
    }

    public ErrorCode code() {
        return code;
    }

    public Object details() {
        return details;
    }
}
