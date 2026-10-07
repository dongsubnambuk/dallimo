package com.dallimo.dallimoserver.common.openapi;

import com.dallimo.dallimoserver.common.admin.AdminKeyGuard;
import com.dallimo.dallimoserver.common.security.SecurityConfig;
import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.PathItem;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.AntPathMatcher;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

/**
 * 명세 57장 API Contract(docs/api/openapi.yaml). 컨트롤러에서 만든 문서를 저장소에 두고, 코드가 바뀌면 OpenApiContractTest가 알려 준다.
 * 인증 방식은 SecurityConfig의 공개 API 목록과 같게 적는다: 공개 · Bearer(Access Token) · X-Admin-Key(관리 API)
 */
@Configuration(proxyBeanMethods = false)
public class OpenApiConfig {

    static final String BEARER = "bearerAuth";
    static final String ADMIN_KEY = "adminKey";
    private static final AntPathMatcher PATHS = new AntPathMatcher();

    @Bean
    OpenAPI dallimoOpenApi() {
        return new OpenAPI()
                .info(new Info().title("DALLIMO API").version("v1")
                        .description("달리모 서버 API. 응답은 { success, data, error, timestamp } (7.1장), 오류 코드는 27.1장. 명세 41~45장과 다른 곳은 frontend/docs/api/MOCK-CONTRACT-CHECK.md"))
                // 문서가 실행 환경(주소 · 포트)에 따라 바뀌지 않게 "/"(Swagger를 연 주소)로 둔다. 배포 서버에서 열면 배포 서버로 보낸다
                .servers(List.of(new Server().url("/").description("지금 연 주소의 서버 (배포: https://dallimo.gamjabox.cloud)")))
                .components(new Components()
                        .addSecuritySchemes(BEARER, new SecurityScheme().type(SecurityScheme.Type.HTTP).scheme("bearer").bearerFormat("JWT")
                                .description("Access Token (14.1장)"))
                        .addSecuritySchemes(ADMIN_KEY, new SecurityScheme().type(SecurityScheme.Type.APIKEY).in(SecurityScheme.In.HEADER)
                                .name(AdminKeyGuard.HEADER).description("관리 API 키 (ADMIN_API_KEY)")));
    }

    // 컨트롤러 이름(기본 태그) → 명세 장 이름. 새 컨트롤러를 만들면 여기에 넣는다 (OpenApiContractTest가 빠진 것을 알려 준다)
    static final Map<String, String> TAGS = Map.ofEntries(
            Map.entry("auth-controller", "인증 (41장)"),
            Map.entry("user-controller", "사용자 (41장)"),
            Map.entry("run-controller", "Run (42장)"),
            Map.entry("course-controller", "코스 (43장)"),
            Map.entry("my-course-controller", "내 코스 (MY-005)"),
            Map.entry("ranking-controller", "랭킹 (43장)"),
            Map.entry("friend-controller", "친구 (44장)"),
            Map.entry("user-lookup-controller", "사용자 찾기 (44장)"),
            Map.entry("challenge-controller", "도전 (44장)"),
            Map.entry("live-room-controller", "함께 달리기 (45장)"),
            Map.entry("share-controller", "공유 (SHR)"),
            Map.entry("notification-controller", "알림 (14.2장)"),
            Map.entry("activity-controller", "친구 활동 (ACT)"),
            Map.entry("workout-controller", "인터벌 달리기 (123장)"),
            Map.entry("import-controller", "외부 기록 가져오기 (122장)"),
            Map.entry("course-title-controller", "코스 크라운 · 레전드 (124장)"),
            Map.entry("segment-controller", "구간 도전 (124장)"),
            Map.entry("ghost-controller", "고스트 (124장)"),
            Map.entry("app-version-controller", "앱 버전 (강제 업데이트)"),
            Map.entry("external-course-admin-controller", "관리 · 외부 추천 코스"),
            Map.entry("course-admin-controller", "관리 · 코스 신고 검토"),
            Map.entry("admin-user-controller", "관리 · 회원"));

    @Bean
    OpenApiCustomizer securityAndTags() {
        return api -> api.getPaths().forEach((path, item) -> item.readOperationsMap().forEach((method, op) -> {
            op.setSecurity(security(path, method));
            if (op.getTags() != null) op.setTags(op.getTags().stream().map(t -> TAGS.getOrDefault(t, t)).toList());
        }));
    }

    static List<SecurityRequirement> security(String path, PathItem.HttpMethod method) {
        // 관리 API: 관리 키 또는 관리자 계정 토큰 (AdminKeyGuard, FOUNDATION-DECISION-LOG 85항)
        if (PATHS.match(SecurityConfig.ADMIN_API, path)) return List.of(new SecurityRequirement().addList(ADMIN_KEY), new SecurityRequirement().addList(BEARER));
        String[] open = switch (method) {
            case GET -> SecurityConfig.PUBLIC_API_GET;
            case POST -> SecurityConfig.PUBLIC_API_POST;
            default -> new String[0];
        };
        // 공개 API: 토큰 없이도 되고, 있으면 내 정보를 함께 준다 (빈 요구 조건 = 없어도 됨)
        if (Arrays.stream(open).anyMatch(p -> PATHS.match(p, path))) return List.of(new SecurityRequirement(), new SecurityRequirement().addList(BEARER));
        return List.of(new SecurityRequirement().addList(BEARER));
    }
}
