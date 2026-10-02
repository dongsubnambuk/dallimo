-- GPS Batch를 받을 때마다 "1부터 빠짐없이 이어진 마지막 seq"를 처음부터 다시 세면 러닝이 길수록 느려진다 (결정 로그 70항).
-- 확인한 값을 Run에 저장해 두고 다음 Batch는 그 뒤부터만 센다. 이미 있는 Run은 0에서 시작해 처음 한 번만 전체를 센다
ALTER TABLE tbl_run ADD COLUMN contiguous_seq INT NOT NULL DEFAULT 0;
