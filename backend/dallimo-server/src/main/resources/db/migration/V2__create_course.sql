-- 명세 22.4장 최종 Flyway DDL (V2__create_course.sql). 이미 적용된 migration은 고치지 않고 새 버전을 추가한다.
CREATE TABLE tbl_course (
  id BIGINT NOT NULL AUTO_INCREMENT,
  creator_id BIGINT NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT NULL,
  distance_m INT NOT NULL,
  start_lat DECIMAL(10,7) NOT NULL,
  start_lng DECIMAL(10,7) NOT NULL,
  end_lat DECIMAL(10,7) NOT NULL,
  end_lng DECIMAL(10,7) NOT NULL,
  elevation_gain_m DECIMAL(8,2) NULL,
  difficulty VARCHAR(20) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'NEW',
  visibility VARCHAR(20) NOT NULL DEFAULT 'PUBLIC',
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  deleted_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  KEY idx_course_status_visibility (status, visibility),
  KEY idx_course_start_coordinate (start_lat, start_lng),
  KEY idx_course_creator_created (creator_id, created_at),
  CONSTRAINT fk_course_creator FOREIGN KEY (creator_id)
    REFERENCES tbl_user(id)
);

CREATE TABLE tbl_course_route_point (
  id BIGINT NOT NULL AUTO_INCREMENT,
  course_id BIGINT NOT NULL,
  seq INT NOT NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  altitude_m DECIMAL(8,2) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_course_route_seq (course_id, seq),
  CONSTRAINT fk_course_route_course FOREIGN KEY (course_id)
    REFERENCES tbl_course(id)
);
