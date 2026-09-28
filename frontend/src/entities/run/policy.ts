// 명세서 10.5장 정책값 중 러닝 준비에 쓰는 값. 화면 코드에 숫자를 박지 않고 이 경계로 받는다.
// 값은 서버 설정(정책 버전)에서 내려받는 것을 전제로 하며, 연동 전까지 명세 후보값을 mock으로 돌려준다.
export type RunPolicy = {
  // course.start_radius_m: 코스 출발점에서 이 거리 안이어야 코스 러닝을 시작할 수 있다. 명세 "약 100m 후보".
  courseStartRadiusM: number;
  // 10.3장 현재 페이스 윈도우(초). 명세 "윈도우 크기는 실제 야외 PoC에서 결정" — PoC 전 임시값.
  currentPaceWindowSec: number;
  // 51.2장 "초기 구간처럼 거리 표본이 부족할 때는 '--'". 페이스를 보여주기 시작하는 최소 거리(m) — PoC 전 임시값.
  minPaceSampleM: number;
};

const MOCK_RUN_POLICY: RunPolicy = {
  courseStartRadiusM: 100,
  currentPaceWindowSec: 20,
  minPaceSampleM: 50,
};

export async function getRunPolicy(): Promise<RunPolicy> {
  return MOCK_RUN_POLICY;
}

// 동기 접근용. 정책은 앱 시작 때 한 번 받아 두고 러닝 중에는 바뀌지 않는다고 본다.
export function getRunPolicySync(): RunPolicy {
  return MOCK_RUN_POLICY;
}
