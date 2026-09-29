import type { Challenge } from '../types';

export interface ChallengeRepository {
  // CHL-001: 친구의 인증 기록 하나를 목표로
  create(targetRecordId: string): Promise<Challenge>;
  get(id: string): Promise<Challenge>;
  // 아직 달리지 않은 도전만
  cancel(id: string): Promise<Challenge>;
  // 보낸 · 받은 도전 (최근 먼저). userId: 그 친구와 주고받은 것만
  list(userId?: string): Promise<Challenge[]>;
}
