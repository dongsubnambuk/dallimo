import type { Me, MyProfile, NicknameCheck, ProfileUpdate, RunnerProfile } from '../types';

// 119장 repository 경계. 실제 구현: GET · PATCH /api/v1/users/me (MY-001, AUTH-002).
export interface UserRepository {
  getMe(): Promise<Me>;
  updateMe(update: ProfileUpdate): Promise<MyProfile>;
  // AUTH-002 닉네임 중복 확인. 서버 PATCH가 409를 주기 전에 미리 알려준다.
  checkNickname(nickname: string): Promise<NicknameCheck>;
  // 온보딩 · 설정의 러너 정보. 세 값을 통째로 바꾼다 (PUT /users/me/runner-profile, 결정 로그 64항)
  updateRunnerProfile(profile: RunnerProfile): Promise<RunnerProfile>;
}
