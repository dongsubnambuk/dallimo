package com.dallimo.dallimoserver.common.mail;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(MailProperties.class)
public class MailConfig {

    private static final Logger log = LoggerFactory.getLogger(MailConfig.class);

    /**
     * dallimo.mail.provider: resend(기본) · log. 테스트는 @Primary 발송기로 바꿔 넣는다.
     * Resend 키가 없으면 서버는 뜨고 메일만 보내지 못한다 (로그로 대신 남기면 인증 코드가 운영 로그에 남는다)
     */
    @Bean
    MailSender mailSender(MailProperties props) {
        if ("log".equalsIgnoreCase(props.provider())) return new LogMailSender();
        if (props.resendApiKey() == null || props.resendApiKey().isBlank()) {
            log.warn("RESEND_API_KEY가 없어 메일(비밀번호 재설정 인증 코드)을 보내지 못해요");
            return mail -> {
                throw new MailSender.MailSendException("RESEND_API_KEY가 설정되지 않았어요", null);
            };
        }
        return new ResendMailSender(props);
    }
}
