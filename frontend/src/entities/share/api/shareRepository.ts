import type { ShareLink, ShareTarget, ShareType } from '../types';

// 119장 repository 경계. POST /api/v1/shares(SHR-001~003) · GET /api/v1/shares/{code}(SHR-004).
export interface ShareRepository {
  create(type: ShareType, referenceId: string, courseId: string | null): Promise<ShareLink>;
  resolve(code: string): Promise<ShareTarget>;
}

// 공유 URL 앞부분. Web Landing 범위(20.2장, Phase 2~3)가 정해지기 전까지 앱 딥링크(scheme dallimo)를 쓴다.
export const SHARE_URL_BASE = 'dallimo://share/';

export class ShareNotFoundError extends Error {}
