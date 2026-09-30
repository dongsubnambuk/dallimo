-- 코스 신고 처리 (사용자 결정: 신고가 쌓이면 자동 숨김 + 관리자 검토, 명세 20.2장 "코스 공개 정책" 오픈 이슈, FOUNDATION-DECISION-LOG 53항)
-- moderated_at: 관리자가 마지막으로 검토한 시각. 이 뒤에 들어온 신고만 다시 쌓인 신고로 센다
ALTER TABLE tbl_course
  ADD COLUMN moderated_at DATETIME(3) NULL;

-- 상태를 바꾼 기록. action: AUTO_HIDE(신고 누적) · HIDE · BLOCK · RESTORE(관리자)
CREATE TABLE tbl_course_moderation (
  id BIGINT NOT NULL AUTO_INCREMENT,
  course_id BIGINT NOT NULL,
  action VARCHAR(20) NOT NULL,
  from_status VARCHAR(20) NOT NULL,
  to_status VARCHAR(20) NOT NULL,
  report_count INT NOT NULL,
  note VARCHAR(500) NULL,
  created_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_course_moderation_course (course_id, id),
  CONSTRAINT fk_course_moderation_course FOREIGN KEY (course_id) REFERENCES tbl_course(id)
);
