import { toProfile, type UserDto } from '@/entities/auth/api/httpAuthRepository';
import { runResultRepository } from '@/entities/run/api';
import { ApiRequestError, apiRequest } from '@/shared/api/http';
import { getItem, removeItem, setItem } from '@/shared/storage/keyValueStore';

import type { Me, MyProfile } from '../types';
import { checkNicknameLocal } from './mockUserRepository';
import type { UserRepository } from './userRepository';

// 서버 사용자 API: GET · PATCH /api/v1/users/me, GET /api/v1/users/nickname-availability.
// 프로필 사진 업로드는 서버 저장소(S3) 결정 전이라 이 기기에만 둔다.
// 누적 통계는 서버 집계 API가 아직 없어 이 기기의 러닝 기록으로 더한다.
const photoKey = (userId: string) => `dallimo.profilePhoto.${userId}`;

async function withLocalPhoto(p: MyProfile): Promise<MyProfile> {
  return { ...p, profileImageUrl: p.profileImageUrl ?? ((await getItem(photoKey(p.userId))) || null) };
}

export function createHttpUserRepository(): UserRepository {
  return {
    async getMe(): Promise<Me> {
      const profile = await withLocalPhoto(toProfile(await apiRequest<UserDto>('/api/v1/users/me')));
      const items = [];
      let cursor: string | null = null;
      do {
        const page = await runResultRepository.list(cursor, 50);
        items.push(...page.items);
        cursor = page.nextCursor;
      } while (cursor);
      return {
        profile,
        stats: {
          totalDistanceM: items.reduce((s, r) => s + r.distanceM, 0),
          totalActiveSec: items.reduce((s, r) => s + r.activeSec, 0),
          runCount: items.length,
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
