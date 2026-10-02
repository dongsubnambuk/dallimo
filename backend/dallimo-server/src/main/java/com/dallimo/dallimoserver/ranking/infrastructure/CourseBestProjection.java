package com.dallimo.dallimoserver.ranking.infrastructure;

/**
 * 23.1장 사용자별 최고 기록 projection (tbl_course_user_best, 결정 로그 70항).
 * 전체 기간 랭킹 · 코스 1등 기록 · 완주자 수를 공식 기록 전체를 GROUP BY 하지 않고 읽는다.
 * 공식 기록을 넣은 트랜잭션 안에서 REFRESH를 실행한다 (VerificationJdbcRepository.insertRecord).
 */
public final class CourseBestProjection {

    /**
     * 인자: courseId, userId. 그 사용자의 가장 빠른 기록(같은 시간이면 먼저 세운 것) 한 줄을 원본에서 다시 계산해 넣거나 바꾼다.
     * 원본에서 다시 계산하므로 여러 번 실행해도 결과가 같다
     */
    public static final String REFRESH = """
            INSERT INTO tbl_course_user_best (course_id, user_id, best_seconds, record_id)
            SELECT course_id, user_id, duration_seconds, id FROM tbl_course_record
            WHERE course_id = ? AND user_id = ? ORDER BY duration_seconds, id LIMIT 1
            ON DUPLICATE KEY UPDATE best_seconds = VALUES(best_seconds), record_id = VALUES(record_id)""";

    private CourseBestProjection() {
    }
}
