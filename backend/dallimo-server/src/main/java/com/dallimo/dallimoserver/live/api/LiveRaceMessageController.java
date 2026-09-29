package com.dallimo.dallimoserver.live.api;

import com.dallimo.dallimoserver.common.error.ApiException;
import com.dallimo.dallimoserver.live.application.LiveRaceService;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Controller;
import org.springframework.web.socket.messaging.SessionSubscribeEvent;

import java.security.Principal;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** 8.1장 SEND /app/live-runs/{roomId}/state · heartbeat · cheer, 구독하면 SYNC_STATE (30.4장 재접속 snapshot) */
@Controller
public class LiveRaceMessageController {

    private static final Pattern TOPIC = Pattern.compile("^/topic/live-runs/(\\d+)$");

    private final LiveRaceService race;

    public LiveRaceMessageController(LiveRaceService race) {
        this.race = race;
    }

    @MessageMapping("/live-runs/{roomId}/state")
    public void state(@DestinationVariable long roomId, @Payload LiveRaceService.StateMessage message, Principal user) {
        race.onState(Long.parseLong(user.getName()), roomId, message);
    }

    /** 함께 달리기 응원 (SCREEN-SPECS Together). 방 전체에 CHEER로 보낸다 */
    @MessageMapping("/live-runs/{roomId}/cheer")
    public void cheer(@DestinationVariable long roomId, @Payload(required = false) LiveRaceService.CheerMessage message, Principal user) {
        race.onCheer(Long.parseLong(user.getName()), roomId, message);
    }

    @MessageMapping("/live-runs/{roomId}/heartbeat")
    public void heartbeat(@DestinationVariable long roomId, Principal user) {
        race.onHeartbeat(Long.parseLong(user.getName()), roomId);
    }

    @EventListener
    public void onSubscribe(SessionSubscribeEvent e) {
        StompHeaderAccessor a = StompHeaderAccessor.wrap(e.getMessage());
        if (a.getDestination() == null || a.getUser() == null) return;
        Matcher m = TOPIC.matcher(a.getDestination());
        if (m.matches()) race.sync(Long.parseLong(a.getUser().getName()), Long.parseLong(m.group(1)));
    }

    @MessageExceptionHandler(ApiException.class)
    @SendToUser(value = LiveRaceService.USER_QUEUE, broadcast = false)
    public Map<String, Object> error(ApiException e) {
        return Map.of("type", "ERROR", "code", e.code().name(), "message", e.getMessage(), "recoverable", false);
    }
}
