package com.dallimo.dallimoserver.externalcourse.api;

import com.dallimo.dallimoserver.common.admin.AdminKeyGuard;
import com.dallimo.dallimoserver.common.error.ApiException;
import com.dallimo.dallimoserver.common.error.ErrorCode;
import com.dallimo.dallimoserver.common.web.ApiResponse;
import com.dallimo.dallimoserver.externalcourse.application.ExternalCourseImportService;
import com.dallimo.dallimoserver.externalcourse.application.ExternalCourseImportService.GpxMeta;
import com.dallimo.dallimoserver.externalcourse.application.ExternalCourseImportService.ImportReport;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

/**
 * 외부 추천 코스 가져오기 관리 API (FOUNDATION-DECISION-LOG 52항). 앱이 부르지 않는다.
 * 사용자 토큰 대신 X-Admin-Key(dallimo.admin.api-key, AdminKeyGuard)로 부른다. 키가 없으면 닫혀 있다(404).
 */
@RestController
@Validated
@RequestMapping("/api/v1/admin/external-courses")
public class ExternalCourseAdminController {

    static final int MAX_GPX_BYTES = 5 * 1024 * 1024;

    private final ExternalCourseImportService imports;
    private final AdminKeyGuard admin;

    public ExternalCourseAdminController(ExternalCourseImportService imports, AdminKeyGuard admin) {
        this.imports = imports;
        this.admin = admin;
    }

    /** OSM 박스 (south, west, north, east) */
    public record OsmRequest(@NotNull Double south, @NotNull Double west, @NotNull Double north, @NotNull Double east) {
    }

    @PostMapping(path = "/osm", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ApiResponse<ImportReport> osm(@RequestHeader(name = AdminKeyGuard.HEADER, required = false) String key, @Valid @RequestBody OsmRequest req) {
        admin.check(key);
        return ApiResponse.ok(imports.importOsm(req.south(), req.west(), req.north(), req.east()));
    }

    @PostMapping("/durunubi")
    public ApiResponse<ImportReport> durunubi(@RequestHeader(name = AdminKeyGuard.HEADER, required = false) String key) {
        admin.check(key);
        return ApiResponse.ok(imports.importDurunubi());
    }

    /** GPX 파일 하나. attribution(출처)은 꼭 넣는다 */
    @PostMapping(path = "/gpx", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<ImportReport> gpx(@RequestHeader(name = AdminKeyGuard.HEADER, required = false) String key,
                                         @RequestPart("file") MultipartFile file,
                                         @RequestParam(required = false) @Size(max = 100) String name,
                                         @RequestParam(required = false) @Size(max = 1000) String description,
                                         @RequestParam(required = false) @Size(max = 50) String region,
                                         @RequestParam(required = false) @Pattern(regexp = "EASY|MODERATE|HARD") String difficulty,
                                         @RequestParam(required = false) @Size(max = 100) String sourceRef,
                                         @RequestParam @NotBlank @Size(max = 200) String attribution,
                                         @RequestParam(required = false) @Size(max = 50) String license,
                                         @RequestParam(required = false) @Size(max = 500) @Pattern(regexp = "https?://.+") String sourceUrl) throws IOException {
        admin.check(key);
        if (file.isEmpty()) throw new ApiException(ErrorCode.VALIDATION_ERROR, "GPX 파일이 비어 있어요.");
        if (file.getSize() > MAX_GPX_BYTES) throw new ApiException(ErrorCode.VALIDATION_ERROR, "GPX 파일이 너무 커요.");
        return ApiResponse.ok(imports.importGpx(file.getBytes(), new GpxMeta(blank(name), blank(description), blank(region), blank(difficulty),
                blank(sourceRef), attribution.trim(), blank(license), blank(sourceUrl))));
    }

    private static String blank(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
