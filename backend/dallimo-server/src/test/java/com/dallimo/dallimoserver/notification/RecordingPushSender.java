package com.dallimo.dallimoserver.notification;

import com.dallimo.dallimoserver.notification.application.PushSender;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

/** 테스트용 발송기: 보낸 메시지를 모은다. "gone"이 들어간 토큰은 기기가 없어진 것으로 답한다 (Expo DeviceNotRegistered) */
public class RecordingPushSender implements PushSender {

    public final List<Message> sent = new CopyOnWriteArrayList<>();

    @Override
    public List<Result> send(List<Message> messages) {
        sent.addAll(messages);
        return messages.stream().map(m -> m.to().contains("gone") ? new Result(m.to(), false, true, "DeviceNotRegistered") : new Result(m.to(), true, false, null)).toList();
    }

    public List<Message> to(String token) {
        return sent.stream().filter(m -> m.to().equals(token)).toList();
    }

    @TestConfiguration
    public static class Config {
        @Bean
        @Primary
        RecordingPushSender recordingPushSender() {
            return new RecordingPushSender();
        }
    }
}
