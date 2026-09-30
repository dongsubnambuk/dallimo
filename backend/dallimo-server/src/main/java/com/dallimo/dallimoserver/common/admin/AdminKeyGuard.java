package com.dallimo.dallimoserver.common.admin;

import com.dallimo.dallimoserver.common.error.ApiException;
import com.dallimo.dallimoserver.common.error.ErrorCode;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/** 관리 API 요청의 X-Admin-Key 확인. 키가 없으면 404(닫힘), 틀리면 403. 시간 차로 키를 알아내지 못하게 고정 시간 비교 */
@Component
@EnableConfigurationProperties(AdminProperties.class)
public class AdminKeyGuard {

    public static final String HEADER = "X-Admin-Key";

    private final AdminProperties props;

    public AdminKeyGuard(AdminProperties props) {
        this.props = props;
    }

    public void check(String key) {
        if (!props.enabled()) throw new ApiException(ErrorCode.RESOURCE_NOT_FOUND);
        byte[] expected = props.apiKey().getBytes(StandardCharsets.UTF_8);
        byte[] given = key == null ? new byte[0] : key.getBytes(StandardCharsets.UTF_8);
        if (!MessageDigest.isEqual(expected, given)) throw new ApiException(ErrorCode.RESOURCE_FORBIDDEN, "관리 키가 맞지 않아요.");
    }
}
