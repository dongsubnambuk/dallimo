-- 명세 22.4장 최종 Flyway DDL (V3__create_run.sql). 이미 적용된 migration은 고치지 않고 새 버전을 추가한다.
CREATE TABLE tbl_run (
  id BIGINT NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  course_id BIGINT NULL,
  client_run_uuid CHAR(36) NOT NULL,
  mode VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  started_at DATETIME(3) NOT NULL,
  ended_at DATETIME(3) NULL,
  elapsed_seconds INT NOT NULL DEFAULT 0,
  distance_m INT NOT NULL DEFAULT 0,
  avg_pace_sec_per_km INT NULL,
  elevation_gain_m DECIMAL(8,2) NULL,
  calories INT NULL,
  verification_status VARCHAR(20) NOT NULL DEFAULT 'NONE',
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_run_client_uuid (client_run_uuid),
  KEY idx_run_user_started (user_id, started_at),
  KEY idx_run_course_verification (course_id, verification_status),
  CONSTRAINT fk_run_user FOREIGN KEY (user_id) REFERENCES tbl_user(id),
  CONSTRAINT fk_run_course FOREIGN KEY (course_id) REFERENCES tbl_course(id)
);

CREATE TABLE tbl_run_point (
  id BIGINT NOT NULL AUTO_INCREMENT,
  run_id BIGINT NOT NULL,
  seq INT NOT NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  altitude_m DECIMAL(8,2) NULL,
  accuracy_m DECIMAL(7,2) NULL,
  speed_mps DECIMAL(7,3) NULL,
  quality_flag VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
  recorded_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_run_point_sequence (run_id, seq),
  KEY idx_run_point_recorded (run_id, recorded_at),
  CONSTRAINT fk_run_point_run FOREIGN KEY (run_id) REFERENCES tbl_run(id)
);

CREATE TABLE tbl_run_sync_batch (
  id BIGINT NOT NULL AUTO_INCREMENT,
  run_id BIGINT NOT NULL,
  batch_uuid CHAR(36) NOT NULL,
  from_seq INT NOT NULL,
  to_seq INT NOT NULL,
  point_count INT NOT NULL,
  received_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_run_batch_uuid (run_id, batch_uuid),
  KEY idx_run_batch_sequence (run_id, from_seq, to_seq),
  CONSTRAINT fk_run_batch_run FOREIGN KEY (run_id) REFERENCES tbl_run(id)
);

CREATE TABLE tbl_run_verification (
  id BIGINT NOT NULL AUTO_INCREMENT,
  run_id BIGINT NOT NULL,
  start_check VARCHAR(20) NOT NULL,
  end_check VARCHAR(20) NOT NULL,
  distance_check VARCHAR(20) NOT NULL,
  route_check VARCHAR(20) NOT NULL,
  speed_check VARCHAR(20) NOT NULL,
  match_rate DECIMAL(5,2) NULL,
  failure_reason VARCHAR(100) NULL,
  policy_version VARCHAR(30) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_verification_run_created (run_id, created_at),
  CONSTRAINT fk_verification_run FOREIGN KEY (run_id) REFERENCES tbl_run(id)
);

CREATE TABLE tbl_course_record (
  id BIGINT NOT NULL AUTO_INCREMENT,
  course_id BIGINT NOT NULL,
  run_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  duration_seconds INT NOT NULL,
  avg_pace_sec_per_km INT NOT NULL,
  match_rate DECIMAL(5,2) NOT NULL,
  verified_at DATETIME(3) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_course_record_run (run_id),
  KEY idx_course_record_ranking (course_id, duration_seconds),
  KEY idx_course_record_user_best (course_id, user_id, duration_seconds),
  KEY idx_course_record_period (course_id, created_at, duration_seconds),
  CONSTRAINT fk_record_course FOREIGN KEY (course_id) REFERENCES tbl_course(id),
  CONSTRAINT fk_record_run FOREIGN KEY (run_id) REFERENCES tbl_run(id),
  CONSTRAINT fk_record_user FOREIGN KEY (user_id) REFERENCES tbl_user(id)
);
