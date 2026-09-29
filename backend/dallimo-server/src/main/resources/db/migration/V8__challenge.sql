-- 도전 (CHL-001~004): 명세 20장 ERD challenge. 22.4장 최종 DDL에 빠져 있어 ERD 컬럼대로 추가한다.
-- target_record_id는 도전을 만든 때의 친구 공식 기록(고정). challenger_run_id는 이 도전으로 달린 Run (한 Run은 도전 하나).
-- finished_at(판정 시각)은 ERD에 없어 더했다. backend/README 결정 사항.
CREATE TABLE tbl_challenge (
  id BIGINT NOT NULL AUTO_INCREMENT,
  challenger_id BIGINT NOT NULL,
  target_user_id BIGINT NOT NULL,
  course_id BIGINT NOT NULL,
  target_record_id BIGINT NOT NULL,
  challenger_run_id BIGINT NULL,
  status VARCHAR(20) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  finished_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_challenge_run (challenger_run_id),
  KEY idx_challenge_challenger (challenger_id, created_at),
  KEY idx_challenge_target (target_user_id, created_at),
  CONSTRAINT fk_challenge_challenger FOREIGN KEY (challenger_id) REFERENCES tbl_user(id),
  CONSTRAINT fk_challenge_target_user FOREIGN KEY (target_user_id) REFERENCES tbl_user(id),
  CONSTRAINT fk_challenge_course FOREIGN KEY (course_id) REFERENCES tbl_course(id),
  CONSTRAINT fk_challenge_record FOREIGN KEY (target_record_id) REFERENCES tbl_course_record(id),
  CONSTRAINT fk_challenge_run FOREIGN KEY (challenger_run_id) REFERENCES tbl_run(id)
);
