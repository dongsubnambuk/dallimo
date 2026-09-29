package com.dallimo.dallimoserver.share.api;

import com.dallimo.dallimoserver.share.application.ShareProperties;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * SHR-004 App Link · Universal Link 확인 파일. 휴대폰이 이 파일로 "이 도메인의 /s/* 주소는 달리모 앱이 연다"를 확인한다.
 * 값이 없으면 404 (App Link 없이 공유 페이지 → dallimo:// 로만 연다).
 */
@RestController
public class AppLinksController {

    private final ShareProperties props;

    public AppLinksController(ShareProperties props) {
        this.props = props;
    }

    /** iOS Universal Link. 공유 페이지(/s/*)만 앱으로 */
    @GetMapping(value = "/.well-known/apple-app-site-association", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> apple() {
        List<String> ids = props.appLinks().iosAppIds().stream().filter(x -> !x.isBlank()).toList();
        if (ids.isEmpty()) return ResponseEntity.notFound().build();
        Map<String, Object> body = Map.of("applinks", Map.of("details", List.of(Map.of("appIDs", ids, "components", List.of(Map.of("/", "/s/*"))))));
        return ResponseEntity.ok().cacheControl(CacheControl.maxAge(Duration.ofHours(1))).body(body);
    }

    /** Android App Link */
    @GetMapping(value = "/.well-known/assetlinks.json", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<List<Map<String, Object>>> android() {
        var a = props.appLinks();
        List<String> sha = a.androidSha256().stream().filter(x -> !x.isBlank()).toList();
        if (a.androidPackage() == null || a.androidPackage().isBlank() || sha.isEmpty()) return ResponseEntity.notFound().build();
        Map<String, Object> target = Map.of("namespace", "android_app", "package_name", a.androidPackage(), "sha256_cert_fingerprints", sha);
        return ResponseEntity.ok().cacheControl(CacheControl.maxAge(Duration.ofHours(1)))
                .body(List.of(Map.of("relation", List.of("delegate_permission/common.handle_all_urls"), "target", target)));
    }
}
