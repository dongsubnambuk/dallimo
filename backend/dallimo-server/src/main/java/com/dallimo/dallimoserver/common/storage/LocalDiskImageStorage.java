package com.dallimo.dallimoserver.common.storage;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * 서버 디스크 저장소. 파일은 {@code GET /files/{key}}(FileController)로 로그인 없이 준다.
 * key는 서버가 만든 값만 쓰고(영문 · 숫자 · - _ / .), 폴더 밖으로 나가는 경로는 막는다.
 */
@Component
@EnableConfigurationProperties(StorageProperties.class)
public class LocalDiskImageStorage implements ImageStorage {

    public static final String URL_PATH = "/files/";
    private static final Pattern KEY = Pattern.compile("^[A-Za-z0-9][A-Za-z0-9_\\-/]*\\.(jpg|png)$");
    private static final Logger log = LoggerFactory.getLogger(LocalDiskImageStorage.class);

    private final Path root;
    private final String publicBaseUrl;

    public LocalDiskImageStorage(StorageProperties props) {
        this.root = Path.of(props.localDir()).toAbsolutePath().normalize();
        this.publicBaseUrl = props.publicBaseUrl();
    }

    @Override
    public String put(String key, byte[] data, String contentType, String baseUrl) {
        Path file = resolve(key).orElseThrow(() -> new IllegalArgumentException("잘못된 key: " + key));
        try {
            Files.createDirectories(file.getParent());
            // 다 쓴 뒤 옮겨서 반쯤 쓴 파일을 내보내지 않는다
            Path tmp = Files.createTempFile(file.getParent(), ".upload", ".tmp");
            Files.write(tmp, data);
            Files.move(tmp, file, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        String base = publicBaseUrl != null && !publicBaseUrl.isBlank() ? publicBaseUrl : baseUrl;
        return stripSlash(base) + URL_PATH + key;
    }

    @Override
    public void deleteByUrl(String url) {
        if (url == null) return;
        int at = url.indexOf(URL_PATH);
        if (at < 0) return;
        resolve(url.substring(at + URL_PATH.length())).ifPresent(file -> {
            try {
                Files.deleteIfExists(file);
            } catch (IOException e) {
                // 지우지 못해도 사용자 요청은 성공으로 둔다 (남은 파일은 운영 정리 대상)
                log.warn("파일을 지우지 못함: {}", file, e);
            }
        });
    }

    /** key에 해당하는 파일 (없거나 폴더 밖이면 비어 있음) */
    public Optional<Path> find(String key) {
        return resolve(key).filter(Files::isRegularFile);
    }

    private Optional<Path> resolve(String key) {
        if (key == null || !KEY.matcher(key).matches() || key.contains("..") || key.contains("//")) return Optional.empty();
        Path file = root.resolve(key).normalize();
        return file.startsWith(root) ? Optional.of(file) : Optional.empty();
    }

    private static String stripSlash(String s) {
        return s.endsWith("/") ? s.substring(0, s.length() - 1) : s;
    }
}
