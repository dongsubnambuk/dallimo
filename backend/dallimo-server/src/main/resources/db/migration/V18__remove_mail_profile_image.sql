-- 메일 발송(이메일 인증 코드로 하는 비밀번호 재설정 · 알림)을 뺐다 (사용자 결정, FOUNDATION-DECISION-LOG 60항).
-- V17에서 만든 인증 코드 표를 지운다
DROP TABLE IF EXISTS tbl_password_reset;

-- 프로필 사진도 뺐다(같은 결정). 컬럼은 명세 22.4장 DDL이라 남기고 저장된 주소만 지운다
UPDATE tbl_user SET profile_image_url = NULL WHERE profile_image_url IS NOT NULL;
