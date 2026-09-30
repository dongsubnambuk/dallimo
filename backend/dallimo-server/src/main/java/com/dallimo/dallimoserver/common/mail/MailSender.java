package com.dallimo.dallimoserver.common.mail;

/** 메일 보내기 경계 (비밀번호 재설정 인증 코드 · 비밀번호 변경 알림). 실제로는 Resend, 로컬 · 테스트는 로그 */
public interface MailSender {

    record Mail(String to, String subject, String text, String html) {
    }

    /** 보내지 못하면 MailSendException */
    void send(Mail mail);

    class MailSendException extends RuntimeException {
        public MailSendException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
