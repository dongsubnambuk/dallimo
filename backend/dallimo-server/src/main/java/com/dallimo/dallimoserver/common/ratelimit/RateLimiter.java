package com.dallimo.dallimoserver.common.ratelimit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;

/**
 * 고정 창(fixed window) 요청 제한. Redis INCR + 처음 한 번 만료 설정을 Lua 하나로 (서버가 여러 대여도 같은 값).
 * Redis에 닿지 못하면 막지 않는다 (요청 제한 때문에 서비스가 멈추지 않게).
 * 한 번 실패하면 {@link #SKIP_AFTER_FAILURE} 동안 Redis에 묻지 않고 통과시킨다. 안 그러면 Redis가 죽은 동안 요청마다 타임아웃만큼 기다린다.
 */
@Component
@EnableConfigurationProperties(RateLimitProperties.class)
public class RateLimiter {

    private static final Logger log = LoggerFactory.getLogger(RateLimiter.class);

    // KEYS[1] 카운터, ARGV[1] 창(ms). 지금까지 수를 돌려준다
    private static final DefaultRedisScript<Long> HIT = new DefaultRedisScript<>("""
            local n = redis.call('INCR', KEYS[1])
            if n == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
            return n
            """, Long.class);

    static final Duration SKIP_AFTER_FAILURE = Duration.ofSeconds(30);

    private final StringRedisTemplate redis;
    private final RateLimitProperties props;
    private final Clock clock;
    // 이 시각 전까지는 Redis에 묻지 않는다 (마지막 실패 + 30초)
    private volatile Instant skipUntil = Instant.MIN;

    public RateLimiter(StringRedisTemplate redis, RateLimitProperties props, Clock clock) {
        this.redis = redis;
        this.props = props;
        this.clock = clock;
    }

    public enum Rule {
        LOGIN, SEARCH, FRIEND_REQUEST, SHARE_RESOLVE, WS_CONNECT, PROFILE_UPDATE
    }

    /** 허용되면 true */
    public boolean tryAcquire(Rule rule, String key) {
        if (!props.enabled()) return true;
        if (clock.instant().isBefore(skipUntil)) return true;
        try {
            Long n = redis.execute(HIT, List.of("rl:" + rule.name().toLowerCase() + ":" + key), String.valueOf(props.window().toMillis()));
            return n == null || n <= limit(rule);
        } catch (RuntimeException e) {
            skipUntil = clock.instant().plus(SKIP_AFTER_FAILURE);
            log.warn("rate limit 확인 실패, {}초 동안 막지 않음: {}", SKIP_AFTER_FAILURE.toSeconds(), e.getMessage());
            return true;
        }
    }

    public long retryAfterSeconds() {
        return Math.max(1, props.window().toSeconds());
    }

    private int limit(Rule rule) {
        return switch (rule) {
            case LOGIN -> props.login();
            case SEARCH -> props.search();
            case FRIEND_REQUEST -> props.friendRequest();
            case SHARE_RESOLVE -> props.shareResolve();
            case WS_CONNECT -> props.wsConnect();
            case PROFILE_UPDATE -> props.profileUpdate();
        };
    }
}
