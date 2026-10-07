package com.dallimo.dallimoserver.live.api;

import com.dallimo.dallimoserver.common.observability.DallimoMetrics;
import com.dallimo.dallimoserver.live.application.LiveRaceService;
import com.dallimo.dallimoserver.common.ratelimit.RateLimiter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.security.Principal;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * STOMP 인증 · 권한 (16장). CONNECT: Access Token을 REST와 같은 JwtDecoder(서명 · 만료 · 세션 살아 있음)로 확인해 사용자를 붙인다.
 * SUBSCRIBE /topic/live-runs/{roomId} · SEND /app/live-runs/{roomId}/*: 그 방 참가자만.
 */
@Component
public class StompAuthInterceptor implements ChannelInterceptor {

    private static final Logger log = LoggerFactory.getLogger(StompAuthInterceptor.class);

    private static final Pattern ROOM = Pattern.compile("^/(?:topic|app)/live-runs/(\\d+)(?:/.*)?$");

    private final JwtDecoder jwt;
    private final LiveRaceService race;
    private final RateLimiter limiter;
    private final DallimoMetrics metrics;

    public StompAuthInterceptor(JwtDecoder jwt, @org.springframework.context.annotation.Lazy LiveRaceService race, RateLimiter limiter, DallimoMetrics metrics) {
        this.metrics = metrics;
        this.jwt = jwt;
        this.race = race;
        this.limiter = limiter;
    }

    /** 끊김 (앱이 DISCONNECT를 보내지 않고 끊겨도 온다) */
    @EventListener
    public void onDisconnect(SessionDisconnectEvent e) {
        Principal user = e.getUser();
        log.info("live.disconnect user={} session={} code={}", user == null ? "-" : user.getName(), e.getSessionId(), e.getCloseStatus().getCode());
        // 인증된 연결만 셌으니 끊김도 인증된 연결만
        if (user != null) metrics.liveDisconnected(e.getCloseStatus().getCode());
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor a = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (a == null || a.getCommand() == null) return message;
        StompCommand cmd = a.getCommand();
        if (cmd == StompCommand.CONNECT) {
            List<String> header = a.getNativeHeader("Authorization");
            String token = header == null || header.isEmpty() ? null : header.get(0).replaceFirst("(?i)^Bearer\\s+", "");
            if (token == null || token.isBlank()) throw new MessageDeliveryException("AUTH_REQUIRED");
            try {
                String userId = jwt.decode(token).getSubject();
                // 27장 RATE_LIMITED: 연결을 너무 자주 다시 맺으면 막는다 (사람마다)
                if (!limiter.tryAcquire(RateLimiter.Rule.WS_CONNECT, "u:" + userId)) throw new MessageDeliveryException("RATE_LIMITED");
                a.setUser(new UsernamePasswordAuthenticationToken(userId, null, List.of()));
                // 34장 Live: connectionId(세션) · userId (위치 · 닉네임은 남기지 않는다)
                log.info("live.connect user={} session={}", userId, a.getSessionId());
                metrics.liveConnected();
            } catch (JwtException e) {
                throw new MessageDeliveryException("AUTH_REQUIRED");
            }
            return message;
        }
        if (cmd == StompCommand.SUBSCRIBE || cmd == StompCommand.SEND) {
            Principal user = a.getUser();
            if (user == null) throw new MessageDeliveryException("AUTH_REQUIRED");
            String dest = a.getDestination();
            if (dest == null) return message;
            if (dest.startsWith("/user/")) return message;
            Matcher m = ROOM.matcher(dest);
            if (!m.matches()) throw new MessageDeliveryException("RESOURCE_FORBIDDEN");
            if (!race.isMember(Long.parseLong(user.getName()), Long.parseLong(m.group(1)))) throw new MessageDeliveryException("RESOURCE_FORBIDDEN");
            if (cmd == StompCommand.SUBSCRIBE) log.info("live.subscribe room={} user={} session={}", m.group(1), user.getName(), a.getSessionId());
        }
        return message;
    }
}
