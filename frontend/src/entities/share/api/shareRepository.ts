import type { ShareLink, ShareTarget, ShareType } from '../types';

// 119장 repository 경계. POST /api/v1/shares(SHR-001~003) · GET /api/v1/shares/{code}(SHR-004).
export interface ShareRepository {
  create(type: ShareType, referenceId: string, courseId: string | null): Promise<ShareLink>;
  resolve(code: string): Promise<ShareTarget>;
}

// mock 공유 URL 앞부분 (앱 딥링크). 서버가 있으면 서버가 준 http(s) 주소(/s/{code} 공유 페이지)를 쓴다.
export const SHARE_URL_BASE = 'dallimo://share/';

export class ShareNotFoundError extends Error {}
