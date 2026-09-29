package com.dallimo.dallimoserver.notification.domain;

import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneId;

/** 밤에는 Push를 보내지 않는다 (사용자 결정: 한국 시간 22시~8시). 알림함에는 남는다 */
public record QuietHours(LocalTime start, LocalTime end, ZoneId zone) {

    public static final QuietHours NIGHT = new QuietHours(LocalTime.of(22, 0), LocalTime.of(8, 0), ZoneId.of("Asia/Seoul"));

    public boolean contains(Instant at) {
        LocalTime t = at.atZone(zone).toLocalTime();
        return start.isAfter(end) ? !t.isBefore(start) || t.isBefore(end) : !t.isBefore(start) && t.isBefore(end);
    }
}
