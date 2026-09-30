package com.dallimo.dallimoserver.common.mail;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Resend 요청 모양(주소 · 인증 헤더 · JSON 필드)과 실패 처리. 가짜 Resend 서버로 확인한다 */
class ResendMailSenderTest {

    HttpServer server;
    final AtomicReference<String> auth = new AtomicReference<>();
    final AtomicReference<String> body = new AtomicReference<>();

    @AfterEach
    void stop() {
        if (server != null) server.stop(0);
    }

    @Test
    void postsMailToResend() {
        String url = stub(200, "{\"id\":\"m_1\"}");
        new ResendMailSender(new MailProperties("resend", "re_test", url, "달리모 <no-reply@dallimo.app>"))
                .send(new MailSender.Mail("runner@dallimo.app", "제목", "본문", "<p>본문</p>"));

        assertThat(auth.get()).isEqualTo("Bearer re_test");
        JsonNode json = JsonMapper.builder().build().readTree(body.get());
        assertThat(json.get("from").asString()).isEqualTo("달리모 <no-reply@dallimo.app>");
        assertThat(json.get("to").get(0).asString()).isEqualTo("runner@dallimo.app");
        assertThat(json.get("to").size()).isEqualTo(1);
        assertThat(json.get("subject").asString()).isEqualTo("제목");
        assertThat(json.get("text").asString()).isEqualTo("본문");
        assertThat(json.get("html").asString()).isEqualTo("<p>본문</p>");
    }

    @Test
    void rejectedMailThrows() {
        String url = stub(403, "{\"message\":\"API key is invalid\"}");
        ResendMailSender sender = new ResendMailSender(new MailProperties("resend", "re_bad", url, "달리모 <no-reply@dallimo.app>"));

        assertThatThrownBy(() -> sender.send(new MailSender.Mail("runner@dallimo.app", "제목", "본문", "<p>본문</p>")))
                .isInstanceOf(MailSender.MailSendException.class);
    }

    private String stub(int status, String response) {
        try {
            server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
        server.createContext("/emails", ex -> {
            auth.set(ex.getRequestHeaders().getFirst("Authorization"));
            body.set(new String(ex.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            byte[] b = response.getBytes(StandardCharsets.UTF_8);
            ex.getResponseHeaders().add("Content-Type", "application/json");
            ex.sendResponseHeaders(status, b.length);
            ex.getResponseBody().write(b);
            ex.close();
        });
        server.start();
        return "http://127.0.0.1:" + server.getAddress().getPort() + "/emails";
    }
}
