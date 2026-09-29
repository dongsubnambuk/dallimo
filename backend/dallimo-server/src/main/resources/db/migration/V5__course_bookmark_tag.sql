-- 코스 저장(CRS-105): 명세 20장 ERD course_bookmark. 22.4장 최종 DDL에 빠져 있어 ERD 그대로 추가한다.
CREATE TABLE tbl_course_bookmark (
  user_id BIGINT NOT NULL,
  course_id BIGINT NOT NULL,
  created_at DATETIME(3) NOT NULL,
  PRIMARY KEY (user_id, course_id),
  KEY idx_bookmark_course (course_id),
  CONSTRAINT fk_bookmark_user FOREIGN KEY (user_id) REFERENCES tbl_user(id),
  CONSTRAINT fk_bookmark_course FOREIGN KEY (course_id) REFERENCES tbl_course(id)
);

-- 코스 태그: 43장 POST /courses 요청의 tags. ERD에 저장할 곳이 없어 추가한다 (backend/README 결정 사항).
CREATE TABLE tbl_course_tag (
  course_id BIGINT NOT NULL,
  tag VARCHAR(20) NOT NULL,
  seq INT NOT NULL,
  PRIMARY KEY (course_id, tag),
  CONSTRAINT fk_course_tag_course FOREIGN KEY (course_id) REFERENCES tbl_course(id)
);
