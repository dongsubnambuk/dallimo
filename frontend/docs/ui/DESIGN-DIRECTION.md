# DESIGN-DIRECTION

> 출처: `docs/spec/dallimo_master_spec_v1.8_feedback_features.docx` (달리모 통합 개발 명세서 v1.8)
> 옮긴 장: 75, 82, 82.1, 83, 84, 85, 86, 87, 87.1, 89, 97, 99
> 명세서 원문을 그대로 옮겼다. 내용 수정은 명세서를 먼저 고친 뒤 반영한다.

## 75. 시각 방향 탐색 가이드

브랜드 비주얼은 아직 조사 결과만으로 확정하지 않는다. Claude Code가 여러 시안을 만들되, 아래 축을 고정한 상태에서 비교한다.

| 고정 | 탐색 가능 |
|---|---|
| 큰 러닝 metric, 야외 대비 | 브랜드 포인트 색 |
| 코스/실제 경로/목표 경로 색 역할 분리 | light 중심 vs optional dark run mode |
| 카드 남발 금지 | radius 정도 |
| 지도 중심 화면에서 overlay 절제 | 타이포그래피 개성 |
| Active Run은 장식 최소화 | 결과/공유 화면의 감정적 연출 |
| bottom nav 4개 | 아이콘 스타일 |

일반적인 AI 모바일 UI에서 자주 나타나는 '큰 인사말 + 둥근 흰 카드 묶음 + 그라디언트 + floating button' 문법은 의도적으로 피한다. 코스 지도와 러닝 데이터가 시각 언어의 중심이 되어야 한다.

## 82. 모바일 비주얼 디자인 방향 비교 v1.4

본 장은 레퍼런스 조사 결과를 실제 하나의 제품 언어로 수렴하기 위한 시각 설계 단계다. 세 방향을 모두 실제 화면군(Explore, Course Detail, Active Run, Result, Together)에 적용 가능하도록 정의한 뒤, 제품 포지셔닝·야외 가독성·지도 비중·경쟁 표현·React Native 구현 지속성을 기준으로 최종 방향을 선택한다.

### 82.1 레퍼런스에서 추출한 실제 시각 패턴

| Reference | 관찰 패턴 | 해석 |
|---|---|---|
| Nike Run Club | Active Run에서 큰 숫자, 매우 강한 대비, 제한된 보조 정보 | 러닝 중에는 정보량보다 metric 위계가 우선 |
| AllTrails | 코스 상세에서 지도/경로 + 거리/고도/시간을 묶고 이후 세부 정보 제공 | 출발 결정에 필요한 정보부터 progressive disclosure |
| Runnect | 지도와 코스 라인을 강한 브랜드 색으로 단순하게 강조 | 코스 자체가 콘텐츠라는 인지가 명확 |
| Strava Segments | 구간/기록/랭킹을 같은 객체 문맥 안에서 연결 | 코스와 경쟁을 분리된 메뉴로 보이지 않게 해야 함 |
| Komoot | route planning/navigation을 지도·고도·상세 정보의 도구로 구성 | 지도는 배경이 아니라 작업 표면 |
| Zwift | 진행/상대/순위를 즉각 인지시키는 race state | Together에서는 실제 위치보다 상대 진행 상태가 중요 |
| Relive | 운동 결과를 별도 공유 콘텐츠로 재구성 | 공유는 screenshot 기능이 아니라 결과 asset 생성 |

## 83. 시각 방향 A - ROUTE SIGNAL

성격: 도시 러닝을 위한 기술적이지만 차갑지 않은 시각 언어. 평상시 탐색 화면은 밝고 절제되며, 러닝 중에는 어두운 집중 모드로 전환한다. 코스와 진행 상태는 하나의 강한 Signal Accent로 통일한다.

| 항목 | 정의 |
|---|---|
| Base | Off-white / graphite / near-black |
| Brand Accent | Aqua/teal 계열의 고채도 signal color |
| Typography | 한국어 가독성이 높은 sans-serif + tabular numerals |
| Map | 중립 지도 위 route signal이 가장 먼저 보임 |
| Cards | 필요한 경우만 surface separation; 카드 남발 금지 |
| Active Run | dark canvas + 매우 큰 numeric hierarchy |
| Competition | gap/rank는 accent + semantic state를 병행 |
| Mood | urban, precise, alive, fast |

장점: Explore와 Active Run을 같은 브랜드로 묶으면서도 사용 상황에 따라 밀도를 다르게 만들 수 있다. 지도와 숫자 모두에서 브랜드 accent의 역할이 명확하다.

위험: teal 계열이 일반 웰니스 앱처럼 부드럽게 보이지 않도록 typography/spacing/contrast를 날카롭게 유지해야 한다.

## 84. 시각 방향 B - TRACK GRID

성격: 기록과 경쟁에 강하게 초점을 둔 퍼포먼스 도구. 레이싱 시계·트랙보드처럼 고밀도 숫자, 선, grid를 적극 활용한다.

| 항목 | 정의 |
|---|---|
| Base | Dark graphite dominant |
| Accent | High-visibility yellow/green |
| Typography | condensed/technical numeric emphasis |
| Map | secondary; progress/rank HUD 우선 |
| Components | compact rows, grid, separators |
| Active Run | 가장 강함 |
| Mood | competitive, technical, aggressive |

장점: PB Attack, Ranking, Together Race에서 매우 강한 정체성을 만들 수 있다.

위험: Explore/여행/코스 발견이 딱딱해지고, 초보·가벼운 러너에게 '전문 선수용'처럼 보일 수 있다. 제품 전체가 경쟁 도구로 오해될 가능성이 높다.

## 85. 시각 방향 C - OPEN ROUTE

성격: 탐색과 발견을 강조한 밝고 넓은 지도 중심 경험. 여행·새 코스 발견에 가장 친화적이며 부드러운 surface와 풍부한 코스 정보를 사용한다.

| 항목 | 정의 |
|---|---|
| Base | Warm white/light neutral |
| Accent | Cobalt/sky |
| Typography | friendly sans-serif |
| Map | Explore의 압도적 중심 |
| Cards | 정보 단위별 부드러운 surface |
| Active Run | light/dark 선택 가능하나 경쟁 인상은 약함 |
| Mood | open, exploratory, approachable |

장점: '오늘 어디서 뛰지?'와 여행지 코스 탐색 문제를 잘 표현한다.

위험: AllTrails/일반 지도 앱과 인상이 가까워질 수 있고, 본 서비스의 경쟁/Together 차별점이 약해진다.

## 86. 방향 비교

| 평가축 | ROUTE SIGNAL | TRACK GRID | OPEN ROUTE |
|---|---|---|---|
| 코스 탐색 | 상 | 중 | 최상 |
| PB/랭킹 | 상 | 최상 | 중 |
| Together | 최상 | 최상 | 중 |
| 초보 접근성 | 상 | 중하 | 최상 |
| 야외 가독성 | 최상 | 최상 | 상 |
| 지도와 데이터 균형 | 최상 | 중 | 상 |
| 제품 확장성 | 최상 | 중 | 상 |
| 일반 러닝앱과 차별 | 상 | 최상 | 중 |
| 코스 중심 포지셔닝 적합 | 최상 | 상 | 최상 |

## 87. 최종 선택 - ROUTE SIGNAL

최종 제품 방향은 ROUTE SIGNAL로 고정한다. 이유는 본 서비스가 '코스 탐색 앱'과 '경쟁 앱' 중 하나가 아니라 두 경험을 하나의 루프로 연결해야 하기 때문이다. 밝은 Explore와 어두운 Active Run의 이중 컨텍스트를 사용하되 동일한 accent, typography, route language를 공유한다.

```text
ROUTE SIGNAL

EXPLORE
calm / light / map-first
        ↓
COURSE
route + decision + competitive context
        ↓
RUN
focused / dark / metric-first
        ↓
RESULT
achievement + route + verified competition
```

### 87.1 브랜드 시각 키워드

- Signal: 어디를 달릴지, 얼마나 앞서는지 즉시 알려주는 시각 신호
- Route: 선과 진행률이 브랜드의 핵심 형태
- Motion: 속도감보다 상태 변화에 반응하는 움직임
- Precision: 숫자와 기록을 정확하게 읽히는 typography
- Urban Outdoor: 헬스장/의료/웰니스보다 실제 야외 러닝 인상

## 89. 핵심 화면 시각 브리프

| 화면 | 비주얼 구조 | 피할 것 |
|---|---|---|
| Explore Home | 밝은 지도 55~65% + 하단 코스 결과. 상단 검색은 지도 위 고정. 선택 코스가 route signal로 강조. | 지도보다 카드가 더 커지는 구성, 대형 welcome header |
| Course Detail | 상단 route map → 핵심 수치 → 내 PB/주간 순위 compact strip → environment/elevation → reviews. RUN CTA는 하단 sticky. | 환경 정보가 RUN/PB보다 먼저 나오는 구성 |
| Play Mode | 하단 sheet. 각 mode를 동일 크기 카드 4개로 쌓지 말고 주요 모드와 context-aware target을 리스트/segment로 표현. | 설정 화면 같은 radio list |
| Run Ready | dark pre-run canvas. 중앙 GPS 상태와 목표. 하단 넓은 Start. | 여러 설정 chip과 작은 버튼 |
| Active Run | near-black. 화면 중심에 2~3개 giant metrics. 모드별 gap/progress가 한 개의 강조 strip. | 지도와 데이터 50:50 분할, 6개 metric grid |
| Result | light로 복귀. 상단 achievement statement, 핵심 기록, map, verified state, rank delta, actions. | 처음부터 세부 splits 표 |
| Ranking | 일반 list보다 self-anchor가 중요. 나를 기준으로 위/아래 rank가 읽힘. podium은 과장하지 않음. | 1~3등 장식이 화면 절반 차지 |
| Together Lobby | room goal + participant readiness가 핵심. 채팅창 없음. | 메신저 room처럼 구성 |
| Together Live | dark. virtual progress rail과 참가자 상대 진행. self metric 항상 고정. | 실제 지도 위 친구 marker |

## 97. Claude Code 첫 UI 구현 프롬프트 - 최종본

```text
모바일 UI 구현을 시작한다.

먼저 반드시 아래 파일을 전부 읽어라.
- CLAUDE.md
- docs/ui/PRODUCT-UX.md
- docs/ui/REFERENCE-MATRIX.md
- docs/ui/DESIGN-SYSTEM.md
- docs/ui/DESIGN-DIRECTION.md
- docs/ui/SCREEN-SPECS.md
- docs/ui/INTERACTION-SPECS.md
- docs/ui/ACCESSIBILITY.md
- docs/ui/VISUAL-QA.md

제품의 최종 시각 방향은 ROUTE SIGNAL이다.

중요:
- generic fitness dashboard를 만들지 마라.
- Strava/NRC/AllTrails/Runnect 등 레퍼런스 화면을 복제하지 마라.
- 레퍼런스에서는 정보 계층과 interaction pattern만 사용한다.
- Explore는 light/map-first, Active Run/Together Live는 dark/metric-first다.
- route line과 progress signal이 앱 전체의 시각적 연결 장치다.
- white rounded card stack, purple gradient, greeting hero, floating FAB 남발 금지.
- 화면의 주요 한국어 콘텐츠를 실제 길이로 넣어라.
- 새로운 token을 임의로 추가하기 전에 기존 semantic token을 확인하라.

첫 작업:
1. Design System Playground를 구현한다.
2. Route Signal v0 token을 구현한다.
3. MetricBlock, CourseCard, PrimaryRunButton, GpsStatus,
   GapIndicator, RankingRow, VerificationBadge를 만든다.
4. Explore Home을 구현한다.
5. 지도 연동이 아직 준비되지 않았다면 실제 Map component 경계를 유지한 mock adapter를 사용하되,
   임의의 정적 이미지로 구조를 굳히지 마라.
6. iOS/Android viewport에서 screenshot을 확인하고 VISUAL-QA 기준으로 수정한다.

작업 완료 시:
- 생성/수정 파일
- 재사용 컴포넌트
- 새 token
- 구현한 상태
- accessibility 확인
- 성능 위험
- visual QA 결과
- 아직 결정되지 않은 항목
을 보고한다.
```

## 99. v1.4 결론

본 서비스의 모바일 UI는 ROUTE SIGNAL을 최종 시각 방향으로 채택한다. 탐색 상태에서는 코스와 지도를 차분하게 읽고, 달리는 순간에는 화면이 강한 metric instrument로 바뀌며, 결과에서는 다시 코스와 경쟁의 의미를 연결한다. 이 컨텍스트 전환 자체가 서비스의 시각 정체성이다.

다음 산출물은 Claude Code 저장소의 DESIGN-DIRECTION.md, design token 코드, Design System Playground, Explore Home 구현이다.
