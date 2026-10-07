-- 관리 웹 조치 기록 (FOUNDATION-DECISION-LOG 85항). 회원 정지 · 해제, 코스 신고 처리를 누가 · 언제 · 무엇을 · 왜 했는지 남긴다.
-- actor: 관리자 회원이면 "user:{id}", 관리 키(X-Admin-Key)면 "key". 관리자가 탈퇴해도 기록은 남아야 해서 회원 FK를 걸지 않는다.
-- 회원 정지는 tbl_user.status = 'SUSPENDED' (V1 status 컬럼을 그대로 쓴다)
CREATE TABLE tbl_admin_audit (
  id BIGINT NOT NULL AUTO_INCREMENT,
  actor VARCHAR(40) NOT NULL,
  action VARCHAR(40) NOT NULL,
  target_type VARCHAR(20) NOT NULL,
  target_id BIGINT NOT NULL,
  reason VARCHAR(500) NULL,
  created_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_admin_audit_target (target_type, target_id, id),
  KEY idx_admin_audit_created (created_at)
);
