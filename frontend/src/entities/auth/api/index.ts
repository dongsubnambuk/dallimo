import { API_BASE_URL } from '@/shared/api/config';

import type { AuthRepository } from './authRepository';
import { createHttpAuthRepository } from './httpAuthRepository';
import { createMockAuthRepository } from './mockAuthRepository';

// 서버 주소가 있으면 실제 서버, 없으면 mock
export const USES_AUTH_SERVER = API_BASE_URL != null;
export const authRepository: AuthRepository = USES_AUTH_SERVER ? createHttpAuthRepository() : createMockAuthRepository();
