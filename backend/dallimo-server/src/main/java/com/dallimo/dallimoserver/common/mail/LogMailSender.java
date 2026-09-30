package com.dallimo.dallimoserver.common.mail;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/** 로컬 · 테스트: 보내지 않고 로그로 남긴다 (로컬에서 인증 코드를 로그로 확인한다). 운영에서는 쓰지 않는다 */
public class LogMailSender implements MailSender {

    private static final Logger log = LoggerFactory.getLogger(LogMailSender.class);

    @Override
    public void send(Mail mail) {
        log.info("mail (log) to={} subject={}\n{}", mail.to(), mail.subject(), mail.text());
    }
}
