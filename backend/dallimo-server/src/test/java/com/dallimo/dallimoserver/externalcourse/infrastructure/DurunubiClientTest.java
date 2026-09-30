package com.dallimo.dallimoserver.externalcourse.infrastructure;

import org.junit.jupiter.api.Test;
import org.springframework.web.client.ResourceAccessException;

import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DurunubiClientTest {

    @Test
    void serviceKeyAcceptsEncodingOrDecodingKey() {
        // 공공데이터포털은 같은 키를 Encoding · Decoding 두 가지로 보여 준다. 어느 쪽을 넣어도 한 번만 인코딩해서 보낸다
        assertThat(DurunubiClient.serviceKey("ab+c/d==")).isEqualTo("ab+c/d==");
        assertThat(DurunubiClient.serviceKey(" ab%2Bc%2Fd%3D%3D ")).isEqualTo("ab+c/d==");
    }

    @Test
    void retriesOnlyConnectionErrors() {
        AtomicInteger calls = new AtomicInteger();
        // 첫 연결이 끊기고 두 번째에 받는다
        assertThat(DurunubiClient.retry(() -> {
            if (calls.incrementAndGet() == 1) throw new ResourceAccessException("Connection reset");
            return "ok";
        })).isEqualTo("ok");
        assertThat(calls).hasValue(2);
        // 세 번 모두 끊기면 오류
        calls.set(0);
        assertThatThrownBy(() -> DurunubiClient.retry(() -> {
            calls.incrementAndGet();
            throw new ResourceAccessException("Connection reset");
        })).isInstanceOf(ResourceAccessException.class);
        assertThat(calls).hasValue(3);
        // 응답을 받은 오류는 다시 부르지 않는다
        calls.set(0);
        assertThatThrownBy(() -> DurunubiClient.retry(() -> {
            calls.incrementAndGet();
            throw new IllegalStateException("HTTP 500");
        })).isInstanceOf(IllegalStateException.class);
        assertThat(calls).hasValue(1);
    }
}
