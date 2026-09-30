-- 124장 Segment Attack 구간 기록. 구간은 서버가 코스를 약 1km씩 나눈다(사용자 결정, 코스 거리 → 구간 수, 같은 길이).
-- 인증된 코스 러닝(tbl_course_record가 생긴 러닝)에서만 잰다. segment_count: 그때 구간 수 (구간 나누는 방법이 바뀌면 옛 기록과 섞지 않게)
CREATE TABLE tbl_course_segment_record (
  id BIGINT NOT NULL AUTO_INCREMENT,
  course_id BIGINT NOT NULL,
  segment_index INT NOT NULL,
  segment_count INT NOT NULL,
  run_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  duration_seconds INT NOT NULL,
  created_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_segment_record_run (run_id, segment_index),
  KEY idx_segment_record_ranking (course_id, segment_count, segment_index, duration_seconds),
  KEY idx_segment_record_user (course_id, segment_count, segment_index, user_id, duration_seconds),
  CONSTRAINT fk_segment_record_course FOREIGN KEY (course_id) REFERENCES tbl_course(id),
  CONSTRAINT fk_segment_record_run FOREIGN KEY (run_id) REFERENCES tbl_run(id),
  CONSTRAINT fk_segment_record_user FOREIGN KEY (user_id) REFERENCES tbl_user(id)
);
