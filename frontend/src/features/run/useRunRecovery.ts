import { router } from 'expo-router';
import { useEffect } from 'react';

import type { RunPlanParams } from '@/features/run-ready/runPlanParams';

import { getActiveRun } from './engine/activeRunSession';
import { getRunStore } from './engine/runStore';
import { liveActivity } from '@/shared/liveActivity/liveActivity';

import { startRunSync } from './sync/runSyncService';

// 11.3장: 앱을 다시 켰을 때 RUNNING · PAUSED로 남은 러닝이 있으면 카운트다운 없이 러닝 화면으로 이어간다.
// 같은 때 기록 동기화도 시작한다.
// 앱을 켤 때 한 번만 확인한다.
let checked = false;

export function useRunRecovery() {
  useEffect(() => {
    if (checked) return;
    checked = true;
    // 서버에 아직 올리지 못한 기록을 이어서 올린다 (29.4장)
    startRunSync();
    getRunStore()
      .then((store) => store.findOpenRun())
      .then((run) => {
        // 앱이 꺼지며 잠금 화면에 남은 러닝 라이브 액티비티를 지운다 (이어 달리면 러닝 화면이 새로 띄운다)
        if (!run && !getActiveRun()) void liveActivity.endAll();
        if (!run || getActiveRun()) return;
        const plan = parsePlan(run.plan);
        // 함께 달리기 중이었으면 그 방으로 돌아간다. 방이 이미 끝났으면 결과가 온다
        if (typeof plan.liveRoomId === 'string') {
          router.push({ pathname: '/together/[roomId]/live', params: { roomId: plan.liveRoomId, resume: '1' } });
          return;
        }
        router.push({ pathname: '/run/active', params: { ...plan, mode: run.mode, resume: '1' } });
      })
      .catch((e) => console.warn('[run] recovery check', e));
  }, []);
}

// 함께 달리기(TogetherLiveScreen)는 방 id만 둔다
type StoredPlan = RunPlanParams & { liveRoomId?: string };

export function parsePlan(plan: string | null): StoredPlan {
  try {
    const p: unknown = plan ? JSON.parse(plan) : null;
    return p && typeof p === 'object' ? (p as StoredPlan) : {};
  } catch {
    return {};
  }
}
