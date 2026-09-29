package com.dallimo.dallimoserver.notification.application;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;

/** 로컬 · 테스트: 보내지 않고 로그만 남긴다 (Expo 계정 · 실기기 없이 개발) */
public class LogPushSender implements PushSender {

    private static final Logger log = LoggerFactory.getLogger(LogPushSender.class);

    @Override
    public List<Result> send(List<Message> messages) {
        messages.forEach(m -> log.info("push (log) to={} title={} body={} data={}", m.to(), m.title(), m.body(), m.data()));
        return messages.stream().map(m -> new Result(m.to(), true, false, null)).toList();
    }
}
