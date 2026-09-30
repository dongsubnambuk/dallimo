-- 외부 공개 데이터로 만든 추천 코스 (사용자 결정: 명세 2.1장 MVP 제외 "전국 자동 코스 생성"을 외부 데이터 가져오기로 넣는다, FOUNDATION-DECISION-LOG 52항)
-- source: USER(사용자가 기록으로 등록) · OSM(OpenStreetMap, Overpass API) · DURUNUBI(한국관광공사 두루누비) · GPX(관리자가 올린 GPX 파일)
-- source_ref: 원본에서 이 코스를 가리키는 값 (예: relation/123, 두루누비 crsIdx). 같은 원본은 한 번만 들어간다
-- attribution · license · source_url: 코스 상세에 보여 줄 출처 (OSM은 ODbL 출처 표시 의무)
ALTER TABLE tbl_course
  ADD COLUMN source VARCHAR(20) NOT NULL DEFAULT 'USER',
  ADD COLUMN source_ref VARCHAR(100) NULL,
  ADD COLUMN attribution VARCHAR(200) NULL,
  ADD COLUMN license VARCHAR(50) NULL,
  ADD COLUMN source_url VARCHAR(500) NULL;

CREATE UNIQUE INDEX uk_course_source_ref ON tbl_course (source, source_ref);
