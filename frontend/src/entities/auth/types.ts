import type { MyProfile } from '@/entities/user/types';

// 이메일 로그인 (사용자 결정: 소셜 로그인 대신 이메일 · 비밀번호 · 닉네임. 명세 41장 변경, FOUNDATION-DECISION-LOG 30항)

export type AuthTokens = {
  accessToken: string;
  // epoch ms
  accessTokenExpiresAt: number;
  // 기기에만 저장한다 (SecureStore)
  refreshToken: string;
  refreshTokenExpiresAt: number;
};

// 가입 · 로그인 · refresh 응답
export type AuthSession = { tokens: AuthTokens; user: MyProfile };

export type SignupInput = { email: string; password: string; nickname: string };

// 서버와 같은 규칙 (backend AuthDtos.PASSWORD_RULE): 8~64자, 영문과 숫자를 함께, 공백 없이
export const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d)\S{8,64}$/;
export const EMAIL_MAX = 191;
export const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
