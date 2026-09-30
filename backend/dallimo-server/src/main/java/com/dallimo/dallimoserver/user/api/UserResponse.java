package com.dallimo.dallimoserver.user.api;

import com.dallimo.dallimoserver.user.domain.User;

/** 명세 41장 UserProfileResponse (이메일 로그인이라 provider 대신 email. 프로필 사진은 뺐다, 결정 로그 60항) */
public record UserResponse(long userId, String email, String nickname, String friendCode) {

    public static UserResponse from(User u) {
        return new UserResponse(u.getId(), u.getEmail(), u.getNickname(), u.getFriendCode());
    }
}
