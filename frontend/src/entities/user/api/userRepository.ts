import type { Me } from '../types';

// 119장 repository 경계. 실제 구현: GET /api/v1/users/me (MY-001).
export interface UserRepository {
  getMe(): Promise<Me>;
}
