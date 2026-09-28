import type { RunPoint } from '@/entities/run/types';

import type { RunPointStore } from './runningEngine';

// SQLite 연동 전 메모리 저장소. 앱이 꺼지면 사라진다. 같은 인터페이스로 SQLite 구현을 붙인다.
// 러닝 하나당 저장소 하나라 runUuid로 나누지 않는다. SQLite 구현은 local_run_point를 runUuid로 나눈다.
export function createMemoryRunPointStore(): RunPointStore {
  const points: RunPoint[] = [];
  let syncedUpTo = -1;
  return {
    async append(point) {
      // 50.1장 seq는 증가해야 한다
      if (points.length && point.seq <= points[points.length - 1].seq) return;
      points.push(point);
    },
    async getUnsyncedRange(_runUuid, limit) {
      return points.filter((p) => p.seq > syncedUpTo).slice(0, limit);
    },
    async markSynced(_runUuid, _from, toSeq) {
      syncedUpTo = Math.max(syncedUpTo, toSeq);
    },
    unsyncedCount() {
      return points.filter((p) => p.seq > syncedUpTo).length;
    },
  };
}
