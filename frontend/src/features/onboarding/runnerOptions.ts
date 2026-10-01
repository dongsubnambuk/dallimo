import type { RunnerDistance, RunnerExperience, RunnerProfile, RunnerTime } from '@/entities/user/types';

// 러너 정보 선택지와 문구 (결정 로그 64항). 온보딩 · 설정 > 러너 정보가 같이 쓴다

export const DISTANCE_OPTIONS: { value: RunnerDistance; label: string }[] = [
  { value: 'UNDER_3K', label: '3km 이하' },
  { value: 'K3_TO_5', label: '3~5km' },
  { value: 'K5_TO_10', label: '5~10km' },
  { value: 'OVER_10K', label: '10km 이상' },
];

export const EXPERIENCE_OPTIONS: { value: RunnerExperience; label: string; caption: string }[] = [
  { value: 'BEGINNER', label: '이제 시작해요', caption: '달리기가 아직 낯설어요' },
  { value: 'OCCASIONAL', label: '가끔 달려요', caption: '한 달에 몇 번 정도' },
  { value: 'REGULAR', label: '꾸준히 달려요', caption: '일주일에 한 번 이상' },
];

export const TIME_OPTIONS: { value: RunnerTime; label: string }[] = [
  { value: 'MORNING', label: '아침' },
  { value: 'DAYTIME', label: '낮' },
  { value: 'EVENING', label: '저녁' },
  { value: 'NIGHT', label: '밤' },
];

/** 평소 거리 구간의 가운데 값(m). 추천이 비슷한 거리의 코스를 고를 때 쓴다 */
export const DISTANCE_MID_M: Record<RunnerDistance, number> = {
  UNDER_3K: 2500,
  K3_TO_5: 4000,
  K5_TO_10: 7500,
  OVER_10K: 12000,
};

/** 평소 거리 구간 (탐색 거리 칩) */
export const DISTANCE_RANGE_M: Record<RunnerDistance, [number, number]> = {
  UNDER_3K: [0, 3000],
  K3_TO_5: [3000, 5000],
  K5_TO_10: [5000, 10000],
  OVER_10K: [10000, Number.POSITIVE_INFINITY],
};

export const labelOf = {
  distance: (v: RunnerDistance) => DISTANCE_OPTIONS.find((o) => o.value === v)?.label ?? '',
  experience: (v: RunnerExperience) => EXPERIENCE_OPTIONS.find((o) => o.value === v)?.label ?? '',
  time: (v: RunnerTime) => TIME_OPTIONS.find((o) => o.value === v)?.label ?? '',
};

/** 설정 줄에 보일 요약. 아무것도 고르지 않았으면 null */
export function runnerSummary(p: RunnerProfile): string | null {
  const parts = [p.distance && labelOf.distance(p.distance), p.experience && labelOf.experience(p.experience), p.preferredTime && labelOf.time(p.preferredTime)];
  const filled = parts.filter(Boolean);
  return filled.length ? filled.join(' · ') : null;
}
