import type { WorkoutPlan } from './types';

/** 인터벌 JSON(route param · 기기에 저장한 계획)을 읽는다. 모양이 틀리면 null */
export function parseWorkoutPlan(json: string | undefined | null): WorkoutPlan | null {
  if (!json) return null;
  try {
    const w = JSON.parse(json) as WorkoutPlan;
    if (typeof w?.name !== 'string' || !Array.isArray(w.blocks) || w.blocks.length === 0) return null;
    const ok = w.blocks.every((b) => Array.isArray(b?.steps) && b.steps.length > 0 && Number.isInteger(b.repeatCount) && b.repeatCount >= 1);
    return ok ? { id: w.id ?? null, version: w.version ?? null, name: w.name, blocks: w.blocks } : null;
  } catch {
    return null;
  }
}

export function serializeWorkoutPlan(w: WorkoutPlan): string {
  return JSON.stringify({ id: w.id, version: w.version, name: w.name, blocks: w.blocks });
}
