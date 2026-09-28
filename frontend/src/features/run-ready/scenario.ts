// 개발 빌드에서 Run Ready 상태를 강제로 만들어 QA하기 위한 값 (74장: permission denied, GPS acquiring, GPS poor, ready, course start too far).
// production에서는 항상 'normal'이다. normal = GPS를 잠깐 찾은 뒤 준비 완료(코스는 출발점 근처).
export const RUN_READY_SCENARIOS = ['normal', 'denied', 'acquiring', 'poor', 'far'] as const;
export type RunReadyScenario = (typeof RUN_READY_SCENARIOS)[number];

export function parseRunReadyScenario(value: unknown): RunReadyScenario {
  if (!__DEV__) return 'normal';
  return (RUN_READY_SCENARIOS as readonly unknown[]).includes(value) ? (value as RunReadyScenario) : 'normal';
}
