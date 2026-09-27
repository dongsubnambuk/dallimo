# REFERENCE-MATRIX

> 출처: `docs/spec/dallimo_master_spec_v1.8_feedback_features.docx` (달리모 통합 개발 명세서 v1.8)
> 옮긴 장: 58, 58.1, 58.2, 59, 59.1, 60, 61, 62, 63, 66, 78, 79, 80
> 명세서 원문을 그대로 옮겼다. 내용 수정은 명세서를 먼저 고친 뒤 반영한다.

## 58. 모바일 UI/UX 레퍼런스 연구 및 Claude Code 구현 플레이북 v1.3

목적: 모바일 앱 UI를 개별 레퍼런스 화면의 모방으로 만들지 않고, 실제 러닝·피트니스·코스 탐색·경쟁·소셜 앱의 검증된 UX 패턴을 기능 단위로 분석한 뒤 본 서비스의 제품 구조와 기술 제약에 맞는 하나의 일관된 디자인 시스템으로 재구성한다.

본 장의 레퍼런스는 '참고 대상'이며 시각 요소를 그대로 복제하기 위한 목록이 아니다. 각 패턴은 사용자 문제, 정보 우선순위, 조작 상황, 러닝 중 안전성, React Native/Expo 구현 비용을 기준으로 채택 여부를 결정한다.

### 58.1 연구 범위와 방법

| 축 | 조사 대상 | 분석 기준 |
|---|---|---|
| 국내 러닝 | 런데이, Runnect, RUNPLE, GhostRunner, 랭킹마라톤, RunPlash, Runky, 먼데이런클럽, 러닝라이프, 런투유, TrackUs, Runnertic, 루티니스트, 달림 | 한국 사용자 언어, 지도/코스, 경쟁, 크루/친구, 기록/공유 |
| 글로벌 러닝 | Strava, Nike Run Club, Runna, ASICS Runkeeper, adidas Running, MapMyRun | 러닝 시작, 기록, PB, 코칭, 목표, 소셜 |
| 코스/탐색 | RunGo, AllTrails, Komoot, Garmin Connect, COROS | 지도 중심 탐색, 필터, 상세 정보, 경로 저장/내비게이션 |
| 몰입/경쟁 | Zwift, GhostRunner, RunPlash, RUNPLE, 랭킹마라톤 | 랭킹, 게임성, 실시간 상태, 경쟁 피드백 |
| 공유/회고 | Relive, Strava, Runna, 국내 기록 앱 | 결과 시각화, 공유 카드, 재도전 동선 |
| 구현 도구 | Anthropic Frontend Design, Expo Skills, Draftbit mobile-taste, ui-skills 등 | Claude Code에서 재현 가능한 디자인 프로세스/검증 |

### 58.2 레퍼런스 사용 규칙

- 한 앱을 전체 디자인 기준으로 삼지 않는다. 기능별로 가장 잘 푼 사례를 분해한다.
- 화면 모양보다 정보 우선순위와 인터랙션 이유를 기록한다.
- 러닝 중 화면은 정지 상태의 일반 앱 UX와 별도 원칙을 적용한다.
- 국내 앱은 한국 사용자에게 익숙한 정보 표현과 경쟁/소셜 문법을 확인하는 용도로 우선 활용한다.
- Strava/NRC 같은 대형 앱은 그대로 복제하지 않고 본 서비스의 '코스 중심' 제품 구조에 맞춰 재배치한다.
- 실제 앱 구현 전 각 레퍼런스의 최신 화면은 App Store/Play Store/공식 사이트에서 Claude Code 작업자가 다시 확인한다.

## 59. 국내 러닝 앱 레퍼런스 분석

| 앱 | 관찰 기능 | 가져올 패턴 | 배제/변형 |
|---|---|---|---|
| 런데이 | 풀보이스 코칭, 초보/훈련 플랜, 자유 달리기, 챌린지 | 러닝 전 '오늘 무엇을 해야 하는지'를 명확히 제시하는 훈련 CTA, 러닝 중 음성 비중 | 본 서비스는 훈련 앱이 아니므로 코칭 홈 구조는 배제. 음성 피드백의 간결한 전달 방식만 참고. |
| Runnect | 코스 직접 그리기, 코스 발견/검색/스크랩, 공유, 트래킹 | 코스가 독립 콘텐츠로 존재하고 발견→저장→실행으로 이어지는 구조 | 우리의 Explore/Course Detail 핵심 참고. 단, 코스 상세는 랭킹·환경 정보·PB까지 강화. |
| RUNPLE | 랭킹존, 주간 리그, 크루런, 매거진 | 물리적 장소를 경쟁 공간으로 바꾸는 '랭킹존', 주간 리그의 리셋 리듬 | 코스별 Weekly Ranking/친구 랭킹에 참고. 매거진/콘텐츠 탭은 초기 제외. |
| GhostRunner | 과거의 나/다른 기록과 실시간 경쟁, 코스 러닝, 시청각 피드백 | 목표 기록과 현재 차이를 러닝 중 즉시 보여주는 경쟁 UX | PB Attack/Rival 모드의 직접 참고. Ghost 자체를 서비스 정체성으로 삼지는 않음. |
| 랭킹마라톤 | 비대면 대회, 전세계 순위, 경쟁 중심 | 장소가 달라도 같은 목표에 참여한다는 대회 문법 | Together Time/Distance Race, 시즌 이벤트에 참고. 공식 코스 랭킹과 원격 랭킹은 분리. |
| RunPlash | GPS 러닝으로 실제 구역 점령, 크루 방어전 | 운동 결과가 지도에 지속적인 세계 상태로 남는 게임화 | 영토 게임은 제품 범위에서 제외. '달린 결과가 다음 행동을 만든다'는 피드백 루프 참고. |
| Runky | 실시간 러닝 공유, 다른 러너 진행 상태, 랜덤 매칭 | 원격 러닝에서 상대의 거리/페이스를 실시간 상태로 소비 | Together 화면의 live progress 구조 참고. 랜덤 매칭은 초기 제외. |
| 먼데이런클럽 | 주변 러너 매칭, 번개런, 외부 러닝 기록 연동 | 혼자 뛰기 싫은 문제를 일정/지역 기반 매칭으로 해결 | 오프라인 만남/매칭은 초기 범위 밖. 향후 공개 Together/크루의 참고. |
| 러닝라이프 | 대회 탐색, 기록, 훈련, 러닝화, 크루 | 러너의 여러 요구를 한 앱에서 제공 | 기능 과밀의 반례로도 사용. 본 서비스는 Course/Competition/Together에 집중. |
| 런투유 | 러닝 기록 + 픽셀 캐릭터/마일리지 + 소셜 | 성취를 캐릭터 보상으로 변환 | 초기에는 캐릭터/재화 제외. 결과 화면에서 성취감 연출 정도만 참고. |
| TrackUs | 지도 기반 코스 지정 + 러닝 모집 | 코스와 사람 모집을 같은 객체로 연결 | 향후 코스 기반 공개 러닝/Meetup 설계에 참고. |
| Runnertic | 코스 탐색/생성, 리더보드, 고스트, 관광/편의시설 | 코스 상세에 편의시설/관광정보를 결합 | 우리 Travel Run 정보 구조와 유사. 편의시설·환경 레이어 참고. |
| 루티니스트 | 지역/또래 랭킹, 친구 응원, 스트릭, 공유 카드 | 가까운 비교집단, '총 N명 중 M등' 같은 즉시 이해 가능한 경쟁 | Near-my-rank, 지역 맥락, 결과 공유에 참고. 성별/연령 경쟁은 개인정보 정책 검토 전 도입하지 않음. |
| 달림(러너의 실험실) | AI 폼 분석, 리더보드, 훈련 도구 | 전문 데이터/훈련 기능을 도구 묶음으로 제공 | 본 앱 핵심과 무관한 분석 기능은 배제. 고급 도구가 메인 러닝 UX를 침범하지 않는 정보구조 참고. |

### 59.1 국내 앱에서 확인되는 공통 패턴

- 코스 공유만으로는 차별화가 어렵다: Runnect, Runnertic, GhostRunner 등에서 이미 코스 발견/공유가 존재한다.
- 랭킹 역시 독립 기능으로는 희소하지 않다: RUNPLE, 랭킹마라톤, 루티니스트 등이 경쟁을 제공한다.
- 실시간/함께 달리기도 Runky, 먼데이런클럽 등 다양한 형태가 존재한다.
- 따라서 본 서비스 UI는 각 기능을 병렬 메뉴로 늘어놓는 방식이 아니라 '코스 발견 → 해당 코스에서 플레이 모드 선택 → 결과/랭킹 → 공유/재도전'이라는 하나의 루프로 보여줘야 한다.

## 60. 글로벌 러닝 앱 레퍼런스 분석

| 앱 | 핵심 UX | 참고할 점 | 본 서비스 적용 |
|---|---|---|---|
| Strava | Maps/Segments, 활동 기록, 소셜, 챌린지 | 지도 탐색 + bottom sheet, 세그먼트 상세/기록 비교, 활동 결과의 소셜 전환 | 코스/랭킹 정보 구조와 기록 비교에 강하게 참고. 피드 중심 IA는 채택하지 않음. |
| Nike Run Club | 즉시 러닝 시작, Guided Runs, 명확한 러닝 메트릭 | 러닝 시작 CTA가 강하고 활동 중 정보가 단순함 | Active Run 화면의 시인성/행동 최소화. 콘텐츠 중심 홈은 제외. |
| Runna | 개인 계획, 주차별 진행, 운동 카드 | '이번에 해야 할 행동'을 카드 하나로 명확히 만드는 구조 | 코스 상세에서 '이 코스 달리기/도전하기' CTA 우선순위에 참고. |
| ASICS Runkeeper | Start 중심 지도, 목표/트레이닝, 기록 | 지도 위에서 바로 시작 가능한 단순한 Start 경험 | Quick Run / 준비 화면 참고. |
| adidas Running | 활동 기록, 목표, 챌린지, 커뮤니티 | 기록→목표→챌린지 연결 | 챌린지는 본 서비스에서는 코스/친구 기록에 한정해 더 구체화. |
| MapMyRun | 러닝 추적, 분석, 접근성 지원 | 기본 tracking UX와 접근성 | Dynamic Type/대비/VoiceOver 검증 체크리스트에 반영. |
| Garmin Connect | 활동 상세 분석, 코스 생성, 친구 순위 | 고밀도 데이터의 계층적 노출 | 결과 상세/통계 화면에서 progressive disclosure 참고. |
| COROS | Explore 지도/route, 활동 상세, 기기 연동 | 지도와 코스 관리가 별도 목적을 갖는 구조 | Explore/내 코스 보관함에 참고. |

## 61. 코스/지도 UX 전문 레퍼런스

| 서비스 | 강점 | UX 원리 | 적용 |
|---|---|---|---|
| RunGo | 러닝 경로 선택 + 음성 turn-by-turn | 코스 상세에서 Start Route가 명확하고 러닝용 음성 내비게이션이 핵심 | 초기에는 완전 내비게이션보다 코스 이탈 안내부터 시작 |
| AllTrails | 500k+ trail 검색, 조건/리뷰/난이도/날씨/상태/오프라인 지도 | 사용자가 출발 전에 '이 길이 나에게 맞는지' 판단할 정보가 풍부 | 우리 코스 상세의 조명/신호/노면/혼잡/화장실/물 정보에 직접 참고 |
| Komoot | sport-specific planner, 표면/난이도/거리/고도, 하이라이트 | 지도와 elevation profile을 하나의 계획 도구로 결합 | 코스 상세/경로 미리보기에서 고도와 중요 포인트 표시 |
| Garmin Connect | 코스 생성/저장/기기 전송 | 코스를 실행 가능한 객체로 관리 | Saved Course / Watch 연동 확장 시 참고 |
| COROS | Explore 지도, route/saved location 관리 | 탐색과 장치 실행 간 연결 | Watch/route sync 확장 시 참고 |

## 62. 경쟁 및 실시간 UX 레퍼런스

| 레퍼런스 | 핵심 패턴 | 우리 서비스 적용 |
|---|---|---|
| Strava Segments | 한 구간에 대해 개인/다른 사용자 기록 비교 | 공식 Course Ranking의 비교 문법 |
| GhostRunner | 과거 기록과 실시간 gap | PB ATTACK / RIVAL의 핵심 |
| RUNPLE | 랭킹존/리그 | 코스가 경쟁 장소가 되는 표현 |
| 랭킹마라톤 | 원격 대회/순위 | 동일 물리 코스가 아닌 경쟁의 별도 카테고리 |
| Zwift | 공간이 달라도 실시간 그룹/레이스 상태 | Together의 몰입·순위 변화·finish feedback |
| Runky | 상대 distance/pace 실시간 공유 | 실제 GPS 위치를 공유하지 않고 progress를 공유하는 Together UX |

## 63. 결과/공유 UX 레퍼런스

| 레퍼런스 | 패턴 | 적용 |
|---|---|---|
| Strava | 활동 지도 + 핵심 기록 + 소셜 반응 | 결과를 '기록 객체'로 정리 |
| Relive | GPS 여정을 시각적 스토리로 재구성 | 공유가 단순 캡처가 아니라 콘텐츠가 됨 |
| Runna | 훈련 성취/계획 진행과 결과 연결 | 완료의 의미를 다음 계획과 연결 |
| 루티니스트 | 스토리 공유 카드, 랭킹 변화 | 한국 SNS 공유 문맥 |
| Iron Ladder(비러닝) | workout receipt/sticker형 공유 | 운동 결과를 SNS 위에 얹는 share asset 발상 |

우리 서비스의 결과 화면은 '기록 확인'으로 끝나면 안 된다. `완주 → 검증 → PB/랭킹 변화 → 공유 → challenge/rematch`가 한 화면에서 자연스럽게 이어져야 한다.

## 66. 화면별 레퍼런스 매핑

| 화면 | 주요 레퍼런스 | 가져올 패턴 | 구현 방향 |
|---|---|---|---|
| Explore Home | Strava Maps + AllTrails discovery + Runnect course discovery | 지도/리스트 혼합, 지역 검색, 빠른 필터 | 코스 추천은 카드보다 지도 문맥과 결합 |
| Course Detail | AllTrails + Komoot + Strava Segment + RunGo | 경로/고도/환경 + 경쟁 정보 + Start | 한 화면에 '정보'와 '행동'을 명확히 구분 |
| Play Mode Sheet | 게임 모드 selector + Runna의 single-primary-action | 모드 3~5개, 설명 1줄, 최근 사용 강조 | 설정 페이지처럼 보이지 않게 |
| Run Ready | Runkeeper/NRC | GPS 준비 상태 + 목표 요약 + 큰 Start | 권한/정확도 문제를 시작 전 해결 |
| Active Run | NRC + GhostRunner + Zwift | 큰 metric, mode별 gap/progress | 공통 shell + 모드별 패널 |
| Pause | NRC/운동 앱 일반 | resume/finish 명확 | 실수 finish 방지 |
| Result | Strava + Relive + Runna | 성취→기록→지도→랭킹→share | 세부 통계는 아래 |
| Ranking | Strava Segment + RUNPLE + 루티니스트 | 내 주변 순위, 친구, 주간 | 1등 중심보다 '내 위치'가 먼저 |
| Together Lobby | 그룹 운동/게임 lobby | 참가자 상태/Ready/시작 조건 | 채팅은 초기 제외 |
| Together Live | Zwift + Runky | virtual progress + rank/gap | 정밀 위치 공유 금지 |
| Share Composer | Relive + Strava + social workout receipt | Map/Record/Ranking/Battle 템플릿 | 앱 UI 캡처가 아닌 공유 전용 asset |

## 78. UI/UX 레퍼런스 최종 채택 맵

| 영역 | Reference Blend | 최종 의미 |
|---|---|---|
| Explore | Strava + AllTrails + Runnect | 지도 기반 발견 + 러닝 코스 콘텐츠 |
| Course Detail | AllTrails + Komoot + Strava Segment | 환경 정보 + 고도 + 경쟁 정보 |
| Start/Ready | NRC + Runkeeper | 큰 primary action + 최소 준비 정보 |
| PB/Rival | GhostRunner + Strava | 목표 기록 대비 gap |
| Ranking | Strava + RUNPLE + 루티니스트 | 공식 기록 + 주간 + 친구 + 내 주변 |
| Together | Zwift + Runky | virtual progress / rank / reconnect |
| Voice | 런데이 + NRC | 짧고 행동 가능한 음성 안내 |
| Result | Strava + Runna | 기록/성취/다음 행동 |
| Share | Relive + workout receipt patterns | 앱 화면 캡처가 아닌 공유 전용 카드 |

## 79. 절대 복제하지 않을 패턴

- Strava처럼 Feed를 앱 중심으로 두는 구조
- Runna처럼 Training Plan이 Home의 중심이 되는 구조
- AllTrails처럼 코스 상세에서 트레일 정보가 러닝 경쟁보다 앞서는 구조
- Zwift의 3D 게임 세계 자체
- RunPlash의 영토 점령 메타게임
- 런투유의 캐릭터 경제
- 국내 올인원 러닝 앱처럼 대회/쇼핑/매거진/커뮤니티/트레이닝을 모두 메인 메뉴에 넣는 구조
- AI가 흔히 생성하는 동일 radius의 카드 스택 UI

## 80. 레퍼런스 출처

| Source | URL |
|---|---|
| Runnect App Store | https://apps.apple.com/kr/app/runnect/id1663884202 |
| 런데이 App Store | https://apps.apple.com/kr/app/id1042937618 |
| RUNPLE App Store | https://apps.apple.com/kr/app/runple/id6475159516 |
| GhostRunner | https://ghostrun.io/ |
| GhostRunner App Store | https://apps.apple.com/kr/app/ghostrunner/id6747737877 |
| 랭킹마라톤 App Store | https://apps.apple.com/kr/app/id6449415129 |
| RunPlash App Store | https://apps.apple.com/kr/app/id6790391778 |
| Runky App Store | https://apps.apple.com/kr/app/runky/id6753214440 |
| 먼데이런클럽 App Store | https://apps.apple.com/kr/app/id6737470364 |
| 러닝라이프 App Store | https://apps.apple.com/kr/app/id6503121199 |
| 런투유 App Store | https://apps.apple.com/kr/app/id6768350528 |
| TrackUs App Store | https://apps.apple.com/kr/app/id6503694333 |
| Runnertic App Store | https://apps.apple.com/kr/app/runnertic/id6797750002 |
| 루티니스트 App Store | https://apps.apple.com/kr/app/id6762175125 |
| 달림(러너의 실험실) App Store | https://apps.apple.com/kr/app/id6787890576 |
| Nike Run Club KR | https://www.nike.com/kr/nrc-app |
| Strava Segment Help | https://support.strava.com/en-us/articles/15401734-how-do-i-find-segments-on-the-strava-app |
| Runna | https://www.runna.com/ |
| ASICS Runkeeper App Store | https://apps.apple.com/kr/app/id300235330 |
| adidas DALLIMO Store | https://apps.apple.com/kr/app/id336599882 |
| Map My Run App Store | https://apps.apple.com/kr/app/id291890420 |
| RunGo | https://www.rungoapp.com/ |
| AllTrails App Store | https://apps.apple.com/kr/app/id405075943 |
| Komoot App Store | https://apps.apple.com/kr/app/id447374873 |
| Relive App Store | https://apps.apple.com/kr/app/id1201703657 |
| Garmin Connect App Store | https://apps.apple.com/kr/app/id583446403 |
| COROS App Store | https://apps.apple.com/kr/app/id1277625343 |
| Zwift App Store | https://apps.apple.com/kr/app/id1134655040 |
| Expo Skills | https://github.com/expo/skills |
| Anthropic frontend-design | https://github.com/anthropics/claude-code/tree/main/plugins/frontend-design |
| Draftbit mobile-taste-skill | https://github.com/draftbit/mobile-taste-skill |
| dawitlabs ui-skills | https://github.com/dawitlabs/ui-skills |
| Claude Code UI/UX Skill | https://github.com/nicohodt/claude-code-ui-ux-skill |
| Mobile App UI Design Skill | https://github.com/ceorkm/mobile-app-ui-design |
| Mobile App Design Standards Skill | https://github.com/awesome-skills/mobile-app-design |
