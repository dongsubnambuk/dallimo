-- 온보딩 러너 정보 (사용자 결정, FOUNDATION-DECISION-LOG 64항). 명세 22.4장 tbl_user에 없는 값이다.
-- 평소 달리는 거리 · 러닝 경험 · 주로 달리는 시간. 고르지 않았으면 NULL. 탐색 추천 코스에 쓴다
ALTER TABLE tbl_user
  ADD COLUMN runner_distance VARCHAR(20) NULL,
  ADD COLUMN runner_experience VARCHAR(20) NULL,
  ADD COLUMN runner_time VARCHAR(20) NULL;
