-- 공유 링크 (SHR-001~004): 명세 20장 ERD share_link. 22.4장 최종 DDL에 빠져 있어 ERD 그대로 추가한다.
-- 같은 사람이 같은 대상을 다시 공유하면 같은 링크를 돌려준다 (uk_share_target).
CREATE TABLE tbl_share_link (
  id BIGINT NOT NULL AUTO_INCREMENT,
  creator_id BIGINT NOT NULL,
  type VARCHAR(20) NOT NULL,
  reference_id BIGINT NOT NULL,
  share_code VARCHAR(32) NOT NULL,
  expires_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_share_code (share_code),
  UNIQUE KEY uk_share_target (creator_id, type, reference_id),
  CONSTRAINT fk_share_creator FOREIGN KEY (creator_id) REFERENCES tbl_user(id)
);

-- 함께 달리기 방 (TGT-001~012, 45장): 명세 20장 ERD live_run_room · live_run_member.
-- course_id는 ERD에 없지만 방 만들기 화면(SCR-T02)이 코스를 고를 수 있어 더한다. starts_at은 모두 준비된 뒤 서버가 정한 출발 시각(대기실 카운트다운).
-- 두 컬럼 모두 backend/README 결정 사항.
CREATE TABLE tbl_live_run_room (
  id BIGINT NOT NULL AUTO_INCREMENT,
  host_user_id BIGINT NOT NULL,
  mode VARCHAR(20) NOT NULL,
  target_distance_m INT NULL,
  target_seconds INT NULL,
  course_id BIGINT NULL,
  scheduled_at DATETIME(3) NULL,
  status VARCHAR(20) NOT NULL,
  starts_at DATETIME(3) NULL,
  started_at DATETIME(3) NULL,
  ended_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_live_room_host (host_user_id, created_at),
  CONSTRAINT fk_live_room_host FOREIGN KEY (host_user_id) REFERENCES tbl_user(id),
  CONSTRAINT fk_live_room_course FOREIGN KEY (course_id) REFERENCES tbl_course(id)
);

CREATE TABLE tbl_live_run_member (
  room_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  run_id BIGINT NULL,
  status VARCHAR(20) NOT NULL,
  final_distance_m INT NULL,
  final_elapsed_seconds INT NULL,
  rank_no INT NULL,
  joined_at DATETIME(3) NOT NULL,
  finished_at DATETIME(3) NULL,
  PRIMARY KEY (room_id, user_id),
  KEY idx_live_member_room_status (room_id, status),
  KEY idx_live_member_user (user_id, joined_at),
  CONSTRAINT fk_live_member_room FOREIGN KEY (room_id) REFERENCES tbl_live_run_room(id),
  CONSTRAINT fk_live_member_user FOREIGN KEY (user_id) REFERENCES tbl_user(id),
  CONSTRAINT fk_live_member_run FOREIGN KEY (run_id) REFERENCES tbl_run(id)
);
