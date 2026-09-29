import type { AuthSession, SignupInput } from '../types';

// 인증 repository 경계. 서버: POST /auth/signup · /login · /refresh · /logout, DELETE /users/me.
export interface AuthRepository {
  signup(input: SignupInput, deviceId: string): Promise<AuthSession>;
  login(email: string, password: string, deviceId: string): Promise<AuthSession>;
  // Refresh Token 회전: 새 Access · Refresh Token을 함께 받는다
  refresh(refreshToken: string, deviceId: string): Promise<AuthSession>;
  // 이 기기의 세션을 끊는다
  logout(): Promise<void>;
  // AUTH-004 탈퇴
  withdraw(): Promise<void>;
}

// unauthorized: 세션이 끝났다 → 다시 로그인. network: 서버에 닿지 못함 → 저장된 세션으로 계속.
// invalidCredentials: 이메일 · 비밀번호가 맞지 않음. emailTaken · nicknameTaken: 가입 중복. invalid: 입력 규칙 위반.
export type AuthErrorKind = 'unauthorized' | 'network' | 'invalidCredentials' | 'emailTaken' | 'nicknameTaken' | 'invalid';

export class AuthError extends Error {
  constructor(
    readonly kind: AuthErrorKind,
    message: string,
  ) {
    super(message);
  }
}
