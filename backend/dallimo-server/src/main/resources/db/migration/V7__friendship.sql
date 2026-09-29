-- 친구 (FND-001~005): 명세 44.1장 Friendship DB 보정 DDL 그대로.
-- user_low_id · user_high_id는 요청 방향과 무관한 쌍이라 두 사람 사이 관계는 한 줄이다 (A→B · B→A 동시 요청도 한 줄, FRD-IT-001).
-- idx_friend_high_status는 더했다: 친구 목록 · 친구 랭킹이 user_high_id 쪽으로도 찾는다 (uk_friend_pair는 user_low_id 쪽만 덮는다). backend/README 결정 사항.
CREATE TABLE tbl_friendship (
  id BIGINT NOT NULL AUTO_INCREMENT,
  user_low_id BIGINT NOT NULL,
  user_high_id BIGINT NOT NULL,
  requester_id BIGINT NOT NULL,
  status VARCHAR(20) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  responded_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_friend_pair (user_low_id, user_high_id),
  KEY idx_friend_requester_status (requester_id, status),
  KEY idx_friend_high_status (user_high_id, status),
  CONSTRAINT fk_friend_low FOREIGN KEY (user_low_id) REFERENCES tbl_user(id),
  CONSTRAINT fk_friend_high FOREIGN KEY (user_high_id) REFERENCES tbl_user(id),
  CONSTRAINT fk_friend_requester FOREIGN KEY (requester_id) REFERENCES tbl_user(id)
);
