// 6.3장 RunMode. POST /api/v1/runs의 mode 값 (7.2장).
export type RunMode = 'FREE' | 'COURSE' | 'PB' | 'CHALLENGE' | 'LIVE_RACE' | 'TIME_ATTACK' | 'TOGETHER';

// 코스에서 고르는 플레이 방식 (64장 PICK A PLAY MODE, 125장 COURSE 안의 COURSE_NORMAL / PB_ATTACK / RIVAL + TOGETHER).
export type PlayModeKey = 'COURSE' | 'PB' | 'CHALLENGE' | 'TOGETHER';

// Play Mode에서 Run Ready로 넘기는 선택 결과
export type RunPlan = {
  mode: RunMode;
  courseId: string;
  // PB·CHALLENGE 목표 기록(초)
  targetSec?: number;
  // 목표 대상 이름. 예: "내 PB", "지수"
  targetLabel?: string;
  // CHALLENGE: 도전할 친구의 공식 기록 id. 있으면 출발할 때 서버 도전을 만든다 (CHL-001)
  targetRecordId?: string;
};

// 6.3장 RunStatus, 9.3장 Run 상태 머신: IDLE → PREPARING → RUNNING ↔ PAUSED → FINISHING → FINISHED, ↘ RECOVERY
export type RunStatus = 'PREPARING' | 'RUNNING' | 'PAUSED' | 'FINISHING' | 'FINISHED' | 'RECOVERY' | 'CANCELED';

// 10.1장 RunPoint. recordedAt은 epoch ms.
// 51장 anomaly classification: 정확도가 낮거나(LOW_ACCURACY) 순간 이동처럼 튄(JUMP) point는 거리 계산에서 빼고 원본은 남긴다.
export type RunPointQuality = 'OK' | 'LOW_ACCURACY' | 'JUMP';
export type RunPoint = {
  seq: number;
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy: number;
  speed?: number;
  recordedAt: number;
  qualityFlag: RunPointQuality;
};

// 1km마다 걸린 시간(초)
export type RunSplit = { km: number; sec: number };
