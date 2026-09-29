package com.dallimo.dallimoserver.workout.api;

import com.dallimo.dallimoserver.common.web.ApiResponse;
import com.dallimo.dallimoserver.workout.application.WorkoutService;
import com.dallimo.dallimoserver.workout.domain.WorkoutDefinition;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** 126장 Workout API: GET · POST /workouts, GET · PUT · DELETE /workouts/{id}, POST /workouts/{id}/duplicate */
@RestController
@RequestMapping("/api/v1/workouts")
public class WorkoutController {

    private final WorkoutService workouts;

    public WorkoutController(WorkoutService workouts) {
        this.workouts = workouts;
    }

    /** 이름 · 설명 · 묶음. 자세한 범위는 WorkoutDefinition이 확인한다 */
    public record WorkoutRequest(String name, @Size(max = 200) String description, @NotNull @Size(max = 50) List<WorkoutDefinition.Block> blocks) {
        WorkoutDefinition toDefinition() {
            return new WorkoutDefinition(name, description, blocks);
        }
    }

    @GetMapping
    public ApiResponse<List<WorkoutService.Workout>> list(@AuthenticationPrincipal Jwt jwt) {
        return ApiResponse.ok(workouts.list(userId(jwt)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<WorkoutService.Workout>> create(@AuthenticationPrincipal Jwt jwt, @RequestBody @jakarta.validation.Valid WorkoutRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(workouts.create(userId(jwt), req.toDefinition())));
    }

    @GetMapping("/{id}")
    public ApiResponse<WorkoutService.Workout> get(@AuthenticationPrincipal Jwt jwt, @PathVariable long id) {
        return ApiResponse.ok(workouts.get(userId(jwt), id));
    }

    @PutMapping("/{id}")
    public ApiResponse<WorkoutService.Workout> update(@AuthenticationPrincipal Jwt jwt, @PathVariable long id, @RequestBody @jakarta.validation.Valid WorkoutRequest req) {
        return ApiResponse.ok(workouts.update(userId(jwt), id, req.toDefinition()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal Jwt jwt, @PathVariable long id) {
        workouts.delete(userId(jwt), id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/duplicate")
    public ResponseEntity<ApiResponse<WorkoutService.Workout>> duplicate(@AuthenticationPrincipal Jwt jwt, @PathVariable long id) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(workouts.duplicate(userId(jwt), id)));
    }

    private static long userId(Jwt jwt) {
        return Long.parseLong(jwt.getSubject());
    }
}
