import { runResultRepository } from '@/entities/run/api';
import { apiRequest, ApiRequestError } from '@/shared/api/http';

import type { ShareTarget, ShareType } from '../types';
import { ShareNotFoundError, type ShareRepository } from './shareRepository';

// 7장 POST /api/v1/shares (SHR-001~003) · GET /api/v1/shares/{code} (SHR-004, 로그인 없이).
// 서버가 준 url은 메신저에서 눌리는 http(s) 주소다. 누르면 서버 공유 페이지가 앱(dallimo://share/{code})을 연다.

type ResolvedDto = {
  type: ShareType;
  referenceId: number;
  courseId: number | null;
  preview: {
    sharerName: string;
    courseName: string | null;
    distanceM: number | null;
    elapsedSeconds: number | null;
    avgPaceSecPerKm: number | null;
    recordSeconds: number | null;
  } | null;
};

export function createHttpShareRepository(): ShareRepository {
  return {
    async create(type, referenceId) {
      // 기록은 앱 기록 id(run-N · srv-N)를 서버 Run id로 바꾼다. 서버에 올라가기 전이면 링크를 만들 수 없다
      const serverId = type === 'RUN' ? await runResultRepository.serverRunId(referenceId) : referenceId;
      if (!serverId) throw new Error('not-synced');
      return apiRequest<{ code: string; url: string }>('/api/v1/shares', { method: 'POST', body: { type, referenceId: Number(serverId) } });
    },

    async resolve(code) {
      try {
        const r = await apiRequest<ResolvedDto>(`/api/v1/shares/${encodeURIComponent(code)}`, { auth: false });
        const target: ShareTarget = {
          type: r.type,
          referenceId: String(r.referenceId),
          courseId: r.courseId != null ? String(r.courseId) : null,
          preview: r.preview && {
            sharerName: r.preview.sharerName,
            courseName: r.preview.courseName,
            distanceM: r.preview.distanceM,
            elapsedSec: r.preview.elapsedSeconds,
            avgPaceSec: r.preview.avgPaceSecPerKm,
            recordSec: r.preview.recordSeconds,
          },
        };
        return target;
      } catch (e) {
        if (e instanceof ApiRequestError && e.status === 404) throw new ShareNotFoundError(code);
        throw e;
      }
    },
  };
}
