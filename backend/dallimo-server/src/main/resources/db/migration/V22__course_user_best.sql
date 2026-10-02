-- 23.1장: 랭킹 GROUP BY가 병목이 되면 사용자별 최고 기록 projection을 둔다 (결정 로그 70항, 기록 10만 건에서 실측).
-- 코스 · 사용자마다 공식 기록(tbl_course_record) 중 가장 빠른 것 한 줄. 같은 시간이면 먼저 세운 기록(id가 작은 것).
-- 원본은 tbl_course_record 그대로이고, 기록을 저장할 때 그 사용자 한 줄만 원본에서 다시 계산해 넣는다 (CourseBestProjection.REFRESH)
CREATE TABLE tbl_course_user_best (
  course_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  best_seconds INT NOT NULL,
  record_id BIGINT NOT NULL,
  PRIMARY KEY (course_id, user_id),
  KEY idx_course_user_best_rank (course_id, best_seconds, user_id),
  KEY fk_course_user_best_user (user_id),
  KEY fk_course_user_best_record (record_id),
  CONSTRAINT fk_course_user_best_course FOREIGN KEY (course_id) REFERENCES tbl_course(id),
  CONSTRAINT fk_course_user_best_user FOREIGN KEY (user_id) REFERENCES tbl_user(id),
  CONSTRAINT fk_course_user_best_record FOREIGN KEY (record_id) REFERENCES tbl_course_record(id)
);

-- 이미 있는 기록으로 채운다
INSERT INTO tbl_course_user_best (course_id, user_id, best_seconds, record_id)
SELECT b.course_id, b.user_id, b.best, MIN(r.id)
FROM (SELECT course_id, user_id, MIN(duration_seconds) AS best FROM tbl_course_record GROUP BY course_id, user_id) b
JOIN tbl_course_record r ON r.course_id = b.course_id AND r.user_id = b.user_id AND r.duration_seconds = b.best
GROUP BY b.course_id, b.user_id, b.best;
