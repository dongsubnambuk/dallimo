-- 코스 통계 "이번 주 달린 사람 수"(CourseJdbcRepository.stats)가 코스의 Run을 모두 읽었다 (idx_run_course_verification은 started_at이 없다).
-- 코스 · 상태 · 시작 시각 범위를 인덱스만으로 세게 한다. Run 10만 건 코스에서 414ms → 3ms (결정 로그 70항)
CREATE INDEX idx_run_course_status_started ON tbl_run (course_id, status, started_at, user_id);
