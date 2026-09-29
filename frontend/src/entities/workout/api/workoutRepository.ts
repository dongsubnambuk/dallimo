import type { Workout, WorkoutDraft } from '../types';

// 126장 Workout API 경계: 내 인터벌 목록 · 보기 · 저장 · 고치기(버전 올림) · 지우기 · 복제
export interface WorkoutRepository {
  list(): Promise<Workout[]>;
  get(id: string): Promise<Workout>;
  create(draft: WorkoutDraft): Promise<Workout>;
  update(id: string, draft: WorkoutDraft): Promise<Workout>;
  remove(id: string): Promise<void>;
  duplicate(id: string): Promise<Workout>;
}
