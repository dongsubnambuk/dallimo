# 레퍼런스 조사 기록 (2026-09)

명세서 58.2장 "실제 앱 구현 전 각 레퍼런스의 최신 화면은 App Store/Play Store/공식 사이트에서 다시 확인한다"에 따라 조사했다.
원본 이미지는 저작권 때문에 저장소에 넣지 않는다. 출처와 추출한 패턴만 기록한다.
명세서 원칙(CLAUDE.md 4항)대로 화면을 복제하지 않고 정보 계층·패턴만 가져온다.

## 1. 조사 범위

| 구분 | 대상 | 출처 |
| --- | --- | --- |
| 국내 러닝 앱 (59장) | 런데이, Runnect, RUNPLE, 고스트러너, 랭킹마라톤, RunPlash, Runky, 먼데이런클럽, 러닝라이프, 런투유 | App Store 한국 스크린샷 |
| 국내 앱 구현 코드 | Runnect Android | github.com/Runnect/Runnect-Android |
| 글로벌 (60·61장) | Nike Run Club, AllTrails, komoot | App Store 한국 스크린샷 |
| 디자인 레퍼런스 | Pinterest 검색 6종 (running app ui, map route ui, dark ui, 러닝 앱 디자인, workout summary, leaderboard) 72개 핀 | kr.pinterest.com |

조사하지 못한 것: TrackUs, Runnertic, 루티니스트, 달림은 App Store 페이지가 비어 있었다 (앱 ID 변경 또는 내려감). Strava, Runna는 한국 App Store 페이지를 가져오지 못했다.

Pinterest 결과의 상당수는 실제 앱이 아닌 컨셉 시안(dribbble류)이다. 검정 배경 + 형광 카드 조합이 많고, 그 자체가 흔한 AI 시안 문법이다. 그래서 실제 출시 앱 화면을 우선 근거로 삼았다.

## 2. 실제 앱에서 반복되는 패턴

| # | 패턴 | 보인 앱 | 달리모 적용 | 근거 장 |
| --- | --- | --- | --- | --- |
| P1 | 코스는 항상 **지도 위 경로 선**으로 보인다. 굵은 단색 선 + 출발/도착 점, "출발" 깃발 태그, A/B 표시 | Runnect, 고스트러너, 런투유, komoot, AllTrails, RunPlash | `CourseMapPreview`로 경로 geometry를 그린다. 지도 SDK 결정 전에는 배경 없이 경로만 | 67.1 CourseMapPreview, 88.2 route line |
| P2 | 러닝 중·기록 화면은 **어두운 지도 + 형광 단색 경로** | 고스트러너(라임), RunPlash(주황), RUNPLE(흑백) | dark 컨텍스트에서 signal bright 경로 | 87 ROUTE SIGNAL dark |
| P3 | 경로 위 **말풍선 라벨**: "오늘의 나", "나의 이전 기록", "출발" | 고스트러너, Runnect | 경로 진행 지점에 라벨을 올리는 annotation | 62 PB/Rival, 83 Signal |
| P4 | 기록 숫자는 **굵은 기울임꼴** 한 덩어리 | 런데이, NRC, Runky, RunPlash, 런투유 | metricHero/metricLarge를 기울임(oblique)으로 | 83 "fast", 95 MetricBlock |
| P5 | 요약은 **라벨+값 3~4칸 한 줄**, 카드로 감싸지 않음. 비교값(델타)은 값 위에 작게 | 고스트러너, NRC, Runnect, komoot, AllTrails | 요약 행, GapIndicator 델타 | 63.1, 91 |
| P6 | 코스 상세는 **지도 → 제목/평점 → 요약 수치 → 고도 그래프 → 세부** | AllTrails, komoot | 91장 배치 + 고도 프로필 선 | 61.1, 91 |
| P7 | 목록 항목은 카드 대신 **작은 경로 썸네일 + 제목 + 수치** 또는 구분선 목록 | NRC 기록, 런투유, Runnect 보관함 | CourseCard는 95장대로 썸네일 없는 목록이 기본, 선택은 route mark로 | 95 |
| P8 | 시작 버튼은 **크고 한 개** (원형 또는 전폭) | NRC, RUNPLE, 런투유, Runky | PrimaryRunButton 전폭 유지 (89장 "하단 넓은 Start") | 89, 95 |
| P9 | 러닝 고유 사물을 UI로 씀: 레이스 배번("BIB. 1234"), 체크무늬 깃발, D-day | 러닝라이프, RUNPLE | Together 레이스 헤더, 완주 표시에 활용 후보 | 94 |
| P10 | 섹션 구분은 두꺼운 띠 또는 여백, 선택 강조는 채움 대신 선·굵기 | Runnect, NRC | AppDivider section, 선택은 signal line | 88.2 |

## 3. AI 시안처럼 보였던 원인 (v0.1 미리보기 기준)

- 지도 자리를 빈 회색 상자로 둠 → P1 위반. 실제 앱은 이 자리에 항상 경로가 있다.
- 선택 카드, 칩, 버튼, 프레임이 모두 둥근 상자 → P10 위반.
- 숫자가 곧은 글꼴이라 기록이 무게감 없이 읽힘 → P4.
- 모든 블록이 제목·숫자·회색 설명 3줄로 같은 리듬 → P5처럼 수치는 한 줄로 모은다.

## 4. 채택하지 않은 것

| 항목 | 이유 |
| --- | --- |
| 보라 브랜드색 (런데이, Runnect, 러닝라이프) | 83장 teal 고정, 75장 보라 계열 회피 |
| 땅따먹기 영역 색칠 (랭킹마라톤, RunPlash) | 79장: 영토 점령 메타게임 복제 금지 |
| 캐릭터·포인트·기프티콘 (런투유, 랭킹마라톤, Runky) | 79장: 캐릭터 경제 제외 |
| 금·은·동 메달 배지 | 89장: podium 과장 금지 |
| 사진 배경 코스 카드 (AllTrails) | 95장: thumbnail 없는 CourseCard가 기본 |
| 정밀 위치 공유 지도 (Runky) | 62·94장: Together는 위치 대신 진행 상태 |

## 5. 출처

- App Store (한국): 런데이 id1042937618, Runnect id1663884202, RUNPLE id6475159516, 고스트러너 id6747737877, 랭킹마라톤 id6449415129, RunPlash id6790391778, Runky id6753214440, 먼데이런클럽 id6737470364, 러닝라이프 id6503121199, 런투유 id6768350528, Nike Run Club id387771637, AllTrails id405075943, komoot id447374873
- GitHub: Runnect/Runnect-Android
- Pinterest 검색: kr.pinterest.com/search/pins/?q= "running app ui", "running app map route ui", "running app dark ui", "러닝 앱 디자인", "workout summary app ui", "leaderboard app ui mobile"

## 6. 2차 조사: 시각 스타일 (v0.3 전면 교체)

사용자 지시: "구조 배치가 아니라 색상·디자인·스타일까지 레퍼런스를 최대한 활용하라. 핀터레스트, uibowl.io, wwit.design 참고."
1차 조사가 정보 계층을 봤다면, 2차 조사는 색·글자 굵기·모양·표면 처리를 봤다.

### 6.1 조사 범위

| 출처 | 대상 | 본 화면 수 |
| --- | --- | --- |
| uibowl.io (앱 > 운동&건강) | Nike Run Club, 워크온, 플랜핏, 인아웃, 필라이즈, Gentler Streak, Sweatcoin, Nike | 운동&건강 전체 859개 패턴 중 약 300장 |
| uibowl.io (UI 패턴) | 지도뷰·내주변(토스, 캐시워크, 카카오T, 쏘카, Kia 다크, 당근, 여기어때), 랭킹(토스증권, 열품타, 말해보카, Forest), 통계·리포트(워크온, 앳플리, 신한 SOL) | 약 250장 |
| wwit.design | 플랜핏 전체 흐름(온보딩·홈·운동·분석·커뮤니티·마이) | 121장 |
| Pinterest | 1차 6종 + "strava app redesign ui", "running route app ui design", "running app ui light minimal" | 36핀 추가 |

wwit.design에는 러닝 앱이 없어서 운동 앱인 플랜핏을 봤다. uibowl의 앱 상세 페이지는 로그인이 필요해 공개된 패턴 목록으로 화면을 모았다.

### 6.2 시각 패턴

| # | 패턴 | 보인 앱 | 달리모 적용 |
| --- | --- | --- | --- |
| S1 | **흑백 대비 + 형광 한 색**. 화면 대부분은 흰색/검정이고 형광색은 핵심 버튼·진행·선택 한두 곳에만 | NRC(흰 바탕·검정 버튼·볼트), 플랜핏(차콜·민트), 스트라바(흰 바탕·주황) | signal을 형광 민트 `#2BF0C0`로. 채움 전용, 글자는 흑/백 |
| S2 | **검정 알약 버튼**이 보조 행동, 형광 채움은 화면당 하나 | NRC "제출·다음", 플랜핏 "추천 운동 시작하기" | `SecondaryButton` 강조 = 검정 채움, `PrimaryRunButton` = 민트 채움 알약 |
| S3 | 카드 대신 **연회색 블록**(테두리·그림자 없음, 모서리 16 안팎) | 플랜핏 세트 입력·기록, NRC 활동 통계, 토스 | `bg.surface` = 회색 채움, 테두리 제거 |
| S4 | **큰 화면 제목** 28 안팎 굵게, 왼쪽 정렬 | NRC "러닝·활동", 플랜핏 "분석·커뮤니티" | screenTitle 28 ExtraBold |
| S5 | 기록 숫자는 **아주 굵은 기울임 + 좁은 자간** | NRC 1.21 / 143.0, 스트라바 연간 기록 | metric 역할을 Pretendard Black + 기울임 -9° |
| S6 | 지도 화면: **알약 검색창 + 흰 칩이 지도 위에 떠 있고**, 아래 흰 시트에 목록 | 토스 적립 매장, 셀레트립, 여기어때 | 탐색 화면 상단 구성 |
| S7 | 지도 핀은 **검정(짙은) 알약 + 흰 숫자**, 선택된 것만 브랜드 색 | 쏘카 주차 요금, 카카오T, 모두의주차장 | 러너 수 핀 검정, "출발" 핀 민트 |
| S8 | 밝은 지도 위 경로는 **테두리가 있는 굵은 선** | 스트라바·NRC 경로, 핀터레스트 경로 시안 | 선택 코스 = 검정 테두리 11 + 민트 6 |
| S9 | 기간·정렬 선택은 **회색 트랙 위 채운 칸** | NRC 주/월/년/전체, 열품타 일간/주간/월간 | 정렬 탭 |
| S10 | 랭킹은 **순위 · 이름 · 기록** 한 줄, 1~3위는 원 배지, 본인 행은 연한 강조 배경 | 토스증권, 열품타, 워크온 챌린지 순위 | `RankingRow` 1~3위 검정 원, 본인 민트 연한 배경 + "나" |
| S11 | 목록 썸네일은 **회색 칸 안 경로 모양**, 선택/완료는 칸 색을 뒤집음 | NRC 최근 활동, Pinterest "run receipt" | `CourseCard` 경로 칸, 선택 시 검정 칸 + 민트 경로 |

### 6.3 채택하지 않은 것

| 항목 | 이유 |
| --- | --- |
| 볼트(형광 연두), 스트라바 주황 | 사용자가 민트 네온 + 흑백을 선택. 83장 teal 계열 유지 |
| 전체 다크(플랜핏식 탐색 화면) | 87장: 탐색은 밝게, 러닝은 어둡게 |
| 별도 숫자 글꼴(NRC식 condensed) | 88.1장: 숫자를 위해 별도 장식 font를 추가하지 않음. Pretendard Black으로 대신 |
| 사진 배너·캐릭터(워크온, Gentler Streak) | 95장 사진 thumbnail 없는 기본, 79장 캐릭터 경제 제외 |
| 금·은·동 메달(열품타) | 89장 podium 과장 금지. 검정 원 배지만 |

### 6.4 출처

- uibowl.io 공개 API: `/api/v2/apps/patterns?categoryCodes=[24]`(운동&건강), `patternCodes=[62]`(지도뷰·내주변), `[69]`(랭킹), `[259]`(통계·리포트)
- wwit.design/2023/07/24/planfit/
- kr.pinterest.com/search/pins/?q= "strava app redesign ui", "running route app ui design", "running app ui light minimal"

## 7. 3차 조사: Nike Run Club 러닝 흐름 · 지도 UX (2026-09, 애플 지도 도입 때)

사용자 요청으로 NRC를 다시 봤다. REFERENCE-MATRIX가 정한 NRC 참고 범위(Run Ready, Active Run, Pause, Voice)에 맞춰 흐름과 지도 사용법만 봤다.
공개 자료로 확인한 것과 실기기에서 다시 확인해야 할 것을 나눠 적는다. 화면은 복제하지 않는다 (CLAUDE.md 4항).

### 7.1 흐름별 패턴

| # | 단계 | NRC 패턴 | 확인 | 달리모 지금 | 판단 |
| --- | --- | --- | --- | --- | --- |
| N1 | 시작 전 | 목표(거리 · 시간 · 속도)를 고른 뒤 큰 시작 버튼 하나 | 공개 자료 (MakeUseOf) | Play Mode에서 목표, Run Ready 전폭 "시작" | 이미 같은 흐름 (P8) |
| N2 | 카운트다운 | 설정에서 켜고 끄는 카운트다운 | 공개 자료 (HealthUnlocked) | 3초 카운트다운 고정 (69장) | 그대로. 끄는 설정은 명세에 없음 |
| N3 | 러닝 중 수치 | 거리 · 평균 페이스 · 시간이 중심, 지도는 보조 화면 | 공개 자료 (MakeUseOf) | giant 거리 + 페이스 · 시간, 위 버튼으로 지도 전환 | 이미 같은 위계 (92장) |
| N4 | 러닝 중 지도 | 지도는 내 위치와 지나온 길을 보여주는 확인용 | 공개 자료 + 실기기 확인 필요 | 확인용 지도 (62.2장) | **이번에 반영**: iOS 러닝 중 지도는 제스처를 끄고 내 위치를 따라간다. 장소 표시(POI)는 끈다 |
| N5 | 끝내기 | 멈춘 뒤 "끝내기"는 **길게 눌러야** 끝난다 | 공개 자료 (MakeUseOf) | 일시정지 → 종료 → 확인 sheet (SCR-R03) | 제안만: 길게 누르기로 바꾸면 한 단계 줄어든다. SCR-R03 "종료 확인"을 어떻게 볼지 결정 필요 |
| N6 | 결과 | 지도 · 거리 · 평균 페이스 · 시간 · 고도 · 케이던스 · 구간, 맨 아래 메모 · 노력 기록 | 공개 자료 (MakeUseOf, App Store) | 결과: 감정 피드백 → 수치 → 지도 → 검증 → PB/순위 → 공유 → 구간 · 고도 | 순서는 63.1장 유지. 메모 · 노력 기록은 명세에 없어 넣지 않음 |
| N7 | 기록 목록 | 기록마다 작은 경로 모양 + 날짜 + 수치 | 1차 조사 (P7) | 히스토리 월별 + 경로 썸네일 | 이미 반영 |
| N8 | 음성 안내 | 구간마다 거리 · 시간 · 페이스 안내, 가이드런 코칭 | 공개 자료 (App Store) | 코스 이탈 · 완주만 안내 | 제안만: km 안내는 AUD-001(기본 안내, P1) 범위인지 결정 필요. 코칭 콘텐츠는 제외 |
| N9 | 홈 | 가이드런 · 챌린지 등 콘텐츠 중심 | 공개 자료 | 코스 탐색이 홈 | 제외 (REFERENCE-MATRIX "콘텐츠 중심 홈은 제외") |
| N10 | 트로피 · 배지 | 달성 기록 게이미피케이션 | 공개 자료 (GoodUX) | 없음 | 제외 (GAMIFICATION-SPEC는 이후 범위) |

### 7.2 이번 애플 지도 작업에 반영한 것

| 화면 | 반영 | 근거 |
| --- | --- | --- |
| 러닝 중 | 어두운 지도, 제스처 끔, 내 위치 따라감(자유 달리기), 코스 전체 + 내 위치 맞춤(코스 러닝), 장소 표시 끔 | N4, 62.2장, CLAUDE.md 6항 |
| 러닝 준비 | 어두운 지도, 제스처 끔, 코스 · 출발점 · 내 위치만 | N1, 89장 |
| 결과 · 러닝 상세 · 코스 등록 | 정적 지도(스크롤과 제스처 충돌 방지), 코스 + 달린 길 + 출발 · 도착 | N6, CLAUDE.md 8항 |
| 탐색 | 장소 표시를 켠다(주변을 보는 화면). 러너 수 핀을 눌러 코스 선택 | 90장 |

### 7.3 출처

- MakeUseOf, "How to Make the Most of the Nike Run Club App": makeuseof.com/make-the-most-of-nike-run-club-app
- App Store, Nike Run Club id387771637 (미국)
- HealthUnlocked Couch to 5K 게시판 (카운트다운 설정)
- GoodUX, "Nike Run Club's gamified approach to fitness training"
- 러닝 중 화면 전환 방식, 결과 지도 색 표현은 공개 자료로 확인하지 못했다. 실기기에서 다시 본다.
