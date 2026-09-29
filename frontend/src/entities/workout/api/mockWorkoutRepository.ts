import { ApiRequestError } from '@/shared/api/http';

import { RECOMMENDED_WORKOUTS } from '../templates';
import type { Workout, WorkoutDraft } from '../types';
import type { WorkoutRepository } from './workoutRepository';

// 서버 없이 쓰는 인터벌 저장소 (앱을 켜 둔 동안만). 개발용 상황: empty(저장한 인터벌 없음) · error(불러오기 실패)
export const WORKOUT_SCENARIOS = ['normal', 'empty', 'error'] as const;
export type WorkoutScenario = (typeof WORKOUT_SCENARIOS)[number];

export function parseWorkoutScenario(value: unknown): WorkoutScenario {
  if (!__DEV__) return 'normal';
  return (WORKOUT_SCENARIOS as readonly unknown[]).includes(value) ? (value as WorkoutScenario) : 'normal';
}

const DAY = 86_400_000;
const saved = new Map<string, Workout>();
let nextId = 1;
let seeded = false;

function seed() {
  if (seeded) return;
  seeded = true;
  const t = Date.now();
  const w: Workout = { ...RECOMMENDED_WORKOUTS[0], id: `w-${nextId++}`, version: 2, name: '화요일 트랙', description: null, createdAt: t - 9 * DAY, updatedAt: t - 2 * DAY, lastRunAt: t - 2 * DAY, runCount: 3 };
  saved.set(w.id, w);
}

const wait = () => new Promise((r) => setTimeout(r, 300));
const copy = (w: Workout): Workout => ({ ...w, blocks: w.blocks.map((b) => ({ ...b, steps: b.steps.map((s) => ({ ...s })) })) });

export function createMockWorkoutRepository(scenario: WorkoutScenario = 'normal'): WorkoutRepository {
  if (scenario === 'normal') seed();
  const find = (id: string) => {
    const w = saved.get(id);
    if (!w) throw new ApiRequestError(404, 'RESOURCE_NOT_FOUND', '인터벌을 찾을 수 없어요.');
    return w;
  };
  const create = (draft: WorkoutDraft): Workout => {
    const t = Date.now();
    const w: Workout = { id: `w-${nextId++}`, version: 1, ...draft, name: draft.name.trim(), createdAt: t, updatedAt: t, lastRunAt: null, runCount: 0 };
    saved.set(w.id, w);
    return copy(w);
  };
  return {
    async list() {
      await wait();
      if (scenario === 'error') throw new ApiRequestError(0, 'NETWORK', '서버에 연결하지 못했어요');
      if (scenario === 'empty') return [];
      return [...saved.values()].sort((a, b) => b.updatedAt - a.updatedAt).map(copy);
    },
    async get(id) {
      await wait();
      return copy(find(id));
    },
    async create(draft) {
      await wait();
      return create(draft);
    },
    async update(id, draft) {
      await wait();
      const w = find(id);
      const next: Workout = { ...w, ...draft, name: draft.name.trim(), version: w.version + 1, updatedAt: Date.now() };
      saved.set(id, next);
      return copy(next);
    },
    async remove(id) {
      await wait();
      saved.delete(id);
    },
    async duplicate(id) {
      await wait();
      const w = find(id);
      const name = `${w.name} 복사본`;
      return create({ name: name.length > 40 ? `${w.name.slice(0, 36).trim()} 복사본` : name, description: w.description, blocks: w.blocks });
    },
  };
}
