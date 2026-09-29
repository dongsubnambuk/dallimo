-- 코스 평가 (REV-001): 명세 20장 ERD course_review 그대로 + has_toilet · has_water (CRS-102 화장실 · 급수를 완주자가 알려준다).
-- 한 사람이 한 코스에 평가 하나 (다시 쓰면 바꾼다). run_id는 평가한 사람의 인증 완주 기록.
-- 점수: rating 1~5, surface · signal · night · crowd 1~3 (1 적음/어두움/한적함/울퉁불퉁 ~ 3 많음/밝음/붐빔/고름). backend/README 결정 사항.
CREATE TABLE tbl_course_review (
  id BIGINT NOT NULL AUTO_INCREMENT,
  course_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  run_id BIGINT NOT NULL,
  rating TINYINT NOT NULL,
  surface_score TINYINT NULL,
  signal_score TINYINT NULL,
  night_score TINYINT NULL,
  crowd_score TINYINT NULL,
  has_toilet TINYINT(1) NULL,
  has_water TINYINT(1) NULL,
  content VARCHAR(1000) NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_course_review_user (course_id, user_id),
  KEY idx_course_review_course_created (course_id, created_at),
  CONSTRAINT fk_course_review_course FOREIGN KEY (course_id) REFERENCES tbl_course(id),
  CONSTRAINT fk_course_review_user FOREIGN KEY (user_id) REFERENCES tbl_user(id),
  CONSTRAINT fk_course_review_run FOREIGN KEY (run_id) REFERENCES tbl_run(id)
);

-- 코스 신고 (CREG-005). ERD에 없어 추가한다. 한 사람이 한 코스에 신고 하나 (다시 하면 사유를 바꾼다).
CREATE TABLE tbl_course_report (
  id BIGINT NOT NULL AUTO_INCREMENT,
  course_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  reason VARCHAR(20) NOT NULL,
  content VARCHAR(1000) NULL,
  created_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_course_report_user (course_id, user_id),
  KEY idx_course_report_created (created_at),
  CONSTRAINT fk_course_report_course FOREIGN KEY (course_id) REFERENCES tbl_course(id),
  CONSTRAINT fk_course_report_user FOREIGN KEY (user_id) REFERENCES tbl_user(id)
);

-- 코스 지역(앱이 출발점으로 알아낸 "대구 수성구") · 추천 시간대(CREG-002). ERD에 없어 추가한다.
ALTER TABLE tbl_course ADD COLUMN region VARCHAR(50) NULL AFTER description;
ALTER TABLE tbl_course ADD COLUMN recommended_time VARCHAR(30) NULL AFTER region;
