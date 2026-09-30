import type { RunVerification } from '@/entities/run/result';
import { apiRequest } from '@/shared/api/http';

import type { ImportCheck, ImportSource, ImportStatus, Integration } from '../types';
import type { ImportRepository } from './importRepository';

// 가져오기 API (backend ImportController)
type CheckDto = { externalId: string; status: ImportStatus; runId: number | null; mergedRunId: number | null; failureReason: string | null };
type ResultDto = CheckDto & { course: { courseId: number; name: string; matchRate: number | null } | null; verificationStatus: string | null };

// 앱 안의 서버 기록 id는 srv-{runId} (httpRunResultRepository와 같다)
const id = (n: number | null) => (n == null ? null : `srv-${n}`);
const toCheck = (c: CheckDto): ImportCheck => ({ externalId: c.externalId, status: c.status, runId: id(c.runId), mergedRunId: id(c.mergedRunId), failureReason: c.failureReason });
const toVerification = (s: string | null): RunVerification | null => (s ? (s.toLowerCase() as RunVerification) : null);

export function createHttpImportRepository(): ImportRepository {
  return {
    check: (source: ImportSource, externalIds) =>
      externalIds.length === 0
        ? Promise.resolve([])
        : apiRequest<CheckDto[]>('/api/v1/imported-activities/check', { method: 'POST', body: { source, externalIds } }).then((l) => l.map(toCheck)),
    async importRun(run, points) {
      const r = await apiRequest<ResultDto>(`/api/v1/imported-activities/${encodeURIComponent(run.id)}/import`, {
        method: 'POST',
        body: {
          source: run.source,
          sourceProvider: run.sourceName,
          sourceDeviceName: run.deviceName,
          startedAt: new Date(run.startedAt).toISOString(),
          endedAt: new Date(run.endedAt).toISOString(),
          activeSeconds: run.activeSec,
          ...(run.distanceM != null ? { distanceM: run.distanceM } : {}),
          points: points.map((p) => ({
            latitude: p.latitude,
            longitude: p.longitude,
            ...(p.altitude != null ? { altitudeM: p.altitude } : {}),
            ...(p.accuracy != null ? { accuracyM: p.accuracy } : {}),
            ...(p.speed != null ? { speedMps: p.speed } : {}),
            recordedAt: new Date(p.recordedAt).toISOString(),
          })),
        },
      });
      return {
        ...toCheck(r),
        course: r.course ? { id: String(r.course.courseId), name: r.course.name, matchRate: r.course.matchRate } : null,
        verification: toVerification(r.verificationStatus),
      };
    },
    integrations: () =>
      apiRequest<{ source: ImportSource; importedCount: number; lastImportedAt: string | null }[]>('/api/v1/integrations').then((l) =>
        l.map((i): Integration => ({ source: i.source, importedCount: i.importedCount, lastImportedAt: i.lastImportedAt ? Date.parse(i.lastImportedAt) : null })),
      ),
  };
}
