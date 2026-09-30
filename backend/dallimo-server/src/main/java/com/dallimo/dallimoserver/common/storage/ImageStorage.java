package com.dallimo.dallimoserver.common.storage;

/**
 * 올린 이미지를 두는 곳의 경계 (명세 13장 운영 구성의 S3 자리).
 * 지금은 서버 디스크(LocalDiskImageStorage). S3 · R2로 바꿀 때 이 인터페이스 구현만 더한다 (backend/README 결정 사항).
 */
public interface ImageStorage {

    /**
     * key(예: profile/12/uuid.jpg)에 저장하고 앱이 바로 열 수 있는 주소를 돌려준다.
     *
     * @param baseUrl 파일 주소 앞부분 (설정값이 없을 때 요청이 들어온 서버 주소)
     */
    String put(String key, byte[] data, String contentType, String baseUrl);

    /** put이 돌려준 주소의 파일을 지운다. 이 저장소 주소가 아니거나 이미 없으면 아무 일도 없다 */
    void deleteByUrl(String url);
}
