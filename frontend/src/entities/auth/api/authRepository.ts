import type { AuthProvider, AuthTokens, SocialLoginResult } from '../types';

// 119장 repository 경계. 41장 POST /auth/social · /auth/refresh · /auth/logout.
// 서버가 provider credential을 검증한다. 앱은 provider user id를 직접 보내지 않는다 (41.1장).
export interface AuthRepository {
  socialLogin(provider: AuthProvider, credential: string, deviceId: string): Promise<SocialLoginResult>;
  refresh(refreshToken: string, deviceId: string): Promise<AuthTokens>;
  logout(refreshToken: string): Promise<void>;
  // AUTH-004 탈퇴. 41장 표에 경로가 아직 없어 OpenAPI 확정 시 맞춘다.
  withdraw(): Promise<void>;
}

// 401: 토큰이 만료되었거나 폐기됨 → 다시 로그인. network: 서버에 닿지 못함 → 저장된 세션으로 계속.
export class AuthError extends Error {
  constructor(
    readonly kind: 'unauthorized' | 'network',
    message: string,
  ) {
    super(message);
  }
}
