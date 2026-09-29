-- 친구 활동 (ACT-001~002, SCR-M06): 명세 20장 ERD activity 그대로 + value_int.
-- type: PB · COURSE_CREATED · CHALLENGE_WON · WEEKLY_TOP. reference_type: COURSE_RECORD · COURSE · CHALLENGE.
-- value_int: PB면 이전 최고 기록(초, 첫 기록이면 null), WEEKLY_TOP이면 주간 순위. 만든 때의 값을 남긴다 (나중 기록으로 바뀌지 않게). backend/README 결정 사항.
CREATE TABLE tbl_activity (
  id BIGINT NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  type VARCHAR(30) NOT NULL,
  reference_type VARCHAR(30) NOT NULL,
  reference_id BIGINT NOT NULL,
  value_int INT NULL,
  visibility VARCHAR(20) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_activity_user_id (user_id, id),
  CONSTRAINT fk_activity_user FOREIGN KEY (user_id) REFERENCES tbl_user(id)
);
