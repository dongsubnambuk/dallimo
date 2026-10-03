package com.dallimo.dallimoserver.appversion;

import com.dallimo.dallimoserver.common.web.ApiResponse;
import jakarta.validation.constraints.Pattern;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 앱이 켜질 때 부른다 (로그인 없이). minVersion보다 낮은 앱은 스토어로 보낸다 (결정 로그 79항).
 * 값은 배포 환경변수 APP_MIN_VERSION_IOS · APP_STORE_URL_IOS. 비어 있으면 minVersion이 null이라 막지 않는다
 */
@RestController
@RequestMapping("/api/v1/app")
@EnableConfigurationProperties(AppVersionProperties.class)
public class AppVersionController {

    private final AppVersionProperties props;

    public AppVersionController(AppVersionProperties props) {
        this.props = props;
    }

    public record AppVersionResponse(String platform, String minVersion, String storeUrl) {
    }

    @GetMapping("/version")
    public ApiResponse<AppVersionResponse> version(@RequestParam(defaultValue = "ios") @Pattern(regexp = "ios|android") String platform) {
        AppVersionProperties.Platform p = props.of(platform);
        return ApiResponse.ok(new AppVersionResponse(platform, blankToNull(p.minVersion()), blankToNull(p.storeUrl())));
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
