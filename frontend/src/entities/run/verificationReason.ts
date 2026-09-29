// 서버 완주 검증 실패 사유(tbl_run_verification.failure_reason) → 결과 화면 문구 (CRUN-005)
const REASON: Record<string, string> = {
  START_NOT_NEAR: '코스 출발점 근처에서 시작하지 않았어요',
  END_NOT_REACHED: '코스 도착점까지 달리지 않았어요',
  DISTANCE_SHORT: '달린 거리가 코스보다 많이 짧아요',
  ROUTE_MISMATCH: '코스 경로를 벗어난 구간이 많아요',
  SPEED_ANOMALY: '비정상적으로 빠른 구간이 있어 기록이 거부됐어요',
  GPS_INSUFFICIENT: 'GPS 기록이 부족해 확인하지 못했어요',
  COURSE_UNAVAILABLE: '코스 정보를 확인할 수 없어요',
};

export function verificationReasonText(code: string | null): string | null {
  if (!code) return null;
  return REASON[code] ?? '코스 완주를 확인하지 못했어요';
}
