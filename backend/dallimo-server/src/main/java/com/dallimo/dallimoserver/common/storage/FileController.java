package com.dallimo.dallimoserver.common.storage;

import com.dallimo.dallimoserver.common.error.ApiException;
import com.dallimo.dallimoserver.common.error.ErrorCode;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;

/**
 * 서버 디스크에 둔 이미지를 준다 (로그인 없이, 프로필 사진은 친구 · 랭킹에서 보인다).
 * 주소마다 새 이름(uuid)이라 내용이 바뀌지 않으므로 오래 캐시한다.
 */
@RestController
public class FileController {

    private final LocalDiskImageStorage storage;

    public FileController(LocalDiskImageStorage storage) {
        this.storage = storage;
    }

    @GetMapping("/files/**")
    public ResponseEntity<Resource> file(HttpServletRequest request) {
        String key = request.getRequestURI().substring(request.getContextPath().length() + LocalDiskImageStorage.URL_PATH.length());
        var file = storage.find(key).orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));
        MediaType type = key.endsWith(".png") ? MediaType.IMAGE_PNG : MediaType.IMAGE_JPEG;
        return ResponseEntity.ok()
                .contentType(type)
                .cacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable())
                .header("X-Content-Type-Options", "nosniff")
                .body(new FileSystemResource(file));
    }
}
