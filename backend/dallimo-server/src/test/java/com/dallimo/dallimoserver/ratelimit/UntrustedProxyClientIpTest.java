package com.dallimo.dallimoserver.ratelimit;

import com.dallimo.dallimoserver.TestcontainersConfiguration;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 믿지 않는 곳에서 온 X-Forwarded-For는 무시한다. 프록시 없이 서버에 바로 붙은 사람이 헤더를 바꿔 제한을 피하지 못한다.
 * 여기서는 루프백을 믿는 프록시에서 빼서 흉내 낸다.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "dallimo.rate-limit.enabled=true",
        "dallimo.rate-limit.login=2",
        "dallimo.rate-limit.window=30s",
        "server.tomcat.remoteip.internal-proxies=10\\.9\\.9\\.9"
})
class UntrustedProxyClientIpTest {

    @LocalServerPort
    int port;

    @Autowired
    StringRedisTemplate redis;

    // 요청 제한 수는 Redis에 있어 다른 테스트 클래스와 나눠 쓴다. 이 테스트가 쓰는 IP의 수를 앞뒤로 지운다
    @BeforeEach
    @AfterEach
    void clearCounts() {
        ProxyClientIpTest.clearLoginCounts(redis);
    }

    @Test
    void ignoresForwardedForFromUntrustedPeer() throws Exception {
        assertThat(ProxyClientIpTest.login(port, "203.0.113.11")).isEqualTo(401);
        assertThat(ProxyClientIpTest.login(port, "203.0.113.12")).isEqualTo(401);
        // 헤더를 바꿔도 실제 접속 IP 하나로 센다
        assertThat(ProxyClientIpTest.login(port, "203.0.113.13")).isEqualTo(429);
    }
}
