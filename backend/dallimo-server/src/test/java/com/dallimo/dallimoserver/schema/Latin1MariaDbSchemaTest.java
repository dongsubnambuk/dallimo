package com.dallimo.dallimoserver.schema;

import com.dallimo.dallimoserver.MariaDbTestcontainersConfiguration;
import com.dallimo.dallimoserver.TestcontainersConfiguration;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.mariadb.MariaDBContainer;
import org.testcontainers.utility.DockerImageName;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 서버 기본 문자셋이 latin1인 MariaDB(공식 도커 이미지가 아닌 설치 · 예전 설정)에 처음 붙어도, 스키마를 만들기 전에 DB 기본 문자셋을 utf8mb4로 맞춰
 * 한글을 저장할 수 있어야 한다 (Utf8mb4DatabaseCallback). 운영 DB를 새로 만들 때 SQL을 따로 실행하지 않는다.
 */
@Import(Latin1MariaDbSchemaTest.Latin1MariaDb.class)
@ExtendWith(OutputCaptureExtension.class)
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class Latin1MariaDbSchemaTest {

    @TestConfiguration(proxyBeanMethods = false)
    static class Latin1MariaDb {

        @Bean
        @ServiceConnection
        MariaDBContainer latin1Mariadb() {
            // 서버 기본 문자셋이 latin1인 DB (공식 도커 이미지는 utf8mb4라 명시한다)
            return new MariaDBContainer(DockerImageName.parse(MariaDbTestcontainersConfiguration.MARIADB_IMAGE))
                    .withCommand("--character-set-server=latin1", "--collation-server=latin1_swedish_ci");
        }

        @Bean
        @ServiceConnection(name = "redis")
        GenericContainer<?> redis() {
            return new GenericContainer<>(DockerImageName.parse(TestcontainersConfiguration.REDIS_IMAGE)).withExposedPorts(6379);
        }
    }

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    MockMvcTester mvc;

    @Test
    void passwordIsNotLogged(CapturedOutput out) {
        // MariaDB 드라이버의 접속 주소에는 비밀번호가 들어 있다 (Testcontainers 기본 비밀번호 test)
        assertThat(out.getAll()).contains("Utf8mb4MigrationStrategy").doesNotContain("password=test");
    }

    @Test
    void schemaIsUtf8mb4AndKoreanIsStored() {
        assertThat(jdbc.queryForObject("SELECT @@character_set_server", String.class)).isEqualTo("latin1");
        assertThat(jdbc.queryForObject("SELECT @@character_set_database", String.class)).isEqualTo("utf8mb4");
        List<String> collations = jdbc.queryForList(
                "SELECT DISTINCT table_collation FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name LIKE 'tbl\\_%'", String.class);
        assertThat(collations).containsExactly("utf8mb4_unicode_ci");

        String id = UUID.randomUUID().toString().substring(0, 6);
        String nickname = "달리모러너" + id;
        MvcTestResult r = mvc.post().uri("/api/v1/auth/signup").contentType(MediaType.APPLICATION_JSON).content("""
                {"email":"latin-%s@dallimo.test","password":"run12345","nickname":"%s","deviceId":"d"}""".formatted(id, nickname)).exchange();
        assertThat(r).hasStatus(201);
        String body = new String(r.getResponse().getContentAsByteArray(), StandardCharsets.UTF_8);
        assertThat((String) JsonPath.read(body, "$.data.user.nickname")).isEqualTo(nickname);
        assertThat(jdbc.queryForObject("SELECT nickname FROM tbl_user WHERE nickname = ?", String.class, nickname)).isEqualTo(nickname);
    }
}
