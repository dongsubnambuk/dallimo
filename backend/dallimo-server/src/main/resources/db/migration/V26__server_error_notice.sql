-- 관리 웹 2단계 (FOUNDATION-DECISION-LOG 87항)

-- 처리하지 못한 서버 오류 (GlobalExceptionHandler). 관리 웹 모니터링에서 본다. 30일 보관 (ServerErrorRecorder).
-- 위치 · 요청 본문은 남기지 않는다 (21.1장 로그 규칙). path는 경로 패턴(/api/v1/runs/{runId}/points)이 있으면 그것
CREATE TABLE tbl_server_error (
  id BIGINT NOT NULL AUTO_INCREMENT,
  exception VARCHAR(200) NOT NULL,
  message VARCHAR(500) NULL,
  location VARCHAR(300) NULL,
  method VARCHAR(10) NULL,
  path VARCHAR(300) NULL,
  request_id VARCHAR(64) NULL,
  user_id BIGINT NULL,
  created_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_server_error_created (created_at)
);

-- 관리 웹 공지 푸시. 받는 회원마다 tbl_notification(type NOTICE)에 남기고, 그 회원들의 기기로 Push를 보낸다
-- target: ALL · IOS · ANDROID. status: SENDING → SENT · FAILED
CREATE TABLE tbl_notice (
  id BIGINT NOT NULL AUTO_INCREMENT,
  title VARCHAR(100) NOT NULL,
  body VARCHAR(500) NOT NULL,
  deep_link VARCHAR(200) NULL,
  target VARCHAR(10) NOT NULL,
  status VARCHAR(10) NOT NULL,
  actor VARCHAR(40) NOT NULL,
  target_users INT NOT NULL DEFAULT 0,
  push_tokens INT NOT NULL DEFAULT 0,
  push_ok INT NOT NULL DEFAULT 0,
  push_failed INT NOT NULL DEFAULT 0,
  tokens_removed INT NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL,
  finished_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  KEY idx_notice_created (created_at)
);
