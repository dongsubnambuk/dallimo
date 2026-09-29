// 도전 (CHL-001~004, 44장). 서버 ChallengeResponse의 앱 쪽 모델.

// open: 만들고 아직 달리지 않음, running: 달린 기록이 이어짐(판정 전), success · failed: 서버 판정
export type ChallengeStatus = 'open' | 'running' | 'success' | 'failed' | 'canceled';

export type Challenge = {
  id: string;
  status: ChallengeStatus;
  // sent: 내가 친구 기록에 도전, received: 친구가 내 기록에 도전
  role: 'sent' | 'received';
  challenger: { userId: string; nickname: string };
  target: { userId: string; nickname: string };
  course: { id: string; name: string; distanceM: number };
  // 목표 기록 (도전을 만든 때의 친구 공식 기록, 고정)
  targetRecordId: string;
  targetSec: number;
  // 도전한 기록이 인증됐을 때의 공식 기록
  resultSec: number | null;
  // 도전한 러닝 결과 id (내가 보낸 도전만, 앱 id srv-{runId})
  runResultId: string | null;
  createdAt: number;
  finishedAt: number | null;
  // 상대의 지금 최고 기록. 재도전은 이 기록으로 (CHL-004)
  targetBest: { recordId: string; timeSec: number };
};
