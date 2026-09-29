// 14.3장 공유: 이미지 카드 + URL. URL은 share_code로 실제 코스/기록/Challenge를 해석한다 (share_link 테이블).
// LIVE_ROOM: 함께 달리기 방 초대 링크
export type ShareType = 'RUN' | 'COURSE' | 'CHALLENGE' | 'LIVE_ROOM';

export type ShareLink = { code: string; url: string };

// GET /api/v1/shares/{code} 해석 결과. 앱은 이 값으로 알맞은 화면을 연다 (SHR-004 Deep Link).
export type ShareTarget = { type: ShareType; referenceId: string; courseId: string | null; preview?: SharePreview | null };

// 받은 사람에게 보여줄 요약. 공유한 사람이 고른 대상의 숫자만 있고, 자유 달리기 경로는 없다 (FOUNDATION-DECISION-LOG 35항)
export type SharePreview = {
  sharerName: string;
  courseName: string | null;
  distanceM: number | null;
  elapsedSec: number | null;
  avgPaceSec: number | null;
  // 인증된 코스 기록(초). 도전이면 도전한 기록
  recordSec: number | null;
  // SHR-003 도전: 판정 · 도전한 사람 · 도전받은 사람 · 목표 기록(초). 도전이 아니면 없다
  challenge?: { status: 'OPEN' | 'RUNNING' | 'SUCCESS' | 'FAILED'; challengerName: string; challengedName: string; targetSec: number } | null;
};
