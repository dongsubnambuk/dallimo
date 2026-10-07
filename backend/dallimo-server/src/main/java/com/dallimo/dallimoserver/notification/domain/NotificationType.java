package com.dallimo.dallimoserver.notification.domain;

/**
 * 14.2장 Push 이벤트 중 사용자 결정으로 고른 것 + 알림함 전용.
 * push: Push까지 보내는가 (false면 알림함에만). category: 설정 화면에서 켜고 끄는 묶음
 */
public enum NotificationType {
    FRIEND_REQUEST(true, Category.FRIEND),
    LIVE_INVITE(true, Category.LIVE),
    LIVE_CANCELED(true, Category.LIVE),
    RECORD_BEATEN(true, Category.RECORD),
    // 친구의 도전을 막아냈다 (알림함에만)
    CHALLENGE_DEFENDED(false, Category.RECORD),
    // 관리 웹 공지 (FOUNDATION-DECISION-LOG 87항). 서비스 공지라 종류별 설정으로 끄지 않는다. 보내기는 NoticeService가 한 번에
    NOTICE(true, Category.NOTICE);

    public enum Category {FRIEND, LIVE, RECORD, NOTICE}

    private final boolean push;
    private final Category category;

    NotificationType(boolean push, Category category) {
        this.push = push;
        this.category = category;
    }

    public boolean push() {
        return push;
    }

    public Category category() {
        return category;
    }
}
