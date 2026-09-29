package com.dallimo.dallimoserver;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.mysql.MySQLContainer;
import org.testcontainers.utility.DockerImageName;

/**
 * 로컬 · 개발 DB(15.2장 MySQL). 버전을 고정해 CI 결과가 바뀌지 않게 한다.
 * 문자셋은 utf8mb4(한글 · 이모지 닉네임), 연결 시간대는 UTC(40.4장).
 */
@TestConfiguration(proxyBeanMethods = false)
public class TestcontainersConfiguration {

    public static final String MYSQL_IMAGE = "mysql:8.4";
    public static final String REDIS_IMAGE = "redis:7.4-alpine";

    @Bean
    @ServiceConnection
    MySQLContainer mysqlContainer() {
        return new MySQLContainer(DockerImageName.parse(MYSQL_IMAGE))
                .withCommand("--character-set-server=utf8mb4", "--collation-server=utf8mb4_unicode_ci")
                .withUrlParam("connectionTimeZone", "UTC");
    }

    /** 8장 실시간 상태 저장소 (ADR-005). 운영과 같은 7.4 */
    @Bean
    @ServiceConnection(name = "redis")
    GenericContainer<?> redisContainer() {
        return new GenericContainer<>(DockerImageName.parse(REDIS_IMAGE)).withExposedPorts(6379);
    }
}
