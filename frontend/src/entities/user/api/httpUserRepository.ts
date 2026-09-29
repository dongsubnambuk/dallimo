import { toProfile, type UserDto } from '@/entities/auth/api/httpAuthRepository';
import { runResultRepository } from '@/entities/run/api';
import { ApiRequestError, apiRequest } from '@/shared/api/http';
import { getItem, removeItem, setItem } from '@/shared/storage/keyValueStore';

import type { Me, MyProfile } from '../types';
import { checkNicknameLocal } from './mockUserRepository';
import type { UserRepository } from './userRepository';

// 서버 사용자 API: GET · PATCH /api/v1/users/me, GET /api/v1/users/nickname-availability.
// 프로필 사진 업로드는 서버 저장소(S3) 결정 전이라 이 기기에만 둔다.
// 누적 통계(MY-002)는 서버가 끝난 러닝을 모은 값(GET /users/me stats)에, 아직 서버에 올리지 못한 이 기기 기록을 더한다.
const photoKey = (userId: string) => `dallimo.profilePhoto.${userId}`;

async function withLocalPhoto(p: MyProfile): Promise<MyProfile> {
  return { ...p, profileImageUrl: p.profileImageUrl ?? ((await getItem(photoKey(p.userId))) || null) };
}

export function createHttpUserRepository(): UserRepository {
  return {
    async getMe(): Promise<Me> {
      const dto = await apiRequest<UserDto & { stats: { runCount: number; totalDistanceM: number; totalActiveSec: number } }>('/api/v1/users/me');
      const profile = await withLocalPhoto(toProfile(dto));
      // 첫 페이지에 이 기기에만 있는(올리는 중 · 오프라인) 기록이 모두 들어 있다
      const pending = (await runResultRepository.list(null, 20).catch(() => ({ items: [] }))).items.filter((r) => r.sync !== 'synced');
      return {
        profile,
        stats: {
          totalDistanceM: dto.stats.totalDistanceM + pending.reduce((s, r) => s + r.distanceM, 0),
          totalActiveSec: dto.stats.totalActiveSec + pending.reduce((s, r) => s + r.activeSec, 0),
          runCount: dto.stats.runCount + pending.length,
        },
      };
    },
    async updateMe(update) {
      let profile: MyProfile;
      try {
        profile = toProfile(
          update.nickname != null
            ? await apiRequest<UserDto>('/api/v1/users/me', { method: 'PATCH', body: { nickname: update.nickname.trim() } })
            : await apiRequest<UserDto>('/api/v1/users/me'),
        );
      } catch (e) {
        if (e instanceof ApiRequestError && e.code === 'NICKNAME_ALREADY_EXISTS') throw new Error('taken');
        throw e;
      }
      if (update.profileImageUri !== undefined) {
        if (update.profileImageUri) await setItem(photoKey(profile.userId), update.profileImageUri);
        else await removeItem(photoKey(profile.userId));
      }
      return withLocalPhoto(profile);
    },
    async checkNickname(nickname) {
      const local = checkNicknameLocal(nickname);
      if (local) return local;
      const r = await apiRequest<{ available: boolean }>('/api/v1/users/nickname-availability', { query: { nickname: nickname.trim() } });
      return r.available ? 'ok' : 'taken';
    },
  };
}
