package com.dallimo.dallimoserver.auth.domain;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

/** Refresh Token 비밀값 해시(SHA-256). 무작위 256비트 값이라 느린 해시가 필요 없다 */
public final class TokenHashes {

    private TokenHashes() {
    }

    public static String sha256(String secret) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(secret.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    /** 비교 시간이 값에 따라 달라지지 않게 비교한다 */
    public static boolean matches(String expectedHash, String actualHash) {
        return MessageDigest.isEqual(expectedHash.getBytes(StandardCharsets.UTF_8), actualHash.getBytes(StandardCharsets.UTF_8));
    }
}
