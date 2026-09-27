# SCREEN-SPECS

> 출처: `docs/spec/dallimo_master_spec_v1.8_feedback_features.docx` (달리모 통합 개발 명세서 v1.8)
> 옮긴 장: 4, 4.1, 61.1, 62.1, 63.1, 72, 73, 74, 90, 91, 92, 93, 94, 122.3, 127
> 명세서 원문을 그대로 옮겼다. 내용 수정은 명세서를 먼저 고친 뒤 반영한다.

## 4. 화면 정의서

| ID | 화면 | 목적 | 주요 요소 | 연계 기능 |
|---|---|---|---|---|
| SCR-A01 | 로그인 | 소셜 로그인 및 기존 세션 복구 | Apple/Google/Kakao 버튼, 약관/정책 진입 | AUTH-001 |
| SCR-A02 | 최초 프로필 | 신규 사용자 프로필 설정 | 프로필 이미지, 닉네임, 완료 | AUTH-002 |
| SCR-E01 | Explore 홈 | 주변 코스 발견 | 검색, 지도, 주변 코스, 추천 코스 | CRS-001~005 |
| SCR-E02 | 지역 검색 | 지역/장소 검색 | 검색어, 검색 결과, 최근 검색 | CRS-003 |
| SCR-E03 | 코스 상세 | 코스 판단 및 러닝 진입 | 지도, 거리, 고도, 태그, 내 기록, 랭킹, 평가, 달리기 | CRS-101~107 |
| SCR-E04 | 코스 랭킹 | 코스 경쟁 현황 | 전체/주간/월간/친구, 내 주변 순위 | RNK-001~005 |
| SCR-E05 | 코스 등록 | 완료 경로를 코스로 공개 | 코스명, 설명, 태그, 추천시간, 경로 확인 | CREG-001~004 |
| SCR-R01 | Run 홈/준비 | 러닝 모드 및 GPS 준비 | 빠른 러닝, 선택 코스, GPS 상태, START | RUN-001~003 |
| SCR-R02 | Active Run | 실시간 러닝 | 거리, 시간, 현재/평균 페이스, 지도, 진행률, 경쟁 패널 | RUN-004~009 |
| SCR-R03 | 러닝 종료 | 오입력 방지 | 계속 달리기, 종료 확인 | RUN-010 |
| SCR-R04 | 러닝 결과 | 기록·PB·랭킹 확인 | 요약, 지도, 스플릿, PB, 순위, 공유 | RST-001~005 |
| SCR-R05 | 공유 카드 | 외부 공유용 결과 생성 | Map/Record/Ranking/Battle 템플릿 | SHR-001 |
| SCR-T01 | Together 홈 | 예정/최근 실시간 러닝 | 예정 방, 최근 결과, 새 방 생성 | TGT-001 |
| SCR-T02 | 방 생성 | 실시간 러닝 조건 설정 | 모드, 거리/시간, 시작시간, 친구 | TGT-001~002 |
| SCR-T03 | Waiting Room | 시작 전 참가 상태 확인 | 참가자, READY, GPS/Network, 카운트다운 | TGT-003~004 |
| SCR-T04 | Live Run | 실시간 경쟁 | 진행률, 거리, 페이스, 순위, 연결상태 | TGT-005~010 |
| SCR-T05 | Live 결과 | 대결 결과 확인 | 순위, 기록, 차이, DNF, 공유/재대결 | TGT-011~012 |
| SCR-M01 | My | 개인 요약 | 프로필, 누적거리/시간/횟수, 최근 기록 | MY-001~003 |
| SCR-M02 | 러닝 히스토리 | 기록 탐색 | 날짜별 기록 목록 | MY-003 |
| SCR-M03 | 러닝 상세 | 개별 기록 조회 | 지도, 거리, 시간, 페이스, 스플릿, 검증상태 | MY-004 |
| SCR-M04 | 내 코스 | 코스 관리 | 등록/저장/완주 코스 | MY-005 |
| SCR-M05 | 친구 | 친구 관계 관리 | 검색, 요청, 목록, 프로필 | FND-001~005 |
| SCR-M06 | Activity | 행동형 소셜 피드 | PB, 코스등록, Challenge, 랭킹 이벤트 | ACT-001~002 |
| SCR-M07 | 설정 | 앱/러닝 설정 | 자동일시정지, 음성, Push, 개인정보, 로그아웃/탈퇴 | MY-006 |

### 4.1 Active Run 화면 상태

| RunMode | 추가 표시 | 비고 |
|---|---|---|
| FREE | 기본 러닝 지표 | 코스 없음 |
| COURSE | 코스 진행률, 기준 경로 | 완주 검증 대상 |
| PB | PB 대비 시간/거리 | 자기 기록 경쟁 |
| CHALLENGE | 상대 기록 대비 시간/거리 | 비동기 경쟁 |
| LIVE_RACE | 참가자 진행률/순위 | WebSocket |
| TIME_ATTACK | 남은 시간/거리/순위 | WebSocket |
| TOGETHER | 그룹 진행상황 | 승패 없음 |

### 61.1 우리 코스 상세 화면의 정보 계층

1. 1차: 지도 형태, 거리, 예상 시간, 핵심 난이도, 시작 지점, RUN CTA
1. 2차: 내 PB, 친구 최고 기록, 이번 주 순위, 최근 완주자
1. 3차: 고도 프로필, 경사, 신호, 야간 조도, 노면, 혼잡, 화장실/급수
1. 4차: 리뷰, 추천 시간대, 코스 설명, 생성자, 신고/공유

AllTrails처럼 모든 정보를 한 화면 첫 뷰에 밀어 넣지 않는다. 러너가 실제 출발 결정을 내리는 데 필요한 정보와 경쟁 동기를 먼저 보여주고, 환경 정보는 스크롤 하단에서 판단 보조 역할을 한다.

### 62.1 Active Run 모드별 화면 차이

| 모드 | 필수 1차 정보 | 2차 정보 | 금지/축소 |
|---|---|---|---|
| FREE | 시간, 거리, 현재/평균 페이스 | 경로, split | 소셜/랭킹 정보 |
| COURSE | 진행률, 거리, 경로 이탈 여부, 페이스 | 남은 거리, 고도 | 불필요한 경쟁 카드 |
| PB ATTACK | 현재 기록, 목표 PB, 시간/거리 gap | 진행률, 예상 finish | 상대 프로필 등 소셜 노이즈 |
| CHALLENGE | 목표 기록, 현재 gap, 진행률 | 상대 이름/기록, 순위 | 댓글/피드 |
| LIVE RACE | 순위, 진행률, 선두 gap, 내 페이스 | 참가자 상태 | 상대 정밀 위치 |
| TIME ATTACK | 남은 시간, 거리, 순위 | 페이스, 참가자 진행 | 코스 랭킹 |
| TOGETHER | 함께 달린 시간/거리, 친구 진행 | 연결 상태, 응원 | 승패 강조 |

### 63.1 결과 화면 우선순위

1. Finish 감정 피드백: 완주/PB/Challenge 성공 여부
1. 핵심 수치: 시간·거리·평균 페이스
1. 코스 지도/경로
1. 공식 검증 상태
1. PB 변화 / 랭킹 변화 / 친구와 gap
1. Share / Rematch / Challenge CTA
1. splits·고도·세부 분석

## 72. Claude Code용 화면 작업 순서

| 순서 | 화면 | 이유 |
|---|---|---|
| 1 | Design System Playground | token/component 기준 먼저 확정 |
| 2 | Explore Home | 제품의 코스 중심 정체성 결정 |
| 3 | Course Detail | 정보 계층 + 핵심 CTA 결정 |
| 4 | Play Mode Selector | 제품 차별점인 '코스를 플레이'하는 문법 확정 |
| 5 | Run Ready | GPS/권한/목표 상태 |
| 6 | Active Run FREE | 공통 Run Shell |
| 7 | Active Run COURSE/PB/CHALLENGE | 모드 패널 확장 |
| 8 | Run Result | 경쟁/공유 루프 완성 |
| 9 | Ranking | 코스 경쟁 UX |
| 10 | Together Lobby + Live | 실시간 UI |
| 11 | My/History | 기록 회고 |
| 12 | Onboarding/Auth/Settings | 핵심 경험 확정 후 마감 |

## 73. 화면 Acceptance Criteria

| 화면 | 완료 기준 |
|---|---|
| Explore | 현재 지역을 바꾸고, 코스를 지도/리스트에서 찾고, 2~3 tap 이내 Course Detail 진입 가능 |
| Course Detail | 첫 viewport에서 코스 형태·거리·난이도·내 기록/핵심 경쟁 정보·RUN CTA를 이해 |
| Play Mode | 각 모드 차이를 읽지 않아도 아이콘/제목/짧은 설명으로 구분 |
| Run Ready | GPS 상태/목표/코스 준비 여부를 명확히 표시, 준비되지 않으면 이유를 설명 |
| Active Run | 주요 metric을 이동 중 1초 glance로 인지, 필수 조작 이외의 UI 최소화 |
| Result | 완주 상태/PB/랭킹/검증 상태를 혼동 없이 확인하고 Share/Rematch가 자연스럽게 이어짐 |
| Ranking | 1등뿐 아니라 내 순위/주변 사용자/친구를 빠르게 찾음 |
| Together Live | 상대의 실제 위치 없이도 누가 앞서고 있는지, 연결이 끊겼는지 이해 |
| History | 기록을 시간 순으로 찾고 Run Detail로 이동 |
| Error/Offline | 서버/네트워크 문제와 기록 유실을 혼동시키지 않음 |

## 74. UI 상태 매트릭스

| 화면 | 필수 상태 |
|---|---|
| Explore | loading, location denied, no nearby course, network error, map ready, list ready |
| Course Detail | loading, private/hidden, no record, has PB, verification info unavailable |
| Run Ready | permission denied, GPS acquiring, GPS poor, ready, course start too far |
| Active Run | running, paused, GPS poor, route deviation, offline, recovering, finish pending |
| Result | local-only, syncing, verification pending, verified, unverified, PB, no PB |
| Ranking | loading, empty, user unranked, self visible, cursor loading |
| Together | invite, waiting, ready, disconnected, reconnecting, DNF, finished |

## 90. Explore 상세 레이아웃

```text
┌──────────────────────────┐
│ [지역/장소 검색]     [◎] │
│ [3~5km] [평지] [야간]    │
│                          │
│          MAP             │
│       ━ ROUTE ━          │
│               ● selected │
│                          │
├──────────────────────────┤
│ 이 지역 추천 코스      12 │
│                          │
│ 한강 야간 5K             │
│ 5.2 km · 평지 · 신호 적음 │
│ 내 위치에서 1.3 km        │
│                          │
│ 대구스타디움 루프         │
│ 4.8 km · 초보 추천        │
└──────────────────────────┘
```

핵심은 '지도 따로 / 리스트 따로'가 아니라 리스트 선택과 지도 route highlight가 서로 연결되는 것이다.

## 91. Course Detail 상세 레이아웃

```text
┌──────────────────────────┐
│          ROUTE MAP       │
│       ━━━━━━━━━━━        │
├──────────────────────────┤
│ 수성못 5K Loop            │
│ 5.1 km   31분   쉬움      │
│                          │
│ 내 PB 25:42   주간 18위   │
│ 친구 최고 24:51          │
│                          │
│ [        이 코스 달리기 ] │
├──────────────────────────┤
│ ELEVATION                │
│ ▁▂▂▃▂▁                   │
│                          │
│ 신호 적음 · 야간 밝음     │
│ 아스팔트 · 화장실 2곳     │
│ ...                      │
└──────────────────────────┘
```

첫 화면에서 '코스가 어떤 곳인지'와 '내가 왜 달려야 하는지'가 동시에 보여야 한다.

## 92. Active Run 상세 레이아웃

```text
┌──────────────────────────┐
│ GPS 양호             LIVE │
│                          │
│          3.72            │
│           km             │
│                          │
│  18:42         5'01"     │
│  시간          평균 페이스 │
│                          │
│ ───── 74% ━━━━━━━━━      │
│ 목표보다 08초 빠름 ▲      │
│                          │
│ [        일시정지        ] │
└──────────────────────────┘
```

모드별로 가운데 강조 strip만 바뀌도록 한다. FREE에서는 split, COURSE에서는 진행률/이탈, PB/Challenge에서는 gap, LIVE에서는 순위/leader gap.

## 93. Result 상세 레이아웃

```text
┌──────────────────────────┐
│ PB 갱신                  │
│ 이전 기록보다 21초 빨랐어요│
│                          │
│ 25:21        5.02 km     │
│ 5'03"/km                 │
│                          │
│        ROUTE MAP         │
│                          │
│ ✓ 공식 기록 인증됨        │
│ 주간 23위 → 14위          │
│                          │
│ [공유]       [다시 도전] │
│                          │
│ Splits / Elevation ...   │
└──────────────────────────┘
```

## 94. Together Live 상세 레이아웃

```text
┌──────────────────────────┐
│ 5K RACE             3/4  │
│                          │
│  2위                     │
│  3.84 / 5.00 km          │
│                          │
│ 나      ━━━━━━━━━●       │
│ 민수    ━━━━━━━━━━━● +72m│
│ 지수    ━━━━━━━●    -110m│
│                          │
│ 선두와 18초 차이          │
│ 평균 4'58"/km            │
│                          │
│ [        일시정지        ] │
└──────────────────────────┘
```

Remote Together에서는 지도보다 virtual progress가 중심이다. 상대 GPS 좌표는 기본 UI 모델에 존재하지 않는다.

### 122.3 사용자 경험

```text
달리모 실행
-> "새 러닝 기록 2개를 발견했어요"
-> 기록 선택
-> Import
-> "OO 코스와 96% 일치"
-> 내 활동에 저장
-> 검증 통과 시 코스 완주/PB 반영
```

| 화면 | 필수 요소 |
|---|---|
| 연동 설정 | Provider 상태, 권한 상태, 마지막 동기화, 연결 해제 |
| Import 후보 | 거리, 시간, 시작 시각, Source, 간단 경로 |
| Import 결과 | 매칭 코스, 검증 상태, PB 여부, 랭킹 반영 여부 |
| 내 활동 | Source Badge, Imported 표시, 검증 상태 |

## 127. 프론트엔드 구현 영향

| Feature | 화면/컴포넌트 |
|---|---|
| External Activity | IntegrationSettings, ImportCandidateCard, SourceBadge, ImportResultSheet |
| Training | WorkoutList, WorkoutBuilder, WorkoutStepEditor, RepeatBlock, TrainingRunHUD, WorkoutResult |
| Gamification | GhostGapIndicator, SegmentAttackBanner, CourseCrownBadge, LocalLegendRow |
| Run IA | RunModeSelector, QuickStartCard |

ROUTE SIGNAL 디자인 방향은 그대로 유지한다. 외부 연동/훈련 기능 추가를 이유로 메인 Explore를 카드형 피트니스 대시보드로 바꾸지 않는다.
