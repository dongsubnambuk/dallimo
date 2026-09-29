package com.dallimo.dallimoserver;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.mariadb.MariaDBContainer;
import org.testcontainers.utility.DockerImageName;

/**
 * 운영 DB(15.2장 MariaDB) 호환 확인용. 운영 버전이 정해지면 이 이미지를 같은 버전으로 맞춘다 (13.1장).
 */
@TestConfiguration(proxyBeanMethods = false)
public class MariaDbTestcontainersConfiguration {

    public static final String MARIADB_IMAGE = "mariadb:11.4";

    @Bean
    @ServiceConnection
    MariaDBContainer mariadbContainer() {
        return new MariaDBContainer(DockerImageName.parse(MARIADB_IMAGE))
                .withCommand("--character-set-server=utf8mb4", "--collation-server=utf8mb4_unicode_ci");
    }

    /** 8장 실시간 상태 저장소 (ADR-005). 운영과 같은 7.4 */
    @Bean
    @ServiceConnection(name = "redis")
    GenericContainer<?> redisContainer() {
        return new GenericContainer<>(DockerImageName.parse(TestcontainersConfiguration.REDIS_IMAGE)).withExposedPorts(6379);
    }
}
