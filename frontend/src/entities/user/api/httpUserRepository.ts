import { Platform } from 'react-native';

import { toProfile, type UserDto } from '@/entities/auth/api/httpAuthRepository';
import { runResultRepository } from '@/entities/run/api';
import { ApiRequestError, apiRequest } from '@/shared/api/http';

import type { Me } from '../types';
import { checkNicknameLocal } from './mockUserRepository';
import { ProfilePhotoError, type UserRepository } from './userRepository';

// 서버 사용자 API: GET · PATCH /api/v1/users/me, DELETE /api/v1/users/me/profile-image, GET /api/v1/users/nickname-availability.
// 프로필 사진은 PATCH /users/me multipart(nickname?, profileImage?)로 올린다 (41장). 서버가 정사각형 512px로 다시 만든다.
// 누적 통계(MY-002)는 서버가 끝난 러닝을 모은 값(GET /users/me stats)에, 아직 서버에 올리지 못한 이 기기 기록을 더한다.

// 기기에서 고른 사진(file · content · blob · data 주소)인가. 서버 주소(http)면 이미 올린 사진이다
const isLocalImage = (uri: string) => !/^https?:\/\//.test(uri);

async function photoPart(uri: string): Promise<Blob> {
  // 웹은 blob · data 주소를 Blob으로. 앱은 { uri, name, type }을 FormData가 파일로 보낸다
  if (Platform.OS === 'web') return (await fetch(uri)).blob();
  const type = /\.png(\?|$)/i.test(uri) ? 'image/png' : 'image/jpeg';
  return { uri, name: type === 'image/png' ? 'profile.png' : 'profile.jpg', type } as unknown as Blob;
}

export function createHttpUserRepository(): UserRepository {
  return {
    async getMe(): Promise<Me> {
      const dto = await apiRequest<UserDto & { stats: { runCount: number; totalDistanceM: number; totalActiveSec: number } }>('/api/v1/users/me');
      // 첫 페이지에 이 기기에만 있는(올리는 중 · 오프라인) 기록이 모두 들어 있다
      const pending = (await runResultRepository.list(null, 20).catch(() => ({ items: [] }))).items.filter((r) => r.sync !== 'synced');
      return {
        profile: toProfile(dto),
        stats: {
          totalDistanceM: dto.stats.totalDistanceM + pending.reduce((s, r) => s + r.distanceM, 0),
          totalActiveSec: dto.stats.totalActiveSec + pending.reduce((s, r) => s + r.activeSec, 0),
          runCount: dto.stats.runCount + pending.length,
        },
      };
    },
    async updateMe(update) {
      const nickname = update.nickname?.trim();
      const photo = update.profileImageUri;
      try {
        // 새 사진: 닉네임과 한 번에 (사진이 틀리면 닉네임도 바뀌지 않는다)
        if (photo && isLocalImage(photo)) {
          const form = new FormData();
          if (nickname) form.append('nickname', nickname);
          form.append('profileImage', await photoPart(photo), 'profile.jpg');
          return toProfile(await apiRequest<UserDto>('/api/v1/users/me', { method: 'PATCH', body: form }));
        }
        let dto = nickname ? await apiRequest<UserDto>('/api/v1/users/me', { method: 'PATCH', body: { nickname } }) : null;
        // 사진 빼기
        if (photo === null) dto = await apiRequest<UserDto>('/api/v1/users/me/profile-image', { method: 'DELETE' });
        return toProfile(dto ?? (await apiRequest<UserDto>('/api/v1/users/me')));
      } catch (e) {
        if (e instanceof ApiRequestError && e.code === 'NICKNAME_ALREADY_EXISTS') throw new Error('taken');
        // 사진을 받을 수 없음 (형식 · 크기): 서버 문구를 그대로 보여준다
        if (e instanceof ApiRequestError && photo && e.code === 'VALIDATION_ERROR') throw new ProfilePhotoError(e.message);
        throw e;
      }
    },
    async checkNickname(nickname) {
      const local = checkNicknameLocal(nickname);
      if (local) return local;
      const r = await apiRequest<{ available: boolean }>('/api/v1/users/nickname-availability', { query: { nickname: nickname.trim() } });
      return r.available ? 'ok' : 'taken';
    },
  };
}
