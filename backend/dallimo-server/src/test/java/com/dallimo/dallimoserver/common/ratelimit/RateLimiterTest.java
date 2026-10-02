package com.dallimo.dallimoserver.common.ratelimit;

import org.junit.jupiter.api.Test;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Redis에 닿지 못하면 막지 않고, 30초 동안은 Redis에 다시 묻지 않는다 (요청마다 타임아웃을 기다리지 않게) */
class RateLimiterTest {

    private final StringRedisTemplate redis = mock(StringRedisTemplate.class);
    private final MutableClock clock = new MutableClock(Instant.parse("2026-10-01T00:00:00Z"));
    private final RateLimiter limiter = new RateLimiter(redis, new RateLimitProperties(null, null, 2, null, null, null, null, null), clock);

    @Test
    @SuppressWarnings("unchecked")
    void skipsRedisForAWhileAfterFailure() {
        when(redis.execute(any(RedisScript.class), anyList(), any(Object[].class))).thenThrow(new RedisConnectionFailureException("down"));

        // 실패해도 통과, 바로 뒤 요청은 Redis에 묻지 않는다
        assertThat(limiter.tryAcquire(RateLimiter.Rule.LOGIN, "1.2.3.4")).isTrue();
        assertThat(limiter.tryAcquire(RateLimiter.Rule.LOGIN, "1.2.3.4")).isTrue();
        clock.now = clock.now.plusSeconds(29);
        assertThat(limiter.tryAcquire(RateLimiter.Rule.LOGIN, "1.2.3.4")).isTrue();
        verify(redis, times(1)).execute(any(RedisScript.class), anyList(), any(Object[].class));

        // 30초가 지나면 다시 묻고, Redis가 살아났으면 다시 센다
        reset(redis);
        when(redis.execute(any(RedisScript.class), anyList(), any(Object[].class))).thenReturn(1L, 2L, 3L);
        clock.now = clock.now.plusSeconds(1);
        assertThat(limiter.tryAcquire(RateLimiter.Rule.LOGIN, "1.2.3.4")).isTrue();
        assertThat(limiter.tryAcquire(RateLimiter.Rule.LOGIN, "1.2.3.4")).isTrue();
        assertThat(limiter.tryAcquire(RateLimiter.Rule.LOGIN, "1.2.3.4")).isFalse();
    }

    static final class MutableClock extends Clock {
        Instant now;

        MutableClock(Instant now) {
            this.now = now;
        }

        @Override
        public ZoneOffset getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(java.time.ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }
}
