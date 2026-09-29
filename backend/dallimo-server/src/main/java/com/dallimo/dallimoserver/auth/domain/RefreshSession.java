package com.dallimo.dallimoserver.auth.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Duration;
import java.time.Instant;

/**
 * 기기 하나의 로그인 세션 = tbl_refresh_token 한 줄 (14.1장 기기 단위 토큰 관리).
 * Refresh Token 원문은 저장하지 않고 해시만 둔다. Access Token은 이 세션 id(sid)를 담아 요청마다 세션이 살아 있는지 확인한다.
 */
@Entity
@Table(name = "tbl_refresh_token")
public class RefreshSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "device_id", nullable = false, length = 100)
    private String deviceId;

    @Column(name = "token_hash", nullable = false)
    private String tokenHash;

    @Column(name = "previous_token_hash")
    private String previousTokenHash;

    @Column(name = "rotated_at")
    private Instant rotatedAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected RefreshSession() {
    }

    public static RefreshSession open(Long userId, String deviceId, String tokenHash, Instant now, Duration ttl) {
        RefreshSession s = new RefreshSession();
        s.userId = userId;
        s.deviceId = deviceId;
        s.tokenHash = tokenHash;
        s.createdAt = now;
        s.expiresAt = now.plus(ttl);
        return s;
    }

    public boolean isActive(Instant now) {
        return revokedAt == null && expiresAt.isAfter(now);
    }

    /** 새 토큰으로 바꾸고 만료를 다시 늘린다. 바로 전 토큰은 grace 동안만 다시 받아 준다 */
    public void rotate(String newTokenHash, Instant now, Duration ttl) {
        previousTokenHash = tokenHash;
        tokenHash = newTokenHash;
        rotatedAt = now;
        expiresAt = now.plus(ttl);
    }

    public boolean isPreviousWithinGrace(String hash, Instant now, Duration grace) {
        return previousTokenHash != null && rotatedAt != null && TokenHashes.matches(previousTokenHash, hash) && !rotatedAt.plus(grace).isBefore(now);
    }

    public void revoke(Instant now) {
        if (revokedAt == null) revokedAt = now;
    }

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public String getDeviceId() {
        return deviceId;
    }

    public String getTokenHash() {
        return tokenHash;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public Instant getRevokedAt() {
        return revokedAt;
    }
}
