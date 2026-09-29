package com.dallimo.dallimoserver.user.application;

import java.security.SecureRandom;

/** 친구 코드 (tbl_user.friend_code). 헷갈리는 글자(0 O 1 I)를 뺀 대문자 · 숫자 6자리 */
final class FriendCodes {

    private static final char[] ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ".toCharArray();
    private static final SecureRandom RANDOM = new SecureRandom();

    private FriendCodes() {
    }

    static String next() {
        StringBuilder sb = new StringBuilder("RUN-");
        for (int i = 0; i < 6; i++) sb.append(ALPHABET[RANDOM.nextInt(ALPHABET.length)]);
        return sb.toString();
    }
}
