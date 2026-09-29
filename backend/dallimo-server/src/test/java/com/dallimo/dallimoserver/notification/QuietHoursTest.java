package com.dallimo.dallimoserver.notification;

import com.dallimo.dallimoserver.notification.domain.QuietHours;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class QuietHoursTest {

    // 한국 시간 = UTC + 9
    @Test
    void nightInKoreaIsQuiet() {
        assertThat(QuietHours.NIGHT.contains(Instant.parse("2026-09-29T13:00:00Z"))).isTrue();  // 22:00
        assertThat(QuietHours.NIGHT.contains(Instant.parse("2026-09-29T15:30:00Z"))).isTrue();  // 00:30
        assertThat(QuietHours.NIGHT.contains(Instant.parse("2026-09-29T22:59:00Z"))).isTrue();  // 07:59
        assertThat(QuietHours.NIGHT.contains(Instant.parse("2026-09-29T23:00:00Z"))).isFalse(); // 08:00
        assertThat(QuietHours.NIGHT.contains(Instant.parse("2026-09-29T12:59:00Z"))).isFalse(); // 21:59
        assertThat(QuietHours.NIGHT.contains(Instant.parse("2026-09-29T03:00:00Z"))).isFalse(); // 12:00
    }
}
