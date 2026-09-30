package com.dallimo.dallimoserver.common.storage;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 올린 파일(프로필 사진) 저장소.
 *
 * @param localDir      서버 디스크에 둘 때 폴더 (비어 있으면 ./data/uploads)
 * @param publicBaseUrl 파일 주소 앞부분 (예: https://api.dallimo.app). 비어 있으면 요청이 들어온 서버 주소를 쓴다
 */
@ConfigurationProperties("dallimo.storage")
public record StorageProperties(String localDir, String publicBaseUrl) {

    public StorageProperties {
        if (localDir == null || localDir.isBlank()) localDir = "./data/uploads";
    }
}
