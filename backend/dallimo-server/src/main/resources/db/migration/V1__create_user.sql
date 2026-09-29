-- 명세 22.4장 최종 Flyway DDL (V1__create_user.sql). 이미 적용된 migration은 고치지 않고 새 버전을 추가한다.
CREATE TABLE tbl_user (
  id BIGINT NOT NULL AUTO_INCREMENT,
  provider VARCHAR(20) NOT NULL,
  provider_user_id VARCHAR(191) NOT NULL,
  nickname VARCHAR(40) NOT NULL,
  friend_code VARCHAR(20) NOT NULL,
  profile_image_url VARCHAR(500) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  deleted_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_user_provider (provider, provider_user_id),
  UNIQUE KEY uk_user_nickname (nickname),
  UNIQUE KEY uk_user_friend_code (friend_code),
  KEY idx_user_status (status)
);

CREATE TABLE tbl_refresh_token (
  id BIGINT NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  device_id VARCHAR(100) NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  revoked_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_refresh_device (user_id, device_id),
  KEY idx_refresh_expires_at (expires_at),
  CONSTRAINT fk_refresh_user FOREIGN KEY (user_id)
    REFERENCES tbl_user(id) ON DELETE CASCADE
);
