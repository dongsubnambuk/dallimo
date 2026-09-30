# DESIGN-SYSTEM

> 출처: `docs/spec/dallimo_master_spec_v1.8_feedback_features.docx` (달리모 통합 개발 명세서 v1.8)
> 옮긴 장: 67, 67.1, 88, 88.1, 88.2, 95, 114
> 명세서 원문을 그대로 옮겼다. 내용 수정은 명세서를 먼저 고친 뒤 반영한다.

## 67. 디자인 시스템 초안

색상/타이포그래피 값 자체는 비주얼 탐색 후 확정한다. 여기서는 컴포넌트와 semantic token 구조를 고정한다.

```text
Color tokens
- bg.canvas
- bg.surface
- bg.elevated
- text.primary
- text.secondary
- text.inverse
- action.primary
- action.secondary
- status.success
- status.warning
- status.danger
- gps.good / gps.fair / gps.poor
- ranking.up / ranking.down
- map.route / map.actual / map.target

Typography
- display.metric
- title.screen
- title.section
- body.primary
- body.secondary
- label.metric
- label.control
- caption

Spacing
- 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40
```

### 67.1 핵심 컴포넌트

| 컴포넌트 | 사용처 | 상태 |
|---|---|---|
| MetricBlock | Active Run/Result | default, highlighted, warning |
| CourseCard | Explore/Saved | default, compact, ranking-context |
| CourseMapPreview | Course/Result | loading, route, actual, deviation |
| PrimaryRunButton | Course/Ready | disabled GPS, ready, loading |
| PlayModeCard | mode picker | selected/default/locked |
| RankingRow | ranking | self, friend, podium, nearby |
| CourseTitleBadge | ranking, course detail | crown(왕관), legend(불꽃) |
| SegmentAttackBanner | active run (코스) | 구간 도전 중, 처음부터 못 잰 구간, 방금 끝난 구간 |
| GapIndicator | PB/Challenge/Live | ahead, behind, tied |
| GpsStatus | Ready/Run | good, fair, poor, unavailable |
| ParticipantChip | Together | invited, ready, running, disconnected, finished |
| VerificationBadge | Result/History | pending, verified, unverified, rejected |
| ShareTemplateCard | Share | map, record, ranking, battle |

## 88. ROUTE SIGNAL 디자인 토큰 후보

아래 값은 실제 프로토타입을 만들기 위한 v0 후보이며 accessibility contrast 및 지도 SDK 위에서 검증 후 고정한다. semantic 역할이 먼저이며 raw 값은 변경 가능하다.

```text
// Visual exploration candidate — not production locked

colors = {
  canvasLight: "#F7F8F6",
  surfaceLight: "#FFFFFF",
  canvasDark: "#101312",
  surfaceDark: "#181C1B",

  textPrimaryLight: "#111514",
  textSecondaryLight: "#68716E",
  textPrimaryDark: "#F5F8F7",
  textSecondaryDark: "#A8B1AE",

  signal: "#00BFA6",
  signalPressed: "#009F8B",

  success: "#1B9A59",
  warning: "#D99500",
  danger: "#D84A4A",

  routeCourse: "#00BFA6",
  routeActual: "#FFFFFF",
  routeTarget: "#86E7D8"
}
```

경쟁 상태의 ahead/behind를 브랜드 색 하나로 표현하지 않는다. 텍스트, 방향 icon, 숫자 sign과 semantic color를 함께 사용한다.

### 88.1 Typography

| 역할 | 권장 |
|---|---|
| Korean/UI | Pretendard 또는 동급 한국어 UI sans-serif 검토 |
| Metric | 동일 family의 bold/extra-bold + tabular-nums |
| Screen Title | semibold/bold |
| Body | regular/medium |
| Rule | 숫자를 위해 별도 장식 font를 추가하지 않음 |

폰트 선택은 실제 라이선스와 Expo 번들 크기/렌더링을 확인한 뒤 확정한다. metric alignment는 가능한 경우 tabular numerals를 사용한다.

### 88.2 Shape & Surface

- CourseCard는 경계/간격으로 구분하고 모든 리스트 항목을 떠 있는 카드처럼 만들지 않는다.
- Bottom sheet와 map overlay만 elevation을 분명히 사용한다.
- radius는 control/card/sheet 3단계 정도로 제한한다.
- Route line, progress rail, ranking movement line을 동일한 'signal line' 언어로 연결한다.
- Explore의 화면 배경은 밝게, Active Run/Together Live는 dark를 기본으로 한다.

## 95. 컴포넌트 시각 규칙

| 컴포넌트 | ROUTE SIGNAL 규칙 |
|---|---|
| MetricBlock | 숫자가 label보다 최소 2~3단계 크게. active run에서는 surface 없이 직접 배치 가능 |
| CourseCard | thumbnail 없는 버전이 기본. 지도에서 route가 이미 시각 콘텐츠 역할 |
| PrimaryRunButton | signal accent를 가장 강하게 사용하는 핵심 action |
| GapIndicator | +/- 방향과 ahead/behind copy를 함께 사용 |
| RankingRow | self는 surface/line로 anchor. podium decoration 절제 |
| CourseTitleBadge | 이름 옆 작은 아이콘 하나. 금색 · 반짝임 없이 모양과 읽는 이름으로 구분 (124장 게임화는 기록을 보조) |
| VerificationBadge | 작고 명확한 status, 결과 headline보다 시각 우선하지 않음 |
| FilterChip | 선택 상태 명확, 너무 많은 색상 사용 금지 |
| BottomSheet | map 작업을 보조; 최대 높이가 지도 전체를 상시 덮지 않음 |

## 114. 토큰 구현 규칙

v0 raw 값은 시각 탐색용이며 production lock이 아니다. 하지만 semantic API는 초기에 고정해 화면에서 raw 값의 확산을 막는다.

```text
// Good
theme.colors.action.primary
theme.colors.text.primary
theme.colors.gps.poor
theme.colors.route.course

// Bad
"#00BFA6"
"#68716E"
fontSize: 13
borderRadius: 17
```

| Token | 초기 후보 | 확정 전 검증 |
|---|---|---|
| signal accent | #00BFA6 | WCAG contrast, map visibility, sunlight |
| canvas light | #F7F8F6 | map/surface relation |
| canvas dark | #101312 | OLED/contrast, active-run outdoor |
| metric hero | 64/68, extra-bold 후보 | small iPhone, Dynamic Type |
| spacing | 4-based semantic scale | dense map controls, Android |
| radius | control/card/sheet/pill | platform feel, over-rounding audit |
