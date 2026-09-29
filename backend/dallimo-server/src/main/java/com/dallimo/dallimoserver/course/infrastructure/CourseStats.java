package com.dallimo.dallimoserver.course.infrastructure;

/**
 * 코스 경쟁 · 내 기록 숫자. 공식 기록은 검증을 통과한 tbl_course_record만 센다 (VERIFIED 기록만 랭킹, 20.1장).
 * 검증(WBS 5) 전이라 지금은 0 · null이 나온다.
 */
public record CourseStats(Integer leaderSec, int finisherCount, int weeklyRunnerCount,
                          Integer myBestSec, Integer myLastSec, int myFinishCount) {

    public static final CourseStats EMPTY = new CourseStats(null, 0, 0, null, null, 0);
}
