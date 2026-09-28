import type { Me, MyProfile, NicknameCheck, ProfileUpdate } from '../types';

// 119장 repository 경계. 실제 구현: GET · PATCH /api/v1/users/me (MY-001, AUTH-002).
export interface UserRepository {
  getMe(): Promise<Me>;
  updateMe(update: ProfileUpdate): Promise<MyProfile>;
  // AUTH-002 닉네임 중복 확인. 서버 PATCH가 409를 주기 전에 미리 알려준다.
  checkNickname(nickname: string): Promise<NicknameCheck>;
}
