// 명세서 10.5장 정책값 중 러닝 준비에 쓰는 값. 화면 코드에 숫자를 박지 않고 이 경계로 받는다.
// 값은 서버 설정(정책 버전)에서 내려받는 것을 전제로 하며, 연동 전까지 명세 후보값을 mock으로 돌려준다.
export type RunPolicy = {
  // course.start_radius_m: 코스 출발점에서 이 거리 안이어야 코스 러닝을 시작할 수 있다. 명세 "약 100m 후보".
  courseStartRadiusM: number;
};

const MOCK_RUN_POLICY: RunPolicy = {
  courseStartRadiusM: 100,
};

export async function getRunPolicy(): Promise<RunPolicy> {
  return MOCK_RUN_POLICY;
}
