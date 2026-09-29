package com.dallimo.dallimoserver.live.api;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * 8.1장 WebSocket / STOMP. 연결은 /ws (앱 기본 WebSocket, SockJS 없음).
 * SUBSCRIBE /topic/live-runs/{roomId}, SEND /app/live-runs/{roomId}/state · heartbeat, 개인 메시지 /user/queue/live-runs.
 * 인증은 STOMP CONNECT의 Authorization 헤더(Access Token)로 한다 (쿠키를 쓰지 않아 Origin 제한이 필요 없다).
 * 단일 인스턴스 메모리 broker로 시작한다 (30.5장). 여러 대가 되면 외부 broker를 검토한다.
 * STOMP heartbeat 5초: 휴대폰 망에서 소리 없이 끊긴 연결을 앱이 알아채고 다시 붙는다 (backend README 결정 사항).
 */
@Configuration
@EnableWebSocketMessageBroker
public class LiveWebSocketConfig implements WebSocketMessageBrokerConfigurer {

    static final long HEARTBEAT_MS = 5_000;

    private final StompAuthInterceptor auth;
    private final TaskScheduler heartbeat;

    public LiveWebSocketConfig(StompAuthInterceptor auth, @Lazy @Qualifier("messageBrokerTaskScheduler") TaskScheduler heartbeat) {
        this.auth = auth;
        this.heartbeat = heartbeat;
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws").setAllowedOriginPatterns("*");
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic", "/queue")
                .setHeartbeatValue(new long[]{HEARTBEAT_MS, HEARTBEAT_MS})
                .setTaskScheduler(heartbeat);
        registry.setApplicationDestinationPrefixes("/app");
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(auth);
    }
}
