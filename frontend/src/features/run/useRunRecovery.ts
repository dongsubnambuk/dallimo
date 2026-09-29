import { router } from 'expo-router';
import { useEffect } from 'react';

import type { RunPlanParams } from '@/features/run-ready/runPlanParams';

import { getActiveRun } from './engine/activeRunSession';
import { getRunStore } from './engine/runStore';

// 11.3장: 앱을 다시 켰을 때 RUNNING · PAUSED로 남은 러닝이 있으면 카운트다운 없이 러닝 화면으로 이어간다.
// 앱을 켤 때 한 번만 확인한다.
let checked = false;

export function useRunRecovery() {
  useEffect(() => {
    if (checked) return;
    checked = true;
    getRunStore()
      .then((store) => store.findOpenRun())
      .then((run) => {
        if (!run || getActiveRun()) return;
        router.push({ pathname: '/run/active', params: { ...parsePlan(run.plan), mode: run.mode, resume: '1' } });
      })
      .catch((e) => console.warn('[run] recovery check', e));
  }, []);
}

function parsePlan(plan: string | null): RunPlanParams {
  try {
    const p: unknown = plan ? JSON.parse(plan) : null;
    return p && typeof p === 'object' ? (p as RunPlanParams) : {};
  } catch {
    return {};
  }
}
