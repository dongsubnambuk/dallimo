import type { MyProfile } from '@/entities/user/types';

// 41장 인증 계약. provider는 tbl_user.provider 값.
export type AuthProvider = 'APPLE' | 'GOOGLE' | 'KAKAO';

export type AuthTokens = { accessToken: string; refreshToken: string };

// POST /api/v1/auth/social 응답 (accessToken, refreshToken, user). 처음 가입이면 프로필 설정(SCR-A02)으로 간다.
export type SocialLoginResult = { tokens: AuthTokens; user: MyProfile; isNewUser: boolean };
