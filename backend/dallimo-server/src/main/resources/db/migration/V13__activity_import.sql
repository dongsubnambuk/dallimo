-- 외부 러닝 기록 가져오기 (명세 122장). 122.4장 Run 필드 + 가져오기 기록부 (backend/README 결정 사항).
-- source: DALLIMO · APPLE_HEALTH · HEALTH_CONNECT · GARMIN · COROS · GPX_IMPORT (122.1장)
-- trust_level: DALLIMO HIGH, 건강 앱 MEDIUM, GPX LOW. 공식 코스 기록은 source별 검증 정책을 통과해야 한다
ALTER TABLE tbl_run
  ADD COLUMN source VARCHAR(20) NOT NULL DEFAULT 'DALLIMO',
  ADD COLUMN source_provider VARCHAR(100) NULL,
  ADD COLUMN provider_activity_id VARCHAR(191) NULL,
  ADD COLUMN source_device_name VARCHAR(100) NULL,
  ADD COLUMN imported_at DATETIME(3) NULL,
  ADD COLUMN trust_level VARCHAR(10) NOT NULL DEFAULT 'HIGH',
  ADD COLUMN verification_policy_version VARCHAR(30) NULL,
  ADD COLUMN import_status VARCHAR(20) NULL,
  ADD COLUMN import_failure_reason VARCHAR(200) NULL;

-- 122.2장: provider + 원본 id로 중복 가져오기를 막는다. 다른 사람 기록과 겹치지 않게 user_id를 함께 둔다
CREATE UNIQUE INDEX uk_run_provider_activity ON tbl_run (user_id, source, provider_activity_id);

-- 가져오기 기록부: Run이 생기지 않은 결과(달리모 기록과 겹침 · 실패)도 남겨 다시 보이지 않게 하고 다시 시도할 수 있게 한다.
-- status: IMPORTED(run_id) · MERGE_CANDIDATE(겹친 달리모 기록 merged_run_id) · FAILED(failure_reason)
CREATE TABLE tbl_activity_import (
  id BIGINT NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  source VARCHAR(20) NOT NULL,
  provider_activity_id VARCHAR(191) NOT NULL,
  status VARCHAR(20) NOT NULL,
  run_id BIGINT NULL,
  merged_run_id BIGINT NULL,
  failure_reason VARCHAR(200) NULL,
  attempts INT NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_activity_import (user_id, source, provider_activity_id),
  KEY idx_activity_import_user_updated (user_id, updated_at),
  CONSTRAINT fk_activity_import_user FOREIGN KEY (user_id) REFERENCES tbl_user(id),
  CONSTRAINT fk_activity_import_run FOREIGN KEY (run_id) REFERENCES tbl_run(id),
  CONSTRAINT fk_activity_import_merged FOREIGN KEY (merged_run_id) REFERENCES tbl_run(id)
);
