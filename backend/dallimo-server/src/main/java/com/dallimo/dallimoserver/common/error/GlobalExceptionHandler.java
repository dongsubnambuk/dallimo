package com.dallimo.dallimoserver.common.error;

import com.dallimo.dallimoserver.common.web.ApiResponse;
import com.dallimo.dallimoserver.common.observability.ServerErrorRecorder;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.springframework.beans.factory.ObjectProvider;
import org.slf4j.LoggerFactory;
import org.springframework.beans.TypeMismatchException;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;

import java.util.List;

/**
 * 모든 오류를 27.1장 모양({ success:false, data:null, error:{code,message,details}, timestamp })으로 바꾼다.
 * 예상하지 못한 오류는 내부 메시지를 내보내지 않는다 (33장 보안).
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    // 처리하지 못한 오류를 관리 웹 모니터링에 남긴다 (FOUNDATION-DECISION-LOG 87항). 웹 계층만 띄운 테스트(@WebMvcTest)에는 없다
    private final ObjectProvider<ServerErrorRecorder> errors;

    public GlobalExceptionHandler(ObjectProvider<ServerErrorRecorder> errors) {
        this.errors = errors;
    }

    /** 요청 본문 필드 검증 실패. details에 어떤 필드가 왜 틀렸는지 담는다 */
    public record FieldViolation(String field, String reason) {
    }

    @ExceptionHandler(ApiException.class)
    ResponseEntity<ApiResponse<Void>> handleApi(ApiException e) {
        return respond(e.code().status(), e.code(), e.getMessage(), e.details());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiResponse<Void>> handleInvalidBody(MethodArgumentNotValidException e) {
        List<FieldViolation> violations = e.getBindingResult().getFieldErrors().stream()
                .map(GlobalExceptionHandler::toViolation)
                .toList();
        return respond(ErrorCode.VALIDATION_ERROR.status(), ErrorCode.VALIDATION_ERROR, ErrorCode.VALIDATION_ERROR.defaultMessage(), violations);
    }

    @ExceptionHandler(HandlerMethodValidationException.class)
    ResponseEntity<ApiResponse<Void>> handleInvalidParameter(HandlerMethodValidationException e) {
        List<FieldViolation> violations = e.getParameterValidationResults().stream()
                .flatMap(r -> r.getResolvableErrors().stream()
                        .map(err -> new FieldViolation(r.getMethodParameter().getParameterName(), err.getDefaultMessage())))
                .toList();
        return respond(ErrorCode.VALIDATION_ERROR.status(), ErrorCode.VALIDATION_ERROR, ErrorCode.VALIDATION_ERROR.defaultMessage(), violations);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<ApiResponse<Void>> handleUnreadable(HttpMessageNotReadableException e) {
        return respond(ErrorCode.VALIDATION_ERROR.status(), ErrorCode.VALIDATION_ERROR, "요청 본문을 읽을 수 없어요.", null);
    }

    /** 올린 파일이 너무 큼 (spring.servlet.multipart.max-file-size). 413 그대로 */
    @ExceptionHandler(org.springframework.web.multipart.MaxUploadSizeExceededException.class)
    ResponseEntity<ApiResponse<Void>> handleTooLarge(org.springframework.web.multipart.MaxUploadSizeExceededException e) {
        return respond(org.springframework.http.HttpStatus.CONTENT_TOO_LARGE, ErrorCode.VALIDATION_ERROR, "파일은 5MB까지 올릴 수 있어요.", null);
    }

    /** 경로 · 쿼리 값 형식이 틀림 (예: 숫자 id 자리에 문자) */
    @ExceptionHandler(TypeMismatchException.class)
    ResponseEntity<ApiResponse<Void>> handleTypeMismatch(TypeMismatchException e) {
        String field = e.getPropertyName() != null ? e.getPropertyName() : "value";
        return respond(ErrorCode.VALIDATION_ERROR.status(), ErrorCode.VALIDATION_ERROR, ErrorCode.VALIDATION_ERROR.defaultMessage(),
                List.of(new FieldViolation(field, "형식이 올바르지 않아요.")));
    }

    /**
     * 그 밖의 Spring MVC 오류(없는 주소, 지원하지 않는 메서드, 잘못된 파라미터 형식 등)는 원래 HTTP 상태를 유지하고
     * 404는 RESOURCE_NOT_FOUND, 나머지 4xx는 VALIDATION_ERROR로 알린다. 그 밖은 INTERNAL_ERROR.
     */
    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiResponse<Void>> handleOther(Exception e, HttpServletRequest request) {
        if (e instanceof ErrorResponse er) {
            HttpStatusCode status = er.getStatusCode();
            if (status.value() == 404) {
                return respond(status, ErrorCode.RESOURCE_NOT_FOUND, ErrorCode.RESOURCE_NOT_FOUND.defaultMessage(), null);
            }
            if (status.is4xxClientError()) {
                return respond(status, ErrorCode.VALIDATION_ERROR, ErrorCode.VALIDATION_ERROR.defaultMessage(), null);
            }
        }
        log.error("Unhandled exception", e);
        errors.ifAvailable(r -> r.record(e, request));
        return respond(ErrorCode.INTERNAL_ERROR.status(), ErrorCode.INTERNAL_ERROR, ErrorCode.INTERNAL_ERROR.defaultMessage(), null);
    }

    private static FieldViolation toViolation(FieldError error) {
        return new FieldViolation(error.getField(), error.getDefaultMessage());
    }

    private static ResponseEntity<ApiResponse<Void>> respond(HttpStatusCode status, ErrorCode code, String message, Object details) {
        return ResponseEntity.status(status).body(ApiResponse.fail(code, message, details));
    }
}
