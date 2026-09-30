package com.dallimo.dallimoserver.user.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

/** tbl_user (22.4장 V1 + V4 password_hash) */
@Entity
@Table(name = "tbl_user")
public class User {

    public static final String PROVIDER_EMAIL = "EMAIL";
    public static final String STATUS_ACTIVE = "ACTIVE";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 20)
    private String provider;

    @Column(name = "provider_user_id", nullable = false, length = 191)
    private String providerUserId;

    @Column(name = "password_hash", length = 100)
    private String passwordHash;

    @Column(nullable = false, length = 40)
    private String nickname;

    @Column(name = "friend_code", nullable = false, length = 20)
    private String friendCode;

    @Column(name = "profile_image_url", length = 500)
    private String profileImageUrl;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    protected User() {
    }

    public static User emailUser(String email, String passwordHash, String nickname, String friendCode, Instant now) {
        User u = new User();
        u.provider = PROVIDER_EMAIL;
        u.providerUserId = email;
        u.passwordHash = passwordHash;
        u.nickname = nickname;
        u.friendCode = friendCode;
        u.status = STATUS_ACTIVE;
        u.createdAt = now;
        u.updatedAt = now;
        return u;
    }

    public static final String STATUS_WITHDRAWN = "WITHDRAWN";

    /** 프로필 사진 주소 (빼면 null) */
    public void changeProfileImage(String url, Instant now) {
        this.profileImageUrl = url;
        this.updatedAt = now;
    }

    public void changeNickname(String nickname, Instant now) {
        this.nickname = nickname;
        this.updatedAt = now;
    }

    /** 비밀번호 변경 · 재설정 (FOUNDATION-DECISION-LOG 58항) */
    public void changePassword(String passwordHash, Instant now) {
        this.passwordHash = passwordHash;
        this.updatedAt = now;
    }

    /**
     * 탈퇴(AUTH-004). 행은 남기고(22.3장: Run · 랭킹 참조 무결성) 로그인 정보와 개인정보를 지운다.
     * 이메일 · 닉네임 · 친구 코드 UNIQUE 자리를 비워 같은 이메일로 다시 가입할 수 있게 한다.
     */
    public void withdraw(Instant now) {
        this.status = STATUS_WITHDRAWN;
        this.providerUserId = "withdrawn:" + id;
        this.passwordHash = null;
        this.nickname = "탈퇴한 러너 " + id;
        this.friendCode = "X-" + id;
        this.profileImageUrl = null;
        this.updatedAt = now;
        this.deletedAt = now;
    }

    public boolean isActive() {
        return STATUS_ACTIVE.equals(status) && deletedAt == null;
    }

    public Long getId() {
        return id;
    }

    /** 이메일 가입자의 이메일 (provider_user_id) */
    public String getEmail() {
        return PROVIDER_EMAIL.equals(provider) ? providerUserId : null;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public String getNickname() {
        return nickname;
    }

    public String getFriendCode() {
        return friendCode;
    }

    public String getProfileImageUrl() {
        return profileImageUrl;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
