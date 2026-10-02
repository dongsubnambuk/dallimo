package com.dallimo.dallimoserver.ranking.domain;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;

/**
 * RNK-001~003 랭킹 기간. 주간은 월요일 0시, 월간은 1일 0시부터 (한국 시간, 사용자 결정).
 * 기록은 UTC로 저장하므로 한국 시간 경계를 Instant로 바꿔 비교한다.
 */
public enum RankingPeriod {
    ALL, WEEKLY, MONTHLY;

    public static final ZoneId ZONE = ZoneId.of("Asia/Seoul");
    // 전체 기간: DATETIME 범위 안의 충분히 넓은 값
    private static final Instant EARLIEST = Instant.parse("1970-01-01T00:00:00Z");
    private static final Instant LATEST = Instant.parse("9999-01-01T00:00:00Z");

    /** at이 속한 기간 [from, to) */
    public Window window(Instant at) {
        LocalDate day = at.atZone(ZONE).toLocalDate();
        return switch (this) {
            case ALL -> new Window(EARLIEST, LATEST);
            case WEEKLY -> {
                LocalDate monday = day.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
                yield new Window(monday.atStartOfDay(ZONE).toInstant(), monday.plusWeeks(1).atStartOfDay(ZONE).toInstant());
            }
            case MONTHLY -> {
                LocalDate first = day.withDayOfMonth(1);
                yield new Window(first.atStartOfDay(ZONE).toInstant(), first.plusMonths(1).atStartOfDay(ZONE).toInstant());
            }
        };
    }

    public record Window(Instant from, Instant to) {

        /** 전체 기간이면 사용자별 최고 기록 projection(tbl_course_user_best)으로 바로 센다 */
        public boolean allTime() {
            return from.equals(EARLIEST) && to.equals(LATEST);
        }
    }
}
