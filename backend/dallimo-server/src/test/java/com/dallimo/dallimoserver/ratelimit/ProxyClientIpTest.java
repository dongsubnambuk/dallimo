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

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 프록시 뒤 요청 제한: 믿는 프록시(루프백)가 보낸 X-Forwarded-For의 사용자 IP로 센다.
 * MockMvc는 Tomcat을 거치지 않아 실제 서버를 띄우고 HTTP로 보낸다. 로그인 제한은 IP마다 2번으로 줄였다.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "dallimo.rate-limit.enabled=true",
        "dallimo.rate-limit.login=2",
        "dallimo.rate-limit.window=30s"
})
class ProxyClientIpTest {

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
    void countsEachClientBehindProxySeparately() throws Exception {
        // 프록시 IP 하나로 들어와도 사용자마다 따로 센다
        assertThat(login(port, "203.0.113.1")).isEqualTo(401);
        assertThat(login(port, "203.0.113.1")).isEqualTo(401);
        assertThat(login(port, "203.0.113.1")).isEqualTo(429);
        assertThat(login(port, "203.0.113.2")).isEqualTo(401);
        // 사용자가 앞에 가짜 IP를 붙여 보내도 프록시가 덧붙인 마지막 IP로 센다
        assertThat(login(port, "198.51.100.7, 203.0.113.1")).isEqualTo(429);
    }

    static void clearLoginCounts(StringRedisTemplate redis) {
        redis.delete(redis.keys("rl:login:ip:*"));
    }

    static int login(int port, String forwardedFor) throws IOException, InterruptedException {
        HttpRequest req = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/api/v1/auth/login"))
                .header("Content-Type", "application/json")
                .header("X-Forwarded-For", forwardedFor)
                .POST(HttpRequest.BodyPublishers.ofString("{\"email\":\"nobody@dallimo.test\",\"password\":\"wrong1234\",\"deviceId\":\"d\"}"))
                .build();
        try (HttpClient http = HttpClient.newHttpClient()) {
            return http.send(req, HttpResponse.BodyHandlers.discarding()).statusCode();
        }
    }
}
