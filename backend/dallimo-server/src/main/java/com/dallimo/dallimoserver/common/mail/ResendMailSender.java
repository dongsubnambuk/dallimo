package com.dallimo.dallimoserver.common.mail;

import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.List;
import java.util.Map;

/** Resend 메일 API (https://resend.com/docs/api-reference/emails/send-email). POST /emails, Authorization: Bearer {API 키} */
public class ResendMailSender implements MailSender {

    private final MailProperties props;
    private final RestClient http;

    public ResendMailSender(MailProperties props) {
        this.props = props;
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build());
        factory.setReadTimeout(Duration.ofSeconds(10));
        this.http = RestClient.builder().requestFactory(factory).build();
    }

    @Override
    public void send(Mail mail) {
        Map<String, Object> body = Map.of("from", props.from(), "to", List.of(mail.to()), "subject", mail.subject(), "text", mail.text(), "html", mail.html());
        try {
            http.post().uri(props.resendUrl())
                    .header("Authorization", "Bearer " + props.resendApiKey())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientException e) {
            throw new MailSendException("메일을 보내지 못했어요: " + e.getMessage(), e);
        }
    }
}
