package com.dallimo.dallimoserver.notification.application;

import java.util.List;
import java.util.Map;

/** Push 발송 경계 (40장: Push 같은 외부 경계만 Port로 둔다). 기기가 없어진 토큰은 결과로 알려 준다 */
public interface PushSender {

    record Message(String to, String title, String body, Map<String, Object> data) {
    }

    /** deviceGone: 이 토큰은 더 이상 쓸 수 없다 (Expo DeviceNotRegistered) */
    record Result(String to, boolean ok, boolean deviceGone, String error) {
    }

    List<Result> send(List<Message> messages);
}
