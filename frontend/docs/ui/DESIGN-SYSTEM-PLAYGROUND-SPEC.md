# DESIGN-SYSTEM-PLAYGROUND-SPEC

> 출처: `docs/spec/dallimo_master_spec_v1.8_feedback_features.docx` (달리모 통합 개발 명세서 v1.8)
> 옮긴 장: 109, 109.1, 111, 111.1, 115, 115.1, 116, 116.1
> 명세서 원문을 그대로 옮겼다. 내용 수정은 명세서를 먼저 고친 뒤 반영한다.

## 109. UI Foundation Bootstrap v1.6

본 단계의 목적은 제품 화면을 만들기 전에 Claude Code가 사용할 UI 기반을 실제 코드 구조와 검증 절차로 고정하는 것이다. Design System Playground는 디자인 시안을 보여주는 갤러리가 아니라 토큰·컴포넌트·상태·접근성·플랫폼 차이를 조기에 검증하기 위한 개발 도구다.

### 109.1 화면 구현 시작 조건

1. Claude UI Skill Preflight 통과
1. running-ui-orchestrator 활성화
1. ROUTE SIGNAL 문서 확인
1. UI Foundation 폴더 구조 생성
1. Design token v0 구현
1. Design System Playground 구현
1. 핵심 primitive/component 상태 검증
1. iOS/Android visual QA 통과
1. 그 후 Explore Home 구현 시작

## 111. Design System Playground 목적과 구성

| Section | 검증 내용 |
|---|---|
| Foundations | light/dark canvas, semantic colors, spacing, radius |
| Typography | 한글/숫자/tabular numerals, font scaling |
| Actions | primary/secondary/disabled/loading/pressed |
| Metrics | normal/highlight/warning/unavailable |
| Course | normal/long title/no metadata/selected |
| Competition | ahead/behind/tied/rank/self/friend |
| GPS | acquiring/good/fair/poor/unavailable |
| Verification | pending/verified/unverified/rejected |
| Together | invited/ready/running/disconnected/finished/DNF |
| Stress | 긴 한글, 큰 글자, extreme numbers, small screen |

### 111.1 Playground 규칙

- 컴포넌트를 예쁘게 전시하는 마케팅 페이지처럼 만들지 않는다.
- 각 컴포넌트의 정상 상태보다 edge state를 더 많이 보여준다.
- 실제 한국어 문자열과 실제 단위 표기를 사용한다.
- light/dark context를 같은 화면에서 비교할 수 있게 한다.
- 개발자가 token drift와 component drift를 빠르게 발견할 수 있어야 한다.

## 115. Claude Code 첫 실행 Master Workflow

```text
PHASE 0  Skill Preflight
PHASE 1  Read all project UI docs
PHASE 2  Audit existing mobile project structure
PHASE 3  Create UI foundation folders only
PHASE 4  Implement semantic tokens + theme
PHASE 5  Implement primitives
PHASE 6  Implement core reusable components
PHASE 7  Build Design System Playground
PHASE 8  Run accessibility/stress states
PHASE 9  Run iOS/Android screenshot QA
PHASE 10 Fix drift/issues
PHASE 11 Report foundation decisions
STOP
Do not implement Explore until foundation review is complete.
```

### 115.1 Claude Code가 임의로 결정하면 안 되는 항목

- 지도 SDK
- 최종 브랜드 색상 확정
- 새 bottom navigation 구조
- 새 run mode
- 새 feature tab
- 외부 UI kit의 wholesale adoption
- 새 font family
- Active Run의 핵심 metric 우선순위 변경
- 사용자 위치/친구 위치 노출 방식 변경

## 116. Foundation 완료 체크리스트

| Area | Definition of Done |
|---|---|
| Skill | 필수 plugin/skills 인식 확인 |
| Docs | UI 문서 전체 읽기 완료 |
| Tokens | raw value 직접 사용 없는 semantic token layer |
| Theme | Explore light / Run dark context 표현 가능 |
| Primitive | Text/Pressable/Surface/Icon/Divider |
| Components | 9개 핵심 component 상태 구현 |
| Korean | 긴 코스명/닉네임/단위 stress test |
| A11y | font scaling, labels, color-independent state, touch target |
| iOS | small/standard viewport 확인 |
| Android | standard viewport + navigation inset 확인 |
| Dark Run | metric hierarchy/glanceability 확인 |
| Performance | Playground에서 불필요한 high-frequency rerender 없음 |
| Docs | 새 token/component가 문서와 일치 |
| Review | mobile-design-review/heuristic audit 수행 |
| Decision Log | 아직 미확정인 visual 값 목록 기록 |

### 116.1 Explore 구현으로 넘어가는 승인 조건

위 체크리스트가 충족되고 Design System Playground에서 ROUTE SIGNAL의 light/dark 문법이 실제 React Native에서 안정적으로 보인다는 것을 확인한 뒤에만 Explore Home으로 넘어간다. Foundation 단계에서 문제가 발견되면 화면별 workaround를 추가하지 말고 token/primitive/component 수준에서 먼저 해결한다.
