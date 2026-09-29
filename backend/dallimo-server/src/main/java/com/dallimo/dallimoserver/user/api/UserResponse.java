package com.dallimo.dallimoserver.user.api;

import com.dallimo.dallimoserver.user.domain.User;

/** 명세 41장 UserProfileResponse (이메일 로그인이라 provider 대신 email) */
public record UserResponse(long userId, String email, String nickname, String profileImageUrl, String friendCode) {

    public static UserResponse from(User u) {
        return new UserResponse(u.getId(), u.getEmail(), u.getNickname(), u.getProfileImageUrl(), u.getFriendCode());
    }
}
