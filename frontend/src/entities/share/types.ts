// 14.3장 공유: 이미지 카드 + URL. URL은 share_code로 실제 코스/기록/Challenge를 해석한다 (share_link 테이블).
export type ShareType = 'RUN' | 'COURSE' | 'CHALLENGE';

export type ShareLink = { code: string; url: string };

// GET /api/v1/shares/{code} 해석 결과. 앱은 이 값으로 알맞은 화면을 연다 (SHR-004 Deep Link).
export type ShareTarget = { type: ShareType; referenceId: string; courseId: string | null };
