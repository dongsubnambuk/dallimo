package com.dallimo.dallimoserver.common.error;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.dallimo.dallimoserver.common.web.ApiResponse;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/** 7.1 · 27.1장 응답 모양 */
// 인증은 AuthFlowTest에서 본다. 여기서는 오류 응답 모양만 본다
@WebMvcTest(controllers = GlobalExceptionHandlerTest.ProbeController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import({GlobalExceptionHandler.class, GlobalExceptionHandlerTest.ProbeController.class})
class GlobalExceptionHandlerTest {

    @Autowired
    MockMvcTester mvc;

    @RestController
    static class ProbeController {
        record Body(@NotBlank String name, @Positive int size) {
        }

        @GetMapping("/probe/ok")
        ApiResponse<Map<String, String>> ok() {
            return ApiResponse.ok(Map.of("hello", "달리모"));
        }

        @GetMapping("/probe/run/{id}")
        ApiResponse<Void> run(@PathVariable long id) {
            throw new ApiException(ErrorCode.RUN_NOT_FOUND);
        }

        @GetMapping("/probe/state")
        ApiResponse<Void> state() {
            throw new ApiException(ErrorCode.RUN_INVALID_STATE, "현재 상태에서는 러닝을 종료할 수 없습니다.");
        }

        @PostMapping("/probe/body")
        ApiResponse<Body> body(@Valid @RequestBody Body body) {
            return ApiResponse.ok(body);
        }

        @GetMapping("/probe/boom")
        ApiResponse<Void> boom() {
            throw new IllegalStateException("secret internal detail");
        }
    }

    @Test
    void successEnvelope() {
        var r = assertThat(mvc.get().uri("/probe/ok")).hasStatusOk().bodyJson();
        r.extractingPath("$.success").isEqualTo(true);
        r.extractingPath("$.data.hello").isEqualTo("달리모");
        r.extractingPath("$.error").isNull();
        r.extractingPath("$.timestamp").asString().endsWith("Z");
    }

    @Test
    void apiExceptionUsesCodeAndStatus() {
        var r = assertThat(mvc.get().uri("/probe/run/1")).hasStatus(404).bodyJson();
        r.extractingPath("$.success").isEqualTo(false);
        r.extractingPath("$.data").isNull();
        r.extractingPath("$.error.code").isEqualTo("RUN_NOT_FOUND");

        assertThat(mvc.get().uri("/probe/state")).hasStatus(409)
                .bodyJson().extractingPath("$.error.message").isEqualTo("현재 상태에서는 러닝을 종료할 수 없습니다.");
    }

    @Test
    void validationFailureListsFields() {
        var r = assertThat(mvc.post().uri("/probe/body").contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"\",\"size\":0}"))
                .hasStatus(400).bodyJson();
        r.extractingPath("$.error.code").isEqualTo("VALIDATION_ERROR");
        r.extractingPath("$.error.details[*].field").asArray().containsExactlyInAnyOrder("name", "size");
    }

    @Test
    void malformedJsonIsValidationError() {
        assertThat(mvc.post().uri("/probe/body").contentType(MediaType.APPLICATION_JSON).content("{broken"))
                .hasStatus(400).bodyJson().extractingPath("$.error.code").isEqualTo("VALIDATION_ERROR");
    }

    @Test
    void wrongPathVariableTypeKeepsClientStatus() {
        assertThat(mvc.get().uri("/probe/run/abc"))
                .hasStatus(400).bodyJson().extractingPath("$.error.code").isEqualTo("VALIDATION_ERROR");
    }

    @Test
    void unsupportedMethodKeeps405() {
        assertThat(mvc.delete().uri("/probe/ok"))
                .hasStatus(405).bodyJson().extractingPath("$.error.code").isEqualTo("VALIDATION_ERROR");
    }

    @Test
    void unexpectedErrorHidesDetail() {
        var r = assertThat(mvc.get().uri("/probe/boom")).hasStatus(500).bodyJson();
        r.extractingPath("$.error.code").isEqualTo("INTERNAL_ERROR");
        r.extractingPath("$.error.message").asString().doesNotContain("secret");
    }
}
