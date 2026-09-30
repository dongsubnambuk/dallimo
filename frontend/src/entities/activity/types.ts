// 친구 활동 (ACT-001~002, SCR-M06, 7장 GET /api/v1/activities). 행동형 피드: PB · 코스 등록 · 도전 성공 · 랭킹.
// PB: 코스 첫 공식 기록 또는 PB 갱신, WEEKLY_TOP: 이번 주 코스 3위 안으로 올라섬
// CROWN · LEGEND (124장): 코스 크라운(최근 90일 최고 기록) · 로컬 레전드(최근 90일 최다 완주)를 새로 가짐
export type ActivityType = 'PB' | 'COURSE_CREATED' | 'CHALLENGE_WON' | 'WEEKLY_TOP' | 'CROWN' | 'LEGEND';

export type Activity = {
  id: string;
  type: ActivityType;
  userId: string;
  nickname: string;
  isMine: boolean;
  // epoch ms
  createdAt: number;
  course: { id: string; name: string; distanceM: number };
  // PB · 랭킹: 공식 기록, 도전: 도전한 기록
  timeSec: number | null;
  // PB: 이전 최고 기록 (첫 기록이면 null)
  previousSec: number | null;
  // 랭킹: 이번 주 순위
  rank: number | null;
  // 로컬 레전드: 그때 완주 수
  finishCount?: number | null;
  // 도전: 도전받은 사람(나인지) · 목표 기록
  target: { nickname: string; timeSec: number; isMe: boolean } | null;
};
