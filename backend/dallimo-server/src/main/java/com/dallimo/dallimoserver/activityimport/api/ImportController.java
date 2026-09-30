package com.dallimo.dallimoserver.activityimport.api;

import com.dallimo.dallimoserver.activityimport.application.ActivityImportService;
import com.dallimo.dallimoserver.activityimport.domain.ExternalActivity;
import com.dallimo.dallimoserver.activityimport.infrastructure.ActivityImportJdbcRepository;
import com.dallimo.dallimoserver.common.web.ApiResponse;
import com.dallimo.dallimoserver.running.domain.RunPoint;
import com.dallimo.dallimoserver.running.domain.RunSource;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * 126장 Integration · Import API.
 * 건강 앱(HealthKit · Health Connect)은 기기에서만 읽을 수 있어 후보 목록은 앱이 만들고, 서버는 이미 가져온 기록 확인 · 가져오기 · 연동 상태를 맡는다.
 */
@RestController
public class ImportController {

    private final ActivityImportService imports;

    public ImportController(ActivityImportService imports) {
        this.imports = imports;
    }

    public record CheckRequest(@NotNull RunSource source, @NotNull @Size(max = ActivityImportService.MAX_CHECK) List<String> externalIds) {
    }

    public record CheckItem(String externalId, String status, Long runId, Long mergedRunId, String failureReason) {
        static CheckItem from(ActivityImportJdbcRepository.Row r) {
            return new CheckItem(r.externalId(), r.status().name(), r.runId(), r.mergedRunId(), r.failureReason());
        }
    }

    public record PointDto(@NotNull Double latitude, @NotNull Double longitude, Double altitudeM, Double accuracyM, Double speedMps,
                           @NotNull OffsetDateTime recordedAt) {
    }

    /** 원본 기록 하나. distanceM: 경로가 없을 때(실내) 쓰는 거리 */
    public record ImportRequest(@NotNull RunSource source, @Size(max = 100) String sourceProvider, @Size(max = 100) String sourceDeviceName,
                                @NotNull OffsetDateTime startedAt, @NotNull OffsetDateTime endedAt, @NotNull @Min(0) Integer activeSeconds,
                                @Min(0) Integer distanceM, @Size(max = ExternalActivity.MAX_POINTS) List<@Valid @NotNull PointDto> points) {
        ExternalActivity toActivity(String externalId) {
            List<RunPoint> pts = points == null ? List.of()
                    : points.stream().map(p -> new RunPoint(0, p.latitude(), p.longitude(), p.altitudeM(), p.accuracyM(), p.speedMps(), p.recordedAt().toInstant())).toList();
            return new ExternalActivity(source, externalId, sourceProvider, sourceDeviceName, startedAt.toInstant(), endedAt.toInstant(), activeSeconds,
                    distanceM, pts);
        }
    }

    public record IntegrationResponse(RunSource source, int importedCount, Instant lastImportedAt) {
    }

    /** 이미 처리한 원본 기록 (IMPORTED · MERGE_CANDIDATE · FAILED). 처음 보는 기록은 목록에 없다 */
    @PostMapping("/api/v1/imported-activities/check")
    public ApiResponse<List<CheckItem>> check(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody CheckRequest req) {
        return ApiResponse.ok(imports.check(userId(jwt), req.source(), req.externalIds()).stream().map(CheckItem::from).toList());
    }

    /** 122.2장 가져오기. 같은 기록을 다시 보내면 같은 결과 (FAILED였으면 다시 시도) */
    @PostMapping("/api/v1/imported-activities/{externalId}/import")
    public ApiResponse<ActivityImportService.Result> importActivity(@AuthenticationPrincipal Jwt jwt, @PathVariable String externalId,
                                                                    @Valid @RequestBody ImportRequest req) {
        return ApiResponse.ok(imports.importActivity(userId(jwt), req.toActivity(externalId)));
    }

    @GetMapping("/api/v1/integrations")
    public ApiResponse<List<IntegrationResponse>> integrations(@AuthenticationPrincipal Jwt jwt) {
        return ApiResponse.ok(imports.integrations(userId(jwt)).stream()
                .map(t -> new IntegrationResponse(t.source(), t.importedCount(), t.lastImportedAt())).toList());
    }

    private static long userId(Jwt jwt) {
        return Long.parseLong(jwt.getSubject());
    }
}
