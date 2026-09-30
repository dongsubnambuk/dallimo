package com.dallimo.dallimoserver.externalcourse.infrastructure;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class DurunubiClientTest {

    @Test
    void serviceKeyAcceptsEncodingOrDecodingKey() {
        // 공공데이터포털은 같은 키를 Encoding · Decoding 두 가지로 보여 준다. 어느 쪽을 넣어도 한 번만 인코딩해서 보낸다
        assertThat(DurunubiClient.serviceKey("ab+c/d==")).isEqualTo("ab+c/d==");
        assertThat(DurunubiClient.serviceKey(" ab%2Bc%2Fd%3D%3D ")).isEqualTo("ab+c/d==");
    }
}
