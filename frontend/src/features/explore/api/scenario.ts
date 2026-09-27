// 개발 빌드에서 탐색 화면 상태를 강제로 만들어 QA하기 위한 값 (74장 필수 상태).
// production에서는 항상 'normal'이다.
export const EXPLORE_SCENARIOS = ['normal', 'loading', 'denied', 'empty', 'error'] as const;
export type ExploreScenario = (typeof EXPLORE_SCENARIOS)[number];

export function parseScenario(value: unknown): ExploreScenario {
  if (!__DEV__) return 'normal';
  return (EXPLORE_SCENARIOS as readonly unknown[]).includes(value) ? (value as ExploreScenario) : 'normal';
}
