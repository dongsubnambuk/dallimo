# UI Foundation Decision Log

DESIGN-SYSTEM-PLAYGROUND-SPEC.md 116장 "Decision Log | 아직 미확정인 visual 값 목록 기록"에 따라 작성한다.
명세서 원문 문서(`DESIGN-SYSTEM.md` 등)는 수정하지 않았다. 명세서에 없는 값과 판단은 이 문서에만 기록한다.

> 현재 값은 **8항(v0.3)**이 기준이다. 0~4항의 색·글자·모서리 값은 v0.1~v0.2 기록으로 남겨 둔다.

## 00. v0.2 레퍼런스 기반 개선

사용자 피드백: v0.1도 AI 시안처럼 보임. 핀터레스트와 실제 국내 앱 화면을 근거로 다시 설계하라.
조사 내용과 채택/비채택 근거는 `REFERENCE-RESEARCH-2026-09.md`에 있다.

| 변경 | 내용 | 근거 |
| --- | --- | --- |
| `CourseMapPreview` 추가 | 경로 geometry를 SVG로 그림. 코스 선, 실제 이동, 이탈 점선, 출발/도착 표시, 경로 위 라벨, 주변 코스 흐리게, 거리 배지. 지도 SDK 전이라 배경 지도는 그리지 않음 | 67.1장 CourseMapPreview, 레퍼런스 P1·P3 |
| 의존성 `react-native-svg` 15.15.4 | 경로·고도 그래프 그리기. Expo SDK 57 번들 버전 (`expo install`) | Expo Go 포함 모듈 |
| 기록 숫자 기울임 | metricHero·metricLarge에 skewX -8deg | 레퍼런스 P4, 83장 "fast" |
| route 색 역할 | light: course=signal ink, actual=기본 글자색, target=반투명 signal / dark: course=signal bright, actual 흰색, target `#86E7D8` | 8항 Maps: 경로 구분, 88장 |
| CourseCard 선택 표시 | 채운 배경 상자 제거, route mark·제목·거리 색으로만 표시 | 레퍼런스 P10 |
| 미리보기 | 5개 화면 모두 경로 그림 중심으로 재구성. 코스 상세에 고도 프로필·하단 고정 CTA, 러닝 중에 "오늘의 나 / PB 기록" 경로 라벨, 결과에 실제 경로·이탈 구간, 함께 달리기에 배번 헤더 | 90~94장, P3·P5·P6·P9 |



사용자 피드백: 컴포넌트가 평범함, 글꼴·숫자가 밋밋함, Playground 구성, 색감. 폰트는 Pretendard 적용을 사용자가 승인했다.

### 0.1 국내 레퍼런스 조사 (명세서 58.2장)

- 조사 경로: 컨테이너 네트워크 정책으로 App Store, Play Store, 공식 사이트, velog 접근이 막혀 있다. 공개 소스인 Runnect Android(`github.com/Runnect/Runnect-Android`)의 실제 구현을 읽었다. 나머지 국내 앱은 명세서 59장 분석을 따른다.
- Runnect에서 확인한 구현 (값은 복제하지 않고 패턴만 채택)

| 패턴 | Runnect 구현 | 달리모 적용 |
| --- | --- | --- |
| 글꼴 | Pretendard regular/medium/semibold/bold | Pretendard regular/medium/semibold/extrabold |
| 수치 요약 | 라벨(13 Medium 회색) 위, 값(20 Bold) 아래, 1dp 세로 구분선으로 3칸 | `MetricBlock labelPosition="top"` + 세로 구분선 요약 행 (코스 상세·결과 미리보기) |
| 섹션 구분 | 8dp 회색 띠 | `AppDivider variant="section"` |
| 코스 정보 | 키(Semibold) + 값(Regular) 행 | 코스 상세 미리보기의 정보 행 |
| 랭킹 | 24dp 원형 순위 배지 · 닉네임 · 기록(아래 페이스). 본인 행은 둥근 브랜드 연한 배경 + "PB" 알약 | `RankingRow` 재구성. 금·은·동 색은 89장(podium 과장 금지)에 따라 쓰지 않고 signal 연한 배경만 |
| 버튼 모서리 | 10dp, bottom sheet 20dp | radius.control 10, sheet 20 |
| 브랜드 색 | 보라 `#593EEC` | 채택하지 않음 (83장 teal 고정, 75장 보라 계열 회피) |

### 0.2 바뀐 값

| 항목 | v0 | v0.1 | 이유 |
| --- | --- | --- | --- |
| 폰트 | 시스템 폰트 | Pretendard 4굵기 (OFL 1.1, `assets/fonts/pretendard/LICENSE.txt`) | 사용자 승인. 88.1장 후보 |
| signal | 단일 `#00BFA6` | dark `#1FE0C4` / light `#00796B` | light 배경 대비 2.19 실패 해결(4.99), dark에서 더 선명하게 |
| status (light) | `#1B9A59` `#D99500` `#D84A4A` | `#137F48` `#9A6500` `#C93D3D` | light 배경 AA(4.5) 통과 |
| status (dark) | 위와 같음 | `#2DBA72` `#D99500` `#F06262` | dark 배경 대비 향상 |
| 추가 색 역할 | - | `action.tint`, `border.strong` | 선택·본인 행 연한 배경, 비선택 route mark |
| radius | 8 / 12 / 20 | 10 / 14 / 20 | 국내 레퍼런스 |
| FilterChip | 테두리 | 채움(미선택 회색, 선택 signal), 보이는 높이 36 + hitSlop으로 터치 48 | 국내 앱 패턴, 덜 둔해 보이게 |
| MetricBlock emphasized | 왼쪽 signal 선 | 값을 signal 색으로 | light signal이 AA를 통과해 가능해짐 |

### 0.3 새 컴포넌트

- `SignalRail`: 진행률 선 + 진행 지점 점. 88.2장 "route line, progress rail을 같은 signal line 언어로 연결"을 구현한다. ParticipantChip과 러닝 중 코스 진행률에 쓴다. CLAUDE.md 13항에 따라 여기에 이유를 기록한다.
- `CourseCard`의 route mark(출발점 ─ 도착점 세로 표시)도 같은 signal line 언어다.

### 0.4 Playground

- 맨 위: 핵심 화면 5개 조합 미리보기 (98장 Distinctiveness 검증). 제품 화면 구현이 아니라 정적 예시 데이터로 만든 컴포넌트 조합이다. 지도는 SDK 결정 전이라 빈 영역으로 둔다.
- 아래: 상태 검증을 그룹별로 접고, 라이트/다크/비교를 전환한다.

## 1. 구조

| 명세서 (110장) | 실제 | 이유 |
| --- | --- | --- |
| `app/(dev)/design-system.tsx` | `src/app/(dev)/design-system.tsx` | Expo SDK 57 템플릿의 라우트 루트가 `src/app`이다 |
| `app/(tabs)/explore, run, together, my` | 만들지 않음 | UI Foundation 단계에서 제품 화면을 만들지 않는다 (MASTER-UI-BOOTSTRAP Hard rule) |
| `src/design/tokens/*` | 같음. `radius.ts`에 `elevation`, `stroke`를 함께 둠 | 88.2장 Shape & Surface가 radius와 elevation을 같이 다룬다 |
| `src/design/theme/*` | 같음 + `types.ts`, `index.ts` | |
| `src/design/primitives/*` | 같음 | |
| `src/components/<9개>/` | 같음 | |
| - | `src/features/design-system-playground/` | 라우트 파일에는 화면만 두고 본문은 features에 둔다 |
| - | `src/shared/format.ts`, `src/shared/korean.ts` | 7.4장 단위(meter, second, sec/km)를 표시 형식으로 바꾸는 함수, 조사 선택 |

## 2. 토큰

### 2.1 명세서에 있는 값

| 토큰 | 값 | 출처 |
| --- | --- | --- |
| palette 전체 | canvas/surface/text/signal/status/route | 88장 v0 후보 |
| spacing | 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 | 67장 |
| metricHero | 64/68, extra-bold(800) | 114장 후보 |
| TextRole 이름 7개, TextTone 6개 | metricHero ~ caption / primary ~ danger | 112.1장 |
| 색 역할 이름 | bg, text, action, status, gps, ranking | 67장 |
| route.course / actual / target | | 114장 (`theme.colors.route.course`). 67장의 `map.*` 대신 114장 이름을 썼다 |

### 2.2 명세서에 없어 v0 후보로 정한 값

모두 확정값이 아니다. 실기기·지도 SDK·접근성 검증 후 바꾼다.

| 토큰 | 값 | 판단 근거 |
| --- | --- | --- |
| 추가 색 역할 `action.primaryPressed` | signal의 눌림 색 | light/dark 각각 한 단계 진하게 |
| 추가 색 역할 `action.onPrimary` | light는 흰색, dark는 `#101312` | 두 경우 모두 AA 통과 (0.2장) |
| 추가 색 역할 `border.subtle` | text.secondary + alpha 0x33 | divider, skeleton, 비활성 버튼용. palette에서 파생 |
| `action.secondary` | text.primary | 보조 action은 accent 대신 기본 글자색 |
| `bg.elevated` | surface와 같은 색 + `elevation.mapOverlay` 그림자 | 88.2장: elevation은 sheet/map overlay에만 |
| `gps.good/fair/poor`, `ranking.up/down` | success / warning / danger | 별도 색을 늘리지 않고 status 색을 재사용 |
| metricHero 64/68 ExtraBold 자간 -2, metricLarge 36/40 ExtraBold 자간 -1, screenTitle 24/32 ExtraBold, sectionTitle 17/24 SemiBold, body 15/22 Regular, label 13/18 Medium, caption 12/16 Regular | | Pretendard 기준 |
| maxFontSizeMultiplier | metricHero/metricLarge 1.3, screenTitle/label 1.5, 나머지 제한 없음 | 큰 숫자·컨트롤만 제한하고 본문은 제한하지 않는다 |
| radius | control 10 / card 14 / sheet 20 / pill 999 | 88.2장 3단계 + 114장 pill, 국내 레퍼런스 |
| stroke | signal 3 / control 1.5 | signal line(선택, 본인, 진행률, emphasized metric) 두께 통일 |
| touchTarget | min 48 / primary 56 | 68장 "충분한 크기" |
| elevation | sheet, mapOverlay (boxShadow) | |
| motion | pressFeedback 120 / gapEmphasis 250 / rankReorder 250 / routeWarning 250 / finishReveal 400 / countdownStep 1000 ms | 69장 상황별 역할. 아직 애니메이션은 구현하지 않았다 |
| pressed / disabled opacity | 0.7 / 0.4 | |

### 2.3 폰트

Pretendard (사용자 승인, 88.1장 후보). Regular·Medium·SemiBold·ExtraBold 네 파일만 넣어 앱 용량 증가를 약 6.3MB로 제한했다. 숫자 고정 폭(tnum) 지원을 확인했다.

## 3. 컴포넌트 판단

| 컴포넌트 | 판단 |
| --- | --- |
| AppText | 112.1장 API의 `role`이 RN의 ARIA `role` prop과 겹쳐 RN 쪽을 제외했다. 접근성 역할은 `accessibilityRole`을 쓴다 |
| AppIcon | expo-symbols 하나만 사용. iOS SF Symbols, Android/web Material Symbols. 옆에 텍스트가 있으면 스크린 리더에서 숨긴다 |
| MetricBlock | emphasized는 값을 signal 색으로 쓴다. 값이 길면 native에서 한 줄에 맞게 줄인다. labelPosition top/bottom |
| PrimaryRunButton | 시작할 수 없으면 이유 문구를 버튼 아래에 표시한다 (73장) |
| GapIndicator | 부호: 시간은 앞서면 `−`, 거리는 앞서면 `+` (94장 "+72m"). 방향 아이콘·부호·문구를 함께 표시 |
| RankingRow | relation은 normal/self/friend + isPB. podium은 순위로 판단, nearby는 목록 배치로 표현한다. 순위 없음은 `--` |
| ParticipantChip | 상태 문구가 이름보다 앞에 온다 (113장 state first). 단 레이스 중 running은 기본 상태라 아이콘으로만 표시한다. 위치 대신 SignalRail 진행률만 표시 |
| 문구 | "GPS 찾는 중/보통/약함/사용 불가", "기록 검증 중/공식 기록 미인증/인증 거부", "초대됨/준비 완료/달리는 중/연결 끊김/완주/중도 포기" 등은 v0 문구다. "GPS 양호", "공식 기록 인증됨"은 92·93장 문구다 |

## 4. 대비 검증 (WCAG, v0.1)

| 조합 | 대비 | 결과 |
| --- | --- | --- |
| text.primary / canvas light | 17.27 | AA |
| text.secondary / canvas light | 4.72 | AA |
| text.primary / canvas dark | 17.49 | AA |
| text.secondary / canvas dark | 8.51 | AA |
| action.primary(light `#00796B`) / canvas light | 4.99 | AA |
| action.onPrimary(white) / action.primary light | 5.32 | AA |
| action.primary(dark `#1FE0C4`) / canvas dark | 11.14 | AA |
| action.onPrimary(`#101312`) / action.primary dark | 11.14 | AA |
| status success / warning / danger (light) | 4.74 / 4.65 / 4.67 | AA |
| status success / warning / danger (dark) | 7.45 / 7.34 / 5.90 | AA |
| **route.target / canvas light** | **1.37** | 실패. 지도 SDK 결정 후 route 색과 함께 다시 정한다 |

## 5. QA 범위와 한계

- 확인한 것
  - `npm run typecheck`, `npm run lint` 통과
  - `expo export` iOS/Android 번들 생성
  - web(react-native-web) Chromium에서 375 / 393 / 412 폭 스크린샷, 콘솔 오류 없음, 가로 넘침 없음
  - Draftbit `tells.md` grep 체크리스트, Expo native-slop 목록
- 확인하지 못한 것 (실기기·시뮬레이터 필요)
  - iOS/Android 실제 렌더링, safe area, Android navigation inset
  - 시스템 글자 크기 확대 (Playground 상단에 현재 배율 표시)
  - `adjustsFontSizeToFit` 동작 (web에서는 동작하지 않음)
  - 야외 햇빛 가독성, VoiceOver/TalkBack 읽기 순서
  - 동작 줄이기 설정 (아직 애니메이션 없음)

## 6. 아직 확정하지 않은 항목

- 브랜드 accent와 status 색 (v0.1 후보)
- 폰트 family
- 2.2장의 모든 v0 값
- 지도 위 route 색 구분 (지도 SDK 결정 후)
- OS dark mode 대응 방식. 현재는 화면 컨텍스트(light 탐색 / dark 러닝)만 쓰고 OS 설정은 따르지 않는다 (110.1장)

## 7. Explore Home (SCR-E01) 구현 판단

| 항목 | 판단 | 근거 |
| --- | --- | --- |
| 하단 탭 4개 | 탐색 / 달리기 / 함께 / 마이. 탐색 외 3개 탭은 구현 순서가 오기 전까지 안내 화면 | 65장, 72장 |
| 지도 경계 | `features/explore/components/ExploreMap.tsx`. SDK 결정 후 구현만 교체. 지금은 코스 경로 geometry를 SVG로 그리는 기능형 placeholder | VISUAL-IMPLEMENTATION Phase 2, 97장 |
| 지도 맞춤 | 선택 코스(+2.5km 안이면 내 위치)에 맞추고, 상단 검색·하단 시트가 가리는 높이를 비워 둔다 | 8항 Maps "지도 위 UI가 중요한 내용을 가리지 않게" |
| 경로 탭 선택 | SVG 요소에 터치 핸들러를 달지 않고 눌린 좌표와 가장 가까운 경로(24px 안)를 계산 | web/native 동작 통일 |
| 코스 상세 진입 | 목록에서 코스 선택(1) → 지도 하단 "자세히 보기" 또는 선택된 코스 다시 누름(2) | 73장 "2~3 tap 이내" |
| 데이터 | `CourseRepository` 인터페이스 + mock 구현, TanStack Query | 119장, 9.1장 |
| 위치 | `LocationSource`(49.2장) 중 권한·현재 위치만. mock 구현 | 러닝 기록용 수신은 Running Engine 단계 |
| 권한 거부 | 빈 화면 대신 기본 지역(대구 수성구) 코스를 보여주고 권한 안내 | LOC-002 "검색/조회 기능 유지" |
| 검색창 | 불러온 코스를 이름·태그로 바로 좁힌다. 지역 검색(CRS-003, SCR-E02)은 API가 생기면 연결 | 119.1장 |
| 빠른 필터 | 3~5km, 평지, 야간 밝음, 초보 추천 | 90장, CRS-004 |
| 개발용 상태 전환 | 개발 빌드에서 `/?scenario=loading|denied|empty|error` | 74장 상태 QA |
| 새 컴포넌트 | `SecondaryButton`(src/components, Playground와 탐색에서 사용), `StateNotice`(탐색 전용, 다른 화면에서 쓰이면 승격) | CLAUDE.md 13항 |
| 의존성 | `@tanstack/react-query` 5.104.0 | 9.1장 Server State |

### 7.1 탐색 화면 레퍼런스 반영 (사용자 피드백: "UI가 너무 단순함")

| 변경 | 레퍼런스 | 명세서 근거 |
| --- | --- | --- |
| 지도 바탕(물·공원·큰길·골목·장소 이름)을 SVG로 그린다. `mockMapBase.ts`, `colors.mapBase` | 모든 레퍼런스 앱은 지도 위에 경로를 올린다 (P1) | VISUAL-IMPLEMENTATION "지도 geometry를 흉내 낸 기능형 placeholder", 정적 이미지 금지. SDK 도입 시 제거 |
| 코스 시작점에 이번 주 러너 수 말풍선 | 고스트러너 코스 위 러너 수 | 64.1 Competition-aware, 83 Signal |
| 선택 코스는 흰 테두리 + signal 선, "출발" 말풍선 | Runnect 출발 태그 (P1·P3) | 83 route signal, 8항 경로 구분 |
| 선택 코스 요약 카드(이름·거리·예상 시간·이번 주 러너 수·코스 보기) | AllTrails·Runnect 지도 위 코스 카드 | 89 "지도보다 카드가 커지지 않게" → 한 줄 요약 높이 76 |
| 내 위치 버튼 | 모든 지도 앱 | 8항 Maps |
| 목록에 경로 모양(사진 아님), 거리 기울임 숫자, 사회적 신호 한 줄 | Runnect·NRC 목록 (P7), P4 | 95 "사진 thumbnail 없는 버전이 기본" 유지 |
| 정렬: 가까운 순 / 인기순 / 짧은 순 | Runnect 최신순·스크랩순 | CRS-004 필터/정렬 |
| 로딩·결과 없음·오류에서도 내 위치(또는 기본 지역) 주변 지도 표시 | - | 74 상태, 빈 회색 화면 제거 |
| 가려지는 영역·가장자리의 라벨과 말풍선 숨김 | - | 8항 "지도 위 UI가 중요한 내용을 가리지 않게" |
| `CourseSummary`에 `estimatedSec`, `finisherCount`, `weeklyRunnerCount` | - | 43장 CourseSummary는 OpenAPI 확정 시 맞춘다 |

## 8. v0.3 전면 시각 교체 (민트 네온 + 흑백)

사용자 지시: "전체 UI 디자인을 전면 교체. 단순 구조 배치가 아니라 색상·디자인·스타일을 레퍼런스에서 최대한 활용. 핀터레스트, uibowl.io, wwit.design 참고."
사용자가 네 방향(민트 네온+흑백 / 볼트+검정 / 스트라바 주황 / 전체 다크) 중 **민트 네온 + 흑백**을 골랐다.
조사 내용은 `REFERENCE-RESEARCH-2026-09.md` 6항(S1~S11)에 있다.

### 8.1 명세서와의 관계

| 명세서 | v0.3 | 판단 |
| --- | --- | --- |
| 83장 Brand Accent "Aqua/teal 계열의 고채도 signal" | 형광 민트 `#2BF0C0` | 같은 계열 안에서 채도·명도를 올림 |
| 87장 탐색 light / 러닝 dark | 유지 | |
| 88장 "raw 값은 변경 가능, semantic 역할이 먼저" | 역할 이름 유지, 값만 교체. 역할 3개 추가(아래) | |
| 88.1장 "숫자를 위해 별도 장식 font를 추가하지 않음" | Pretendard 유지. SemiBold를 Bold로 바꾸고 Black 추가 | 같은 family의 굵기만 추가 |
| 88.2장 radius 3단계 + pill | 12 / 16 / 24 / pill | |
| 95장 PrimaryRunButton이 signal을 가장 강하게 사용 | 민트 채움은 PrimaryRunButton·개수 배지·"출발" 핀·PB 표시에만 | S1 |

### 8.2 색 (color.ts)

| 역할 | light | dark | 근거 |
| --- | --- | --- | --- |
| bg.canvas | `#FFFFFF` | `#0B0B0C` | S1 흑백 |
| bg.surface | `#F3F4F2` 회색 블록 | `#1B1C1E` | S3 |
| bg.elevated | `#FFFFFF` + 그림자 | `#242528` | 88.2 sheet/map overlay |
| text.primary / secondary | `#0B0B0C` / `#666A68` | `#F4F5F4` / `#9A9E9C` | |
| **text.accent** (추가) | `#007A62` 민트 잉크 | `#2BF0C0` | 형광 민트는 흰 바탕 글자로 못 씀(1.47) |
| action.primary / onPrimary | `#2BF0C0` / `#0B0B0C` | 같음 | S1, S2 |
| action.secondary | `#0B0B0C` | `#F4F5F4` | S2 검정 알약 |
| **action.onSecondary** (추가) | `#FFFFFF` | `#0B0B0C` | |
| action.tint | 민트 20% | 민트 15% | 본인 행, 러너 수 배지 |
| **route.casing** (추가) | `#0B0B0C` | `#0B0B0C` | S8. 밝은 바탕의 민트 선 테두리 |
| route.course / actual / target | 민트 / 검정 / 민트 잉크 | 민트 / 흰색 / 민트 60% | |
| border.subtle / strong | 검정 8% / 25% | 흰색 12% / 32% | 회색 바탕 위에서도 보이게 반투명 |
| mapBase | 회색 땅 `#EEF0EC` + 흰 길 | 차콜 | 국내 지도 앱 |

규칙
- 형광 민트는 **채움 전용**이다. 흰 바탕 위 글자·얇은 아이콘에는 `text.accent`를 쓴다.
- 밝은 바탕의 signal 선(지도 경로, CourseMapPreview)은 검정 테두리를 두른다. `SignalRail`은 light에서 선을 검정, 진행 지점만 민트로 그린다.
- 기본 버튼·칩의 채움은 `border.subtle`(반투명)이다. 흰 화면과 회색 블록 위 어디서나 보이게 한다.

### 8.3 대비 검증 (WCAG)

| 조합 | 대비 | 결과 |
| --- | --- | --- |
| text.primary / canvas light | 19.67 | AA |
| text.secondary / canvas light · surface light | 5.49 · 4.97 | AA |
| text.accent `#007A62` / canvas light | 5.30 | AA |
| text.primary / canvas dark | 18.00 | AA |
| text.secondary / canvas dark · elevated dark | 7.26 · 5.65 | AA |
| onPrimary / signal | 13.42 | AA |
| signal / canvas dark | 13.42 | AA |
| signal / canvas light | 1.47 | 글자 금지, 채움 전용 |
| onSecondary / secondary (light, dark) | 19.67, 18.00 | AA |
| status success · warning · danger (light) | 5.05 · 4.96 · 4.98 | AA |
| status success · warning · danger (dark) | 7.85 · 7.73 · 6.21 | AA |
| route.casing / map land light | 17.15 | 비텍스트 3:1 통과 |
| route.target light / map land | 4.62 | 비텍스트 3:1 통과 (v0.1의 1.37 실패 해결) |

### 8.4 글자 (typography.ts)

| 역할 | v0.2 | v0.3 | 근거 |
| --- | --- | --- | --- |
| metricHero | 64/68 ExtraBold | 72/76 **Black**, 자간 -2.5 | S5 |
| metricLarge | 36/40 ExtraBold | 40/44 **Black**, 자간 -1.2 | S5 |
| screenTitle | 24/32 ExtraBold | 28/36 ExtraBold | S4 |
| sectionTitle | 17/24 SemiBold | 18/26 **Bold** | |
| 기울임 | -8° | -9° | |
| 폰트 파일 | Regular·Medium·SemiBold·ExtraBold | Regular·Medium·Bold·ExtraBold·Black | 파일 1개 증가(약 1.5MB) |

### 8.5 모양 (radius.ts)

| 토큰 | v0.2 | v0.3 | 근거 |
| --- | --- | --- | --- |
| radius control / card / sheet | 10 / 14 / 20 | 12 / 16 / 24 | 플랜핏 블록, 토스 시트 |
| 버튼 | control 모서리 | 알약(pill) | S2 |
| stroke.signal | 3 | 4 | 굵은 진행 선 |
| elevation | sheet 0 -4 16 12%, overlay 0 2 8 16% | sheet 0 -6 24 8%, overlay 0 2 12 14% | 더 넓고 옅은 그림자 |

### 8.6 컴포넌트·화면

| 대상 | 변경 | 근거 |
| --- | --- | --- |
| PrimaryRunButton | 민트 알약 + 검정 ExtraBold 글자. 비활성은 반투명 회색 | S1, S2 |
| SecondaryButton | 강조 = 검정 알약, 기본 = 반투명 회색 알약. 테두리 제거. sm 높이 40 + hitSlop | S2 |
| FilterChip | 선택 = 검정 + 체크. `variant="map"`은 흰 바탕 + 그림자 | S6, S9 |
| CourseCard | 60 회색 칸 안 경로 모양, 출발점 민트. 선택 시 칸을 검정으로 뒤집고 경로를 민트로. 거리 22 Black 기울임 | S11 |
| RankingRow | 1~3위 검정 원 배지, 본인 행 민트 연한 배경 + "나" 배지, PB 민트 배지 | S10 |
| SignalRail | light는 검정 선 + 민트 진행점, dark는 민트 선 | 8.2 규칙 |
| CourseMapPreview | 지도 바탕색, 검정 테두리 경로 | S8 |
| 탐색 지도 | 선택 코스 검정 테두리 + 민트, 비선택 코스 검정 32%, 러너 수 핀 검정 알약 + 꼬리, "출발" 핀 민트, 내 위치 민트 원 | S7, S8 |
| 탐색 화면 | 알약 검색창, 지도 위 흰 칩, 내 위치 버튼(선택 시 검정), 선택 코스 카드 수치 20 Black, 러너 수 민트 배지, 시트 제목 21 ExtraBold + 민트 개수 배지, 정렬을 회색 트랙 탭으로 | S6, S9 |
| 하단 탭 | 활성 검정, 라벨 Bold 11 | NRC |
| Playground 미리보기 | 화면 바탕을 canvas(흰색)로, 시트·고정 바를 elevated로 | 8.2 |

### 8.7 확인 범위

- 웹(react-native-web) Chromium에서 375 / 393 / 412 폭, 탐색 6개 상태와 Playground 전체 스크린샷
- 실기기·시뮬레이터 확인은 아직 하지 않았다 (5항과 같은 한계)
