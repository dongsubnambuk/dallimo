package com.dallimo.dallimoserver.notification.application;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Expo Push API (Expo Notifications, 명세 621행). 한 번에 100개까지 보낸다.
 * 응답 ticket의 DeviceNotRegistered는 기기에서 앱을 지웠거나 토큰이 바뀐 것이라 토큰을 지운다 (886행 invalid token).
 */
public class ExpoPushSender implements PushSender {

    private static final Logger log = LoggerFactory.getLogger(ExpoPushSender.class);
    static final int BATCH = 100;

    private final RestClient http;
    private final NotificationProperties props;

    public ExpoPushSender(NotificationProperties props) {
        this.props = props;
        this.http = RestClient.create();
    }

    @Override
    @SuppressWarnings("unchecked")
    public List<Result> send(List<Message> messages) {
        List<Result> out = new ArrayList<>();
        for (int from = 0; from < messages.size(); from += BATCH) {
            List<Message> batch = messages.subList(from, Math.min(messages.size(), from + BATCH));
            List<Map<String, Object>> body = batch.stream().map(ExpoPushSender::toExpo).toList();
            try {
                var req = http.post().uri(props.expoUrl()).contentType(MediaType.APPLICATION_JSON).accept(MediaType.APPLICATION_JSON);
                if (props.expoAccessToken() != null && !props.expoAccessToken().isBlank()) req = req.header("Authorization", "Bearer " + props.expoAccessToken());
                Map<String, Object> res = req.body(body).retrieve().body(Map.class);
                List<Map<String, Object>> tickets = res == null ? List.of() : (List<Map<String, Object>>) res.getOrDefault("data", List.of());
                for (int i = 0; i < batch.size(); i++) {
                    Map<String, Object> t = i < tickets.size() ? tickets.get(i) : Map.of();
                    boolean ok = "ok".equals(t.get("status"));
                    Object details = t.get("details");
                    String error = details instanceof Map<?, ?> d && d.get("error") != null ? String.valueOf(d.get("error")) : (String) t.get("message");
                    out.add(new Result(batch.get(i).to(), ok, "DeviceNotRegistered".equals(error), ok ? null : error));
                }
            } catch (RuntimeException e) {
                log.warn("expo push failed: {}", e.getMessage());
                batch.forEach(m -> out.add(new Result(m.to(), false, false, e.getMessage())));
            }
        }
        return out;
    }

    private static Map<String, Object> toExpo(Message m) {
        Map<String, Object> e = new LinkedHashMap<>();
        e.put("to", m.to());
        e.put("title", m.title());
        e.put("body", m.body());
        e.put("data", m.data());
        e.put("sound", "default");
        // 앱이 만드는 Android 알림 채널 (앱과 같은 이름)
        e.put("channelId", "default");
        e.put("priority", "high");
        return e;
    }
}
