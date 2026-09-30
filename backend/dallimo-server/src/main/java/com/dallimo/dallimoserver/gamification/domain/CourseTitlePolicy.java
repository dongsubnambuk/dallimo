package com.dallimo.dallimoserver.gamification.domain;

import java.time.Duration;
import java.time.Instant;

/**
 * 124장 Course Crown · Local Legend 기준 (명세에 값이 없어 정한 시작값, backend/README 결정 사항).
 * 둘 다 "최근 기간" 안의 코스 공식 기록(VERIFIED만 있는 tbl_course_record)으로 센다. 기간은 기록이 만들어진 시각(created_at).
 * Crown: 기간 안 가장 빠른 기록. 같으면 먼저 세운 사람.
 * Legend: 기간 안 가장 많이 검증 완주한 사람(2번 이상). 같으면 그 횟수를 먼저 채운 사람(마지막 완주가 이른 사람).
 */
public final class CourseTitlePolicy {

    public static final int PERIOD_DAYS = 90;
    public static final Duration PERIOD = Duration.ofDays(PERIOD_DAYS);
    public static final int LEGEND_MIN_FINISHES = 2;

    private CourseTitlePolicy() {
    }

    /** at까지(포함)의 최근 기간 [from, to) */
    public static Window windowEndingAt(Instant at) {
        return new Window(at.minus(PERIOD), at.plusMillis(1));
    }

    public record Window(Instant from, Instant to) {
    }
}
