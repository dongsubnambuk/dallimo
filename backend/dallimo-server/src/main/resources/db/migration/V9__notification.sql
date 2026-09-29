-- 알림 (NTF, 14.2장): 명세 20장 ERD notification 그대로 + 6.4장 인덱스 notification(user_id, read_at, created_at DESC).
-- deep_link는 앱 안 경로(/together/12 등). 파생 · 개인 UI 데이터라 물리 삭제할 수 있다 (22장).
CREATE TABLE tbl_notification (
  id BIGINT NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  type VARCHAR(30) NOT NULL,
  title VARCHAR(100) NOT NULL,
  body VARCHAR(500) NOT NULL,
  deep_link VARCHAR(500) NULL,
  read_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_notification_user_unread (user_id, read_at, created_at),
  KEY idx_notification_user_id (user_id, id),
  CONSTRAINT fk_notification_user FOREIGN KEY (user_id) REFERENCES tbl_user(id)
);

-- Expo Push 토큰: ERD에 저장할 곳이 없어 더했다. 기기(세션의 device_id)마다 하나, 토큰은 한 사용자에게만.
-- 로그아웃하면 그 기기 토큰, 탈퇴하면 모든 토큰을 지운다. backend/README 결정 사항.
CREATE TABLE tbl_push_token (
  id BIGINT NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  device_id VARCHAR(100) NOT NULL,
  token VARCHAR(255) NOT NULL,
  platform VARCHAR(20) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_push_token (token),
  UNIQUE KEY uk_push_token_device (user_id, device_id),
  CONSTRAINT fk_push_token_user FOREIGN KEY (user_id) REFERENCES tbl_user(id)
);

-- 알림 종류별 Push 설정 (MY-006 설정 화면). 없으면 모두 켜짐. 꺼도 알림함에는 남는다.
CREATE TABLE tbl_notification_setting (
  user_id BIGINT NOT NULL,
  friend_enabled TINYINT(1) NOT NULL,
  live_enabled TINYINT(1) NOT NULL,
  record_enabled TINYINT(1) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_notification_setting_user FOREIGN KEY (user_id) REFERENCES tbl_user(id)
);
