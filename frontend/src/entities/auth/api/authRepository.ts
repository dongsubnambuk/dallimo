import type { AuthSession, SignupInput } from '../types';

// 인증 repository 경계. 서버: POST /auth/signup · /login · /refresh · /logout · /password/*, DELETE /users/me.
export interface AuthRepository {
  signup(input: SignupInput, deviceId: string): Promise<AuthSession>;
  login(email: string, password: string, deviceId: string): Promise<AuthSession>;
  // Refresh Token 회전: 새 Access · Refresh Token을 함께 받는다
  refresh(refreshToken: string, deviceId: string): Promise<AuthSession>;
  // 이 기기의 세션을 끊는다
  logout(): Promise<void>;
  // AUTH-004 탈퇴
  withdraw(): Promise<void>;
  // 비밀번호 변경 (결정 로그 58항). 이 기기는 로그인이 이어지고 다른 기기는 로그아웃된다
  changePassword(currentPassword: string, newPassword: string): Promise<void>;
  // 재설정 인증 코드를 메일로 받는다. 가입하지 않은 이메일도 같은 응답이다
  requestPasswordReset(email: string): Promise<void>;
  // 코드로 새 비밀번호를 정한다. 모든 기기가 로그아웃된다
  resetPassword(email: string, code: string, newPassword: string): Promise<void>;
}

// unauthorized: 세션이 끝났다 → 다시 로그인. network: 서버에 닿지 못함 → 저장된 세션으로 계속.
// invalidCredentials: 이메일 · 비밀번호가 맞지 않음. emailTaken · nicknameTaken: 가입 중복. invalid: 입력 규칙 위반.
// passwordMismatch: 비밀번호 변경의 지금 비밀번호가 틀림. resetCodeInvalid: 재설정 코드가 틀림 · 만료 · 5번 틀려 잠김.
export type AuthErrorKind =
  | 'unauthorized'
  | 'network'
  | 'invalidCredentials'
  | 'emailTaken'
  | 'nicknameTaken'
  | 'invalid'
  | 'passwordMismatch'
  | 'resetCodeInvalid';

export class AuthError extends Error {
  constructor(
    readonly kind: AuthErrorKind,
    message: string,
  ) {
    super(message);
  }
}
