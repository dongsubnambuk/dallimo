import type { MyProfile } from '@/entities/user/types';
import { fromIso } from '@/shared/api/contract';
import { ApiRequestError, apiRequest } from '@/shared/api/http';

import type { AuthSession } from '../types';
import { AuthError, type AuthRepository } from './authRepository';

// 서버 응답 (backend AuthDtos.AuthResponse · UserResponse)
export type UserDto = { userId: number; email: string | null; nickname: string; profileImageUrl: string | null; friendCode: string };
type AuthResponseDto = {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  user: UserDto;
};

export const toProfile = (u: UserDto): MyProfile => ({
  userId: String(u.userId),
  email: u.email ?? '',
  nickname: u.nickname,
  profileImageUrl: u.profileImageUrl,
  friendCode: u.friendCode,
});

const toSession = (r: AuthResponseDto): AuthSession => ({
  tokens: {
    accessToken: r.accessToken,
    accessTokenExpiresAt: fromIso(r.accessTokenExpiresAt),
    refreshToken: r.refreshToken,
    refreshTokenExpiresAt: fromIso(r.refreshTokenExpiresAt),
  },
  user: toProfile(r.user),
});

function toAuthError(e: unknown): never {
  if (e instanceof ApiRequestError) {
    switch (e.code) {
      case 'NETWORK':
      case 'INTERNAL_ERROR':
      case 'RATE_LIMITED':
        throw new AuthError('network', e.message);
      case 'INVALID_CREDENTIALS':
        throw new AuthError('invalidCredentials', e.message);
      case 'EMAIL_ALREADY_EXISTS':
        throw new AuthError('emailTaken', e.message);
      case 'NICKNAME_ALREADY_EXISTS':
        throw new AuthError('nicknameTaken', e.message);
      case 'VALIDATION_ERROR':
        throw new AuthError('invalid', e.message);
      default:
        if (e.status === 401) throw new AuthError('unauthorized', e.message);
        throw new AuthError('network', e.message);
    }
  }
  throw new AuthError('network', '서버에 연결하지 못했어요');
}

export function createHttpAuthRepository(): AuthRepository {
  return {
    signup: (input, deviceId) =>
      apiRequest<AuthResponseDto>('/api/v1/auth/signup', { method: 'POST', auth: false, body: { ...input, deviceId } }).then(toSession, toAuthError),
    login: (email, password, deviceId) =>
      apiRequest<AuthResponseDto>('/api/v1/auth/login', { method: 'POST', auth: false, body: { email, password, deviceId } }).then(toSession, toAuthError),
    refresh: (refreshToken, deviceId) =>
      apiRequest<AuthResponseDto>('/api/v1/auth/refresh', { method: 'POST', auth: false, body: { refreshToken, deviceId } }).then(toSession, toAuthError),
    logout: () => apiRequest<void>('/api/v1/auth/logout', { method: 'POST' }).catch(toAuthError),
    withdraw: () => apiRequest<void>('/api/v1/users/me', { method: 'DELETE' }).catch(toAuthError),
  };
}
