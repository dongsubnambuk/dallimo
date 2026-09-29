-- 사용자 결정: 소셜 로그인 대신 이메일 · 비밀번호 · 닉네임 가입 (명세 41장 변경, FOUNDATION-DECISION-LOG 30항)
-- 이메일 가입자는 provider = 'EMAIL', provider_user_id = 소문자 이메일. 소셜 로그인을 다시 붙여도 같은 표를 쓴다.
ALTER TABLE tbl_user
  ADD COLUMN password_hash VARCHAR(100) NULL;

-- Refresh Token 회전: 바로 전 토큰은 짧은 시간 동안만 다시 받아 준다 (응답을 못 받은 재시도 대비).
-- 그 뒤에 옛 토큰이 오면 탈취로 보고 세션을 끊는다.
ALTER TABLE tbl_refresh_token
  ADD COLUMN previous_token_hash VARCHAR(255) NULL,
  ADD COLUMN rotated_at DATETIME(3) NULL;
