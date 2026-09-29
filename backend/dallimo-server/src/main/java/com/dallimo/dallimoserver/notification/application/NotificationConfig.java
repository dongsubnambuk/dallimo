package com.dallimo.dallimoserver.notification.application;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(NotificationProperties.class)
public class NotificationConfig {

    /** dallimo.push.provider: expo(기본) · log. 테스트는 @Primary 발송기로 바꿔 넣는다 */
    @Bean
    PushSender pushSender(NotificationProperties props) {
        return "log".equalsIgnoreCase(props.provider()) ? new LogPushSender() : new ExpoPushSender(props);
    }
}
