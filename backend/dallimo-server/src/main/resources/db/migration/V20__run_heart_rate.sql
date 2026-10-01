-- 워치 심박 (사용자 결정, FOUNDATION-DECISION-LOG 65항). 명세 22.4장에 없는 표다.
-- 심박은 건강정보(민감정보)라 앱 설정에서 따로 동의한 사람만 보낸다. 동의를 끄거나 탈퇴하면 지운다
CREATE TABLE tbl_run_heart_rate (
  run_id BIGINT NOT NULL,
  recorded_at DATETIME(3) NOT NULL,
  bpm SMALLINT NOT NULL,
  PRIMARY KEY (run_id, recorded_at),
  CONSTRAINT fk_run_heart_rate_run FOREIGN KEY (run_id) REFERENCES tbl_run(id)
);
