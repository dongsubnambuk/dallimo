-- 주변 코스(23.2장) 후보 조회가 출발점 범위와 공개 조건을 인덱스만으로 거르도록 조건 열을 모두 담는다.
-- 앞 두 열이 기존 idx_course_start_coordinate와 같아 그 인덱스를 대신한다 (결정 로그 70항)
CREATE INDEX idx_course_start_box ON tbl_course (start_lat, start_lng, status, visibility, creator_id, deleted_at);
DROP INDEX idx_course_start_coordinate ON tbl_course;
