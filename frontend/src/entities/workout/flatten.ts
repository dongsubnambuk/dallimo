import type { FlatStep, WorkoutBlock } from './types';

/** 반복을 풀어 달리는 순서대로 */
export function flattenBlocks(blocks: WorkoutBlock[]): FlatStep[] {
  const out: FlatStep[] = [];
  for (const b of blocks) {
    const repeat = b.type === 'REPEAT';
    const times = repeat ? b.repeatCount : 1;
    for (let r = 1; r <= times; r++) {
      for (const s of b.steps) out.push({ ...s, repeatIndex: repeat ? r : null, repeatCount: repeat ? b.repeatCount : null });
    }
  }
  return out;
}
