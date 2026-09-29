import { apiRequest } from '@/shared/api/http';

import type { Workout, WorkoutBlock, WorkoutDraft } from '../types';
import type { WorkoutRepository } from './workoutRepository';

// 인터벌 API (backend WorkoutController)
type Dto = {
  id: number;
  name: string;
  description: string | null;
  version: number;
  blocks: WorkoutBlock[];
  createdAt: string;
  updatedAt: string;
  lastRunAt: string | null;
  runCount: number;
};

const toWorkout = (w: Dto): Workout => ({
  id: String(w.id),
  name: w.name,
  description: w.description,
  version: w.version,
  blocks: w.blocks.map((b) => ({ type: b.type, repeatCount: b.repeatCount, steps: b.steps.map((s) => ({ ...s })) })),
  createdAt: Date.parse(w.createdAt),
  updatedAt: Date.parse(w.updatedAt),
  lastRunAt: w.lastRunAt ? Date.parse(w.lastRunAt) : null,
  runCount: w.runCount,
});

const path = (id: string) => `/api/v1/workouts/${encodeURIComponent(id)}`;

export function createHttpWorkoutRepository(): WorkoutRepository {
  return {
    list: () => apiRequest<Dto[]>('/api/v1/workouts').then((l) => l.map(toWorkout)),
    get: (id) => apiRequest<Dto>(path(id)).then(toWorkout),
    create: (draft: WorkoutDraft) => apiRequest<Dto>('/api/v1/workouts', { method: 'POST', body: draft }).then(toWorkout),
    update: (id, draft) => apiRequest<Dto>(path(id), { method: 'PUT', body: draft }).then(toWorkout),
    remove: (id) => apiRequest<void>(path(id), { method: 'DELETE' }),
    duplicate: (id) => apiRequest<Dto>(`${path(id)}/duplicate`, { method: 'POST' }).then(toWorkout),
  };
}
