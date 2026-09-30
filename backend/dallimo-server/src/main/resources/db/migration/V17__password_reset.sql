-- 비밀번호 재설정 인증 코드 (사용자 결정: 이메일 인증 메일은 Resend, FOUNDATION-DECISION-LOG 58항)
-- 코드는 6자리 숫자이고 SHA-256으로만 저장한다. 10분 안에, 5번까지 틀릴 수 있다. 새 코드를 받으면 전 코드는 쓸 수 없다
CREATE TABLE tbl_password_reset (
  id BIGINT NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  code_hash CHAR(64) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  used_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_password_reset_user (user_id, created_at),
  CONSTRAINT fk_password_reset_user FOREIGN KEY (user_id) REFERENCES tbl_user(id)
);
