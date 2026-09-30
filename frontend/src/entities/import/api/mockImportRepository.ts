import { runResultRepository } from '@/entities/run/api';
import { distanceM } from '@/shared/geo';
import { createUuid } from '@/shared/uuid';

import type { ImportCheck, ImportResult, ImportSource, Integration } from '../types';
import type { ImportRepository } from './importRepository';

// 서버 없이 쓰는 가져오기 (앱을 켜 둔 동안만). 수성못 둘레길을 달린 기록은 그 코스와 맞춘다
const done = new Map<string, ImportResult>();
let last: number | null = null;

export function createMockImportRepository(): ImportRepository {
  return {
    async check(_source: ImportSource, ids) {
      return ids.map((i) => done.get(i)).filter((r): r is ImportResult => r != null).map(({ course: _c, verification: _v, ...c }): ImportCheck => c);
    },
    async importRun(run, points) {
      await new Promise((r) => setTimeout(r, 400));
      const seen = done.get(run.id);
      if (seen) return seen;
      const lake = run.id === 'MOCK-LAKE';
      const path = points.map((p) => ({ latitude: p.latitude, longitude: p.longitude }));
      const length = path.length > 1 ? path.slice(1).reduce((a, p, i) => a + distanceM(path[i], p), 0) : (run.distanceM ?? 0);
      const runId = await runResultRepository.saveFinished(
        {
          clientRunUuid: createUuid(),
          mode: lake ? 'COURSE' : 'FREE',
          startedAt: run.startedAt,
          distanceM: Math.round(length),
          activeSec: run.activeSec,
          avgPaceSec: length > 50 ? Math.round(run.activeSec / (length / 1000)) : null,
          splits: [],
          path,
          course: lake ? { id: 'c-suseongmot', name: '수성못 둘레길', timeSec: run.activeSec } : null,
          target: null,
          workout: null,
          source: { kind: run.source, device: run.deviceName },
        },
        true,
      );
      const r: ImportResult = {
        externalId: run.id,
        status: 'IMPORTED',
        runId,
        mergedRunId: null,
        failureReason: null,
        course: lake ? { id: 'c-suseongmot', name: '수성못 둘레길', matchRate: 97.4 } : null,
        verification: lake ? 'pending' : 'none',
      };
      done.set(run.id, r);
      last = Date.now();
      return r;
    },
    async integrations(): Promise<Integration[]> {
      const count = [...done.values()].filter((r) => r.status === 'IMPORTED').length;
      return [
        { source: 'APPLE_HEALTH', importedCount: count, lastImportedAt: last },
        { source: 'HEALTH_CONNECT', importedCount: 0, lastImportedAt: null },
      ];
    },
  };
}
