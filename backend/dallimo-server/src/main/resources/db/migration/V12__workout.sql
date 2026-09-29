-- 인터벌 달리기 (명세 123장 Training). 123.3장 데이터 모델 초안 + 아래 두 가지 (backend/README 결정 사항).
-- 1) tbl_workout_block.template_version: 고치면 version을 올리고 새 구간을 따로 남긴다. 옛 버전으로 달린 기록도 그때 구성 그대로 남는다.
-- 2) tbl_run_workout_step: 달린 뒤 구간별 실제 거리 · 시간 (123.2장 "각 Step별 실제 시간, 평균 페이스, 목표 대비 차이").
--    그때 구간 정의를 함께 둬서 추천 인터벌(저장하지 않은 것)로 달려도 결과를 다시 볼 수 있다.
-- 단위: DISTANCE 값은 m, TIME 값은 초, MANUAL은 값 없음. TARGET_TIME은 초, TARGET_PACE는 1km당 초.
CREATE TABLE tbl_workout_template (
  id BIGINT NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  name VARCHAR(40) NOT NULL,
  description VARCHAR(200) NULL,
  version INT NOT NULL,
  deleted_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_workout_user_updated (user_id, updated_at),
  CONSTRAINT fk_workout_user FOREIGN KEY (user_id) REFERENCES tbl_user(id)
);

CREATE TABLE tbl_workout_block (
  id BIGINT NOT NULL AUTO_INCREMENT,
  template_id BIGINT NOT NULL,
  template_version INT NOT NULL,
  seq INT NOT NULL,
  type VARCHAR(10) NOT NULL,
  repeat_count INT NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_workout_block_seq (template_id, template_version, seq),
  CONSTRAINT fk_workout_block_template FOREIGN KEY (template_id) REFERENCES tbl_workout_template(id)
);

CREATE TABLE tbl_workout_step (
  id BIGINT NOT NULL AUTO_INCREMENT,
  block_id BIGINT NOT NULL,
  seq INT NOT NULL,
  step_type VARCHAR(20) NOT NULL,
  end_condition_type VARCHAR(20) NOT NULL,
  end_condition_value INT NULL,
  target_type VARCHAR(20) NULL,
  target_min INT NULL,
  target_max INT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_workout_step_seq (block_id, seq),
  CONSTRAINT fk_workout_step_block FOREIGN KEY (block_id) REFERENCES tbl_workout_block(id)
);

ALTER TABLE tbl_run
  ADD COLUMN workout_template_id BIGINT NULL,
  ADD COLUMN workout_version INT NULL,
  ADD COLUMN workout_name VARCHAR(40) NULL,
  ADD CONSTRAINT fk_run_workout FOREIGN KEY (workout_template_id) REFERENCES tbl_workout_template(id);

CREATE INDEX idx_run_user_mode_started ON tbl_run (user_id, mode, started_at);

CREATE TABLE tbl_run_workout_step (
  id BIGINT NOT NULL AUTO_INCREMENT,
  run_id BIGINT NOT NULL,
  seq INT NOT NULL,
  step_type VARCHAR(20) NOT NULL,
  repeat_index INT NULL,
  repeat_count INT NULL,
  end_condition_type VARCHAR(20) NOT NULL,
  end_condition_value INT NULL,
  target_type VARCHAR(20) NULL,
  target_min INT NULL,
  target_max INT NULL,
  distance_m INT NOT NULL,
  elapsed_seconds INT NOT NULL,
  completed BOOLEAN NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_run_workout_step_seq (run_id, seq),
  CONSTRAINT fk_run_workout_step_run FOREIGN KEY (run_id) REFERENCES tbl_run(id)
);
