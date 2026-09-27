# VISUAL-QA

> 출처: `docs/spec/dallimo_master_spec_v1.8_feedback_features.docx` (달리모 통합 개발 명세서 v1.8)
> 옮긴 장: 71.2, 76, 77, 98
> 명세서 원문을 그대로 옮겼다. 내용 수정은 명세서를 먼저 고친 뒤 반영한다.

### 71.2 화면 구현 단위 프로세스

1. 화면 목적/사용자 질문 1개 정의
1. Reference Matrix에서 관련 앱 패턴 확인
1. 필수 정보/보조 정보/CTA 계층 결정
1. low-fidelity 구조 작성
1. 기존 token/component로 구현
1. 실제 데이터 길이/빈 상태/오류 상태 적용
1. Simulator/실기기 screenshot 검수
1. Active Run 계열은 야외/한손 사용 실기기 확인
1. 문제 수정 후 screen spec과 코드 상태 일치 확인

## 76. 비주얼 QA 체크리스트

- iPhone 소형/일반/대형 viewport에서 핵심 CTA가 safe area와 충돌하지 않는가
- Android gesture/navigation inset에서도 bottom controls가 안전한가
- 한글 긴 코스명/닉네임/지역명이 잘리는가
- 지도 이동/zoom 시 floating UI가 map gesture를 방해하는가
- 밝은 지도와 어두운 지도 모두 overlay 대비가 확보되는가
- GPS/네트워크 상태가 색상만으로 전달되지 않는가
- Active Run에서 화면을 보지 않고도 음성/햅틱으로 핵심 이벤트를 이해할 수 있는가
- 러닝 중 화면 업데이트가 불필요한 전체 re-render를 만들지 않는가
- progress/ranking animation이 60fps 체감을 크게 해치지 않는가
- Dynamic Type에서 metric과 controls가 겹치지 않는가
- screen reader label이 아이콘만 있는 control에 존재하는가
- loading skeleton이 실제 content geometry와 크게 다르지 않은가

## 77. UI 성능 설계

| 영역 | 위험 | 설계/측정 |
|---|---|---|
| Map | 많은 marker/polyline | viewport 기반 렌더, simplify/downsample, 실제 디바이스 FPS 측정 |
| Active Run | 초 단위 상태 업데이트 | metric state 분리, 필요한 컴포넌트만 갱신 |
| Live Together | 여러 참가자 업데이트 | latest snapshot normalization, list virtualization 필요 여부 측정 |
| Ranking | 긴 목록 | cursor pagination + virtualized list |
| Result Map | 수천 GPS point polyline | display용 simplified route 사용, 원본과 분리 |
| Animations | Reanimated/JS thread 경쟁 | UI thread animation 우선, profiler 확인 |
| Images | course/user media | 적정 resize/cache, 지도 스크롤 중 과도한 decode 방지 |

성능 목표 숫자는 실제 기기와 화면별 baseline 이후 확정한다. UI 설계 단계부터 '지도 + 실시간 metric + animation'이 동시에 실행되는 Active Run/Together를 가장 높은 위험 화면으로 본다.

## 98. 디자인 확정 전 검증 항목

| 항목 | 통과 기준 |
|---|---|
| Accent contrast | light/dark canvas와 주요 button/text 조합에서 접근성 기준 검증 |
| Map legibility | 국내 실제 지도 SDK 위에서 course/actual/target route 구분 가능 |
| Sunlight | Active Run 주요 metric 실기기 야외 테스트 |
| Font | 한국어/숫자/tabular-nums/Android 렌더 확인 |
| Long content | 긴 코스명/닉네임/4자리 순위에서도 layout 유지 |
| Performance | 지도 + progress + metric update 동시 실행 시 profiler 확인 |
| Distinctiveness | 5개 핵심 화면을 나란히 놓았을 때 하나의 서비스로 보이고 범용 AI UI처럼 보이지 않음 |
