import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { runResultRepository } from '@/entities/run/api';
import { getWorkoutRepository } from '@/entities/workout/api';
import type { WorkoutScenario } from '@/entities/workout/api/mockWorkoutRepository';

// 인터벌 목록 · 한 개 · 최근 인터벌 달리기 (TanStack Query 키를 한곳에서)
export const workoutKeys = {
  all: ['workouts'] as const,
  list: (scenario: WorkoutScenario) => ['workouts', scenario, 'list'] as const,
  one: (scenario: WorkoutScenario, id: string) => ['workouts', scenario, id] as const,
  recentRuns: ['runs', 'history', 'INTERVAL'] as const,
};

export function useWorkoutRepository(scenario: WorkoutScenario) {
  return useMemo(() => getWorkoutRepository(scenario), [scenario]);
}

export function useWorkoutList(scenario: WorkoutScenario) {
  const repo = useWorkoutRepository(scenario);
  return useQuery({ queryKey: workoutKeys.list(scenario), queryFn: () => repo.list(), retry: false });
}

export function useWorkout(scenario: WorkoutScenario, id: string | null) {
  const repo = useWorkoutRepository(scenario);
  return useQuery({ queryKey: workoutKeys.one(scenario, id ?? ''), queryFn: () => repo.get(id as string), enabled: id != null, retry: false });
}

// 123.1장 "최근 훈련": 최근 인터벌 달리기 3개
export function useRecentIntervalRuns() {
  return useQuery({ queryKey: workoutKeys.recentRuns, queryFn: () => runResultRepository.list(null, 3, 'INTERVAL'), retry: false });
}
