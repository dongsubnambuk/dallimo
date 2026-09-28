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

## 9. v0.4 다듬기: 실제 지도 데이터, 무게 줄이기

사용자 피드백: "뭔가 밤티(촌스러움)". 실제 앱 화면(토스·쏘카 지도, NRC 목록)과 나란히 놓고 원인을 찾았다.

### 9.1 원인

| 원인 | 설명 |
| --- | --- |
| 가짜 지도 | 화면 55%를 차지하는 지도가 격자 도로 + 둥근 호수 도형이라 한눈에 모형으로 보였다. 실제 앱은 모두 실제 지도 위에 올린다 |
| 너무 무거운 검정 | 검정 테두리 경로, 검정 핀, 검정 정렬 칸, 검정 경로 칸, 검정 버튼이 한 화면에 겹쳤다 |
| 과한 굵기 | 목록 거리·수치까지 Black 기울임, 시트 제목 ExtraBold 21, 민트 개수 배지 |
| 과한 확대 | 선택 코스 하나에 맞춰 호수가 지도를 꽉 채워 주변 맥락이 없었다 |

### 9.2 변경

| 대상 | 변경 | 근거 |
| --- | --- | --- |
| 지도 바탕 | OpenStreetMap 실제 데이터(수성못·범어공원·신천·앞산 일대, 35.803~35.860N, 128.583~128.655E)를 단순화해 `mockMapData.ts`(약 74KB)로 넣고 SVG로 그린다. 공원·물·보행로(점선)·골목·보조·간선 4단계 도로, 회색 테두리 흰 길 | 97장 "정적 이미지로 지도를 흉내 내지 않는다" — 이미지가 아니라 좌표 데이터. ODbL에 따라 지도 왼쪽 아래 "© OpenStreetMap" 표시. SDK 도입 시 파일째 삭제 |
| mock 코스 | 수성못 호안(+10m), 신천 동쪽 강변, 들안로, 범어공원 산책로, 두산오거리 주변 도로를 따라 다시 만듦(`mockCourseRoutes.ts`). 거리·예상 시간은 경로 길이에서 계산. 이름 "들안로 왕복", "신천 강변 왕복"으로 실제 거리와 맞춤 | 코스가 실제 길 위에 있어야 지도가 믿을 만해 보인다 |
| mock 내 위치 | 35.8286, 128.6219 (수성못 북동쪽 입구) | 가장 가까운 코스가 수성못 둘레길이 되게 |
| 선택 경로 | 흰 여백 12 + 짙은 민트 테두리 8 + 형광 민트 4.5. 검정 테두리 제거 | 스트라바 경로 표현. `route.casing` = `#0A6E5A` |
| 비선택 경로 | 흰 여백 + 회색 3.5 | |
| 러너 수 핀 | 흰 알약 + 회색 아이콘 + 검정 숫자 | 토스·카카오맵 흰 핀. 강조색은 "출발" 핀 하나 |
| 핀·지명 겹침 | 출발 핀 → 러너 많은 코스 → 지명 순으로 자리를 잡고 겹치면 숨김. 상단 검색·칩에 가리는 핀도 숨김 | 8항 Maps "overlay 절제" |
| 축척 | 가로 1.3km·세로 0.5km보다 더 확대하지 않음. 내 위치는 선택 코스에서 1.2km 안일 때만 함께 맞춤 | 주변 맥락 유지, 작은 화면에서 과한 축소 방지 |
| 목록 경로 칸 | 선택 시 연한 민트 칸 + 짙은 민트 경로 (검정 칸 제거) | |
| 거리·수치 | Black → ExtraBold, 20/19 | |
| 시트 제목 | 20 Bold + 회색 개수 (민트 배지 제거) | |
| 정렬 | 회색 트랙 위 선택 칸만 흰색 + 옅은 그림자 (검정 제거) | iOS·토스 segmented control |
| 그림자 | mapOverlay 0 3 14 10% | 더 옅게 |
| 지도 색 | 땅 `#F1F1EE`, 물 `#B8D8EE`, 공원 `#D3E9C8`, 도로 테두리 `#DCDDD7`, 보행로 `#A9B8A2`. `mapBase.roadCasing`, `mapBase.path` 역할 추가 | 국내 지도 앱 |

### 9.3 확인

- 375 / 393 / 412 폭 탐색 6개 상태, 지도 경로 탭으로 선택 변경, Playground 전체. 콘솔 오류 없음
- 실기기 확인은 아직 하지 않았다. SVG path 수가 늘어 실기기 렌더링 성능은 측정이 필요하다 (9항 Performance)

## 10. v0.5 탐색 화면: "켜고 싶은" 첫 화면

사용자 피드백: "앱을 켜고 싶게 만들어야지. 왜 자꾸 기본으로 가냐." v0.4는 정보는 맞지만 토스식 기본 유틸리티 화면이라 브랜드·동기가 없었다.

| 변경 | 내용 | 근거 |
| --- | --- | --- |
| 브랜드 지도 | 지도 바탕을 무채색(땅 `#ECEDEA`, 물 `#D3DCE2`, 공원 `#E0E5DD`)으로. 색은 코스에만 | 스트라바 히트맵·NRC 경로 화면. 83장 "지도 위 route signal이 가장 먼저 보임" |
| 모든 코스를 형광 민트로 | 비선택 코스도 짙은 민트 테두리 + 형광 민트 선. 선택 코스는 넓은 민트 번짐 + 굵은 선 | 동네에 달릴 수 있는 길이 빛나 보이게. 선택/비선택은 굵기·번짐·"출발" 핀으로 구분 (색만으로 구분하지 않음) |
| 지도 위 첫 문장 | 검정 알약 "● 이번 주 내 주변 413명 달렸어요" (주변 코스의 이번 주 러너 수 합) | 64.1장 사회적 신호. 새 데이터 없이 기존 값에서 계산 |
| 검색 | 상단 알약 검색창 → 둥근 검색 버튼, 누르면 검색창으로 펼침 | 지도 위 overlay 절제 (8항) |
| 코스 티켓 | 선택 코스 카드를 검정(dark 컨텍스트) 티켓으로: 이름, 30pt 기울임 거리·시간·이번 주 러너, "코스 1위 7:48", "내 PB 10:12 · 1위까지 2:24"(없으면 "첫 기록에 도전"), 민트 "코스 보기" | 62장 PB/Rival, 64.1장 Competition-aware. 코스와 경쟁을 같은 객체 문맥에서 (82.1 Strava Segments) |
| 인기 표시 | 이번 주 러너가 가장 많은 코스에 민트 "이번 주 인기" 배지 | |
| 필터·정렬 | 지도 위 → 시트 제목 아래로. 정렬은 "가까운 순 ⇅" 한 버튼으로 순환 | 지도를 가리지 않게 |
| 목록 썸네일 | 검정 칸 위 형광 민트 경로(번짐 포함), 선택 시 민트 테두리 | NRC 어두운 활동 썸네일 |
| 목록 셋째 줄 | 내 PB가 없으면 "1위 기록"을 보여 도전 동기 | |
| 데이터 | `CourseSummary.leaderSec`(코스 1위 인증 기록) 추가 | 43장 CourseSummary는 OpenAPI 확정 시 맞춘다 |
| 아이콘 | `close`, `swap` 추가 | |

- 89장 "상단 검색은 지도 위 고정"은 검색 버튼으로 지도 위에 유지했다.
- 다른 러너의 실시간 위치는 표시하지 않는다 (62·94장 위치 공유 원칙). 수만 보여준다.

## 11. 브랜드 아이덴티티: 심볼 "모"

사용자 피드백: "서비스명에 맞게 아이덴티티가 있어야 한다." 명세서는 서비스명(117장)과 문구 후보(117.2)만 정했고 로고·심볼은 없다. 앱 아이콘과 스플래시는 Expo 기본값(파란 스플래시)이었다.

### 11.1 개념

- 달리모 = **달리**(다) + **모**(여). 모이는 곳은 코스다.
- 심볼은 "모" 한 글자. **ㅁ을 한 바퀴 코스 루프로, 그 위에 출발점(흰 점)**을 찍었다. 83장 route signal의 선·출발점 언어를 글자로 옮긴 것이다.
- 시안 3개(A 루프 도형, B "모" 글자, C 트랙 레인 워드마크)를 비교해 B를 골랐다. A는 흔한 원형 아이콘처럼 보였고, C는 영문 조합이 복잡했다. B는 아이콘만 봐도 서비스명 한 글자가 읽힌다.

### 11.2 만든 것

| 항목 | 내용 |
| --- | --- |
| 워드마크 `Wordmark` | "달리"는 Pretendard Black(OFL 1.1) 글리프 윤곽, "모"는 같은 획 두께(약 290/2048)로 다시 그린 전용 글자. light: 검정 + 민트 출발점, dark: 흰 "달리" + 민트 "모" |
| 심볼 `BrandSymbol` | "모" 단독. signal(어두운 바탕, 민트 글자 + 흰 출발점) / ink(밝은 바탕, 검정 글자 + 민트 출발점) |
| 로딩 `BrandLoader` | 출발점이 ㅁ 루프를 한 바퀴씩 도는 애니메이션(reanimated). 동작 줄이기 설정이면 정지 |
| geometry | `src/components/Brand/brandGeometry.ts` (자동 생성) |
| 앱 아이콘 | 검정 바탕 + 민트 "모" + 흰 출발점. iOS는 `icon.png`로 바꾸고 Expo 기본 `assets/expo.icon` 제거 |
| Android 적응형 아이콘 | 전경(안전 영역 안 민트 "모"), 배경 검정, 모노크롬 흰 "모" |
| 스플래시 | 검정 바탕 + dark 워드마크, 폭 180 |
| 파비콘 | 48px 심볼 |

### 11.3 앱 안에서 쓰는 곳

| 위치 | 적용 |
| --- | --- |
| 탐색 지도 위 첫 문장 | 심볼 + "이번 주 413명이 달리러 모였어요" (서비스명을 문장으로 풀기. 117.1장 기능명 종속 금지와 무관한 안내 문장) |
| 지도 로딩 | `BrandLoader` |
| 하단 탭 | 선택된 탭 아이콘 오른쪽 위 민트 출발점 |
| 아직 구현 전 탭 화면 | 상단 워드마크 |
| Playground | "브랜드" 그룹 (워드마크, 심볼 크기별, 로딩) |

- 117.1장 표기 규칙대로 사용자 화면 표기는 "달리모"만 쓴다. 영문 워드마크(DALLIMO)는 아직 만들지 않았다.
- 명세서의 미결 항목 "최종 브랜드 색상 확정" 전 단계의 후보다. 상표 검토는 하지 않았다.

## 12. Course Detail (SCR-E03) 구현 판단

| 항목 | 판단 | 근거 |
| --- | --- | --- |
| 배치 | 지도(화면 36%) → 지역·태그 → 코스명 → 거리·예상 시간·난이도·오르막 → 경쟁 카드 → 이번 주 랭킹 → 고도 → 러닝 환경 → 코스 소개. "이 코스 달리기"는 하단 고정 | 61.1장 1~4차 정보 계층, 89·91장. 73장 "첫 viewport에서 형태·거리·난이도·내 기록/경쟁·RUN CTA" — 375×667에서도 경쟁 카드 윗부분과 CTA가 첫 화면에 보인다 |
| 헤더 | 기본 헤더를 숨기고 지도 위에 뒤로·저장·공유 둥근 버튼 | 지도 영역을 줄이지 않기 위해. 탐색 검색 버튼과 같은 모양 |
| 지도 | `CourseRouteMap`: 탐색과 같은 브랜드 지도(무채색 OSM 바탕) + 민트 번짐 경로 + 1km 표시 + "출발"/"출발 · 도착" 핀. 도착점이 출발점과 60m 안이면 순환으로 본다 | 83장 route signal, Komoot·AllTrails 경로 미리보기 |
| 경쟁 카드 | 검정(dark) 카드: 내 PB(민트 44pt 기울임) + 인증 배지 + 이번 주 순위, 최근 기록·완주 횟수, 코스 1위와 1위까지 차이, 친구 최고와 차이. 기록이 없으면 "첫 완주 기록이 이번 주 랭킹에 올라가요" | 91장 "내 PB · 주간 순위 · 친구 최고", 탐색 코스 티켓과 같은 표면으로 연결 |
| 랭킹 미리보기 | 이번 주 1~3위 + (4위 밖이면) ⋯ + 내 행. `RankingRow` 재사용 | CRS-104, 89장 self-anchor. 전체 랭킹(SCR-E04)은 72장 9번 단계 |
| 고도 | `ElevationProfile`: 오르막·최고·최저 + 면 그래프. 평지가 과장되지 않게 세로 범위 최소 30m | 61.1장 3차, Komoot |
| 고도 데이터 | mock 코스 경로를 40m 간격으로 나눠 Open-Meteo Elevation API(Copernicus DEM 90m)에서 받고 5점 이동평균. `mockCourseRoutes.ts`에 저장 | 실제 지형과 맞는 예시 (범어공원 +83m, 수성못 +9m) |
| 러닝 환경 | 2열 회색 칸: 신호·야간 조명·혼잡·노면·화장실·급수대, 모르면 "정보 없음" | CRS-102 |
| 저장 | 화면 안 토글(선택 시 민트 잉크 아이콘). API 연결 시 POST/DELETE bookmarks | CRS-105 |
| 공유 | RN `Share`로 코스명·거리·`dallimo://course/{id}` 공유. 지원하지 않는 환경에서는 조용히 넘어감 | CRS-107, scheme `dallimo` |
| 달리기 시작 | `/run?courseId=`로 이동 (Run Ready는 72장 5번 단계) | CRS-106 |
| 상태 | loading(지도 로딩 심볼 + 본문 skeleton, CTA 숨김) / hidden(볼 수 없는 코스 + 다른 코스 찾기) / error(다시 시도) / noRecord / has PB / rankingUnavailable(경쟁 카드 안내 + 랭킹 자리 안내·다시 시도) | 74장. 개발 빌드 `?scenario=` |
| 데이터 | `CourseDetail` 타입(43장 CourseDetail 앱 모델), `CourseRepository.getDetail`, TanStack Query `useCourseDetail`. 비공개·삭제는 `CourseRepositoryError('hidden' / 'notFound')` | 119장 repository 경계, 9.1장 |
| 구조 이동 | 코스 repository·mock을 `entities/course/api/`로, 지도 바탕 데이터를 `shared/map/`으로, 지도 바탕 그리기를 `components/MapBaseLayer`로, `StateNotice`를 `components/`로 옮김 | 탐색과 코스 상세가 함께 쓰게 되어 (CLAUDE.md 13항) |
| 아이콘 | back, bookmark, bookmarked, share, signals, nightLight, crowd, surface, toilet, water, elevation, time, trophy 추가 | expo-symbols 하나만 사용 |
| AppDivider section | 띠 색을 `bg.canvas` → `bg.surface` | v0.3에서 canvas가 흰색이 되어 띠가 보이지 않았다 |

## 13. Play Mode Selector 구현 판단

| 항목 | 판단 | 근거 |
| --- | --- | --- |
| 진입 | 코스 상세 "이 코스 달리기" → 코스 상세 위 하단 sheet (`/course/[id]/play`, transparentModal). 배경을 누르거나 ✕로 닫는다 | 89장 "하단 sheet", 64장 COURSE DETAIL → PICK A PLAY MODE, 125장 "Explore에서 코스를 고르면 COURSE로 진입" |
| 모드 | 완주(COURSE) · PB 어택(PB) · 라이벌(CHALLENGE) · 함께(TOGETHER) 4개 | 64장 SOLO / PB ATTACK / RIVAL·CHALLENGE / LIVE·TOGETHER, 125장 COURSE 안의 COURSE_NORMAL·PB_ATTACK·RIVAL. 전송 값은 6.3장 RunMode |
| 모양 | 같은 크기 카드를 세로로 쌓지 않고 가로 타일 4개(아이콘·제목·한 줄 설명) + 선택한 모드의 목표 패널(검정) | 89장 "동일 크기 카드 4개로 쌓지 말고 주요 모드와 context-aware target", "설정 화면 같은 radio list 금지", 73장 아이콘/제목/짧은 설명으로 구분 |
| `PlayModeCard` | default(회색) / selected(검정 + 민트 아이콘) / locked(자물쇠 + 열리는 조건) + "최근" 배지. `components/PlayModeCard` | 67.1장 PlayModeCard selected/default/locked, 66장 최근 사용 강조 |
| 잠김 조건 | PB 어택: 내 기록이 없으면 "완주하면 열려요". 라이벌: 인증 기록이 없거나 랭킹을 못 받으면 잠김 | 980행 "검증된 기록만 목표로 사용" |
| 기본 선택 | 최근 고른 모드 → 기록이 있으면 PB 어택 → 완주 | 89장 context-aware. 최근 모드는 앱을 켜 둔 동안만 기억(저장소 연동은 My 단계) |
| 목표 패널 | 완주: 거리·예상 시간. PB: 목표 기록·km당 페이스, "PB 그대로 / 10초 / 30초 빠르게". 라이벌: 코스 1위·친구 최고·이번 주 상위 중 선택(내 PB와 차이). 함께: 위치 대신 진행률만 보인다는 안내 | 62장 PB/Rival, 94장 위치 대신 진행률 |
| 행동 | 버튼 하나. 문구가 선택에 따라 바뀜: "완주 시작", "10:12 목표로 시작", "지수 기록에 도전", "함께 달릴 방 만들기" | 66장 single primary action |
| 다음 화면 | 달리기 탭으로 `mode·courseId·targetSec·targetLabel`을 넘긴다(`RunPlan`). 함께는 함께 탭으로 `courseId`. 두 탭은 아직 준비 중 화면이라 넘겨받은 선택을 표시해 흐름을 확인 | Run Ready 72장 5번, Together 10번 |
| 라우트 | `app/course/[id].tsx` → `app/course/[id]/index.tsx`, `app/course/[id]/play.tsx` 추가. 헤더·표시 방식은 루트 `_layout`에서 지정 | |
| 타입·아이콘 | `entities/run/types.ts`(RunMode, PlayModeKey, RunPlan), 아이콘 modeCourse·modePB·modeRival·modeTogether·lock | |

## 14. Run Ready 구현 판단

| 항목 | 판단 | 근거 |
| --- | --- | --- |
| 화면 | 달리기 탭 = SCR-R01 Run 홈/준비. dark canvas 위에 어두운 지도(내 위치·코스·출발점) → 상태 한 줄(28pt) → 목표 카드 → 아래 넓은 "시작" | 89장 "dark pre-run canvas, 중앙 GPS 상태와 목표, 하단 넓은 Start", REFERENCE-MATRIX Run Ready(NRC + Runkeeper) |
| 계획 없이 들어온 경우 | FREE(RUN-001 빠른 러닝)로 준비. 목표 카드 안에 "코스 달리기"(탐색 탭) · "함께 달리기"(함께 탭) 진입 | 125장 Run 탭 진입점 FREE / COURSE / TRAINING / TOGETHER. TRAINING은 FEATURE-FEEDBACK roadmap 후속이라 두지 않음. Quick Start(직전 모드)는 "제공할 수 있다"라 이번에는 두지 않음 |
| 계획을 받은 경우 | Play Mode의 `RunPlan`(mode·courseId·targetSec·targetLabel)으로 모드 배지·코스명·거리·목표 기록(민트)·목표 페이스를 보여준다. 완주는 예상 시간. ✕는 계획을 버리고 FREE 준비로 | 13항 다음 화면, 89장 "여러 설정 chip과 작은 버튼" 회피 |
| 확인 순서 | 권한 → GPS 품질 → (코스) 출발점 거리. 앞 단계가 막히면 그 이유 하나만 보여준다 | RUN-002, LOC-001~003, 73장 "준비되지 않으면 이유를 설명" |
| 상태 | checking / permission denied(지도 흐리게 + 자물쇠 + "설정에서 위치 허용하기") / GPS acquiring / GPS poor / course start too far(내 위치→출발점 점선 + "417m 더 가야 출발점이에요") / ready | 74장 5개 상태. LOC-002 설정 이동, 탐색은 권한 없이 유지 |
| 시작 막힘 | acquiring·poor는 `disabledGPS`, 권한 거부는 `disabledPermission`, 출발점이 멀면 `disabledStartPoint` | 73장. 출발점 밖에서 시작하면 StartPointVerifier(10.4장)에서 코스 기록으로 인정되지 않는다 |
| `PrimaryRunButton` 확장 | availability에 `disabledStartPoint` 추가(기본 문구 "코스 출발점 근처에서 시작할 수 있어요"). COMPONENT-CONTRACTS의 ready / disabledGPS / disabledPermission / loading은 그대로 | 74장 course start too far를 GPS·권한과 다른 이유로 설명하기 위해 |
| 정책값 | 출발 반경은 `entities/run/policy.ts`의 `getRunPolicy()`로 받는다(`course.start_radius_m`, 명세 후보 100m를 mock으로). GPS 정확도 기준(`gps.required_accuracy_m`)은 미확정이라 화면에 두지 않고 `LocationSource.getCurrentQuality()`가 품질을 돌려준다 | 10.5장 정책값, 명세 "정책값은 하드코딩하지 않는다" |
| LocationSource | `getCurrentQuality(): Promise<GpsQuality>` 추가, `GpsQuality` 타입을 `shared/location`으로 옮김(`GpsStatus`는 다시 내보냄). mock은 처음 1.5초 acquiring 뒤 good | 49.2장 Location Adapter |
| 카운트다운 | 시작 → `/run/active`(탭 없는 전체 화면, 뒤로 밀기 막음)에서 3-2-1 → "출발". 숫자 180pt Black 기울임 민트, scale 1.35→1 + fade. 동작 줄이기면 숫자만 바뀜. 카운트다운 중 "취소" | RUN-003, 69장 "3-2-1 countdown, 숫자 scale/fade", `motion.countdownStep` 1000ms |
| 햅틱 | 각 숫자 약한 햅틱(impact Light), 출발 강한 햅틱(impact Heavy). `shared/haptics.ts`로 감싸고 끌 수 있게 함(설정 화면은 13번 단계, 그 전까지 앱을 켜 둔 동안만 기억). 웹은 건너뜀 | 69장, ACCESSIBILITY "햅틱은 끌 수 있어야 한다". `expo-haptics` 추가 |
| 카운트다운 뒤 | Active Run(72장 6번) 전까지 준비 중 화면에 넘겨받은 계획을 표시하고 "준비 화면으로" 버튼 | 흐름 확인용 |
| 탭 바 | 달리기 탭이 선택되면 탭 바도 dark. 선택 탭 민트 점 테두리를 탭 색에 맞춤 | 110.1장 러닝 컨텍스트 dark |
| 개발용 | `/run?scenario=` normal / denied / acquiring / poor / far. 마이 탭 개발용 링크에 추가 | 탐색·코스 상세와 같은 방식 |

## 15. Active Run — FREE (공통 Run Shell) 구현 판단

| 항목 | 판단 | 근거 |
| --- | --- | --- |
| 화면 | 카운트다운 뒤 `/run/active`에서 이어짐. near-black 위에 GPS·기록 상태 → giant 거리 → 시간·평균 페이스 → 강조 strip 하나 → 넓은 일시정지 | 92장 레이아웃, 89장 "화면 중심에 2~3개 giant metrics, 모드별 강조 strip 하나", 62.1장 FREE 1차 정보(시간·거리·현재/평균 페이스) |
| FREE strip | 현재 페이스 · 지난 1km 구간 기록(민트) · 다음 1km까지 진행(`SignalRail`) | 92장 "FREE에서는 split", 62.1장 2차 정보 split. 모드별 패널(진행률·gap)은 7번 단계에서 이 자리에 끼운다 |
| 지도 | 오른쪽 위 버튼으로 지도 보기 ↔ 기록 크게 보기 전환. 지도는 어두운 바탕 + 지나온 길(흰 선) + 내 위치(민트), 아래에 거리·시간·평균 페이스 한 줄 | SCR-R02 지도, 62.2장 "지도는 경로 확인용으로 단순화", 89장 "지도와 데이터 50:50 분할" 회피(둘 중 하나만 크게) |
| `metricGiant` 토큰 | 112/116 Black 기울임. `MetricBlock` size `giant` 추가. 거리 한 곳에만 씀 | 89·92장 giant metric. 기존 `metricHero`(72)로는 1초 glance 위계가 부족 |
| 조작 | 달리는 중: 넓은 흰색 "일시정지" 하나. 일시정지 중: "종료" + "계속 달리기"(민트). 종료는 확인 sheet(SCR-R03)를 거친다 | 62.2장 "Pause/Finish 파괴적 동작은 확인 구조", SCR-R03 "계속 달리기, 종료 확인" |
| 뒤로 가기 | 러닝 중 Android 뒤로 가기와 iOS 뒤로 밀기를 막는다. 끝내려면 일시정지 → 종료 | 오작동 방지 (62.2장) |
| 상태 | running / paused / GPS poor("거리를 잠시 세지 않아요") / offline("기록은 휴대폰에 저장") / recovering(카운트다운 없이 이전 기록을 불러와 이어서) / finish pending("남은 기록 N개를 올리는 중") / local-only 결과("인터넷이 연결되면 자동으로 올려요", 결과 보기) | SCREEN-SPECS Active Run 상태, CLAUDE.md 7항 offline·local-only. route deviation은 COURSE(7번) |
| 햅틱 | 일시정지·재개: 중간 햅틱, GPS가 약해지는 순간: 경고 햅틱. `shared/haptics.ts`로 끌 수 있음 | CLAUDE.md 6항 "중요한 상태 변화는 음성/햅틱", 62.2장. 음성 안내(km 알림 등)는 명세 기준이 없어 넣지 않음 |
| 러닝 엔진 경계 | `features/run/engine/runningEngine.ts`: 49.1장 `RunningEngine`(prepare/start/pause/resume/finish/recover) + 화면 구독용 subscribe/getSnapshot, `RunPointStore`(append/getUnsyncedRange/markSynced) | 49.1장 "UI는 expo-location·SQLite를 직접 부르지 않는다". 명세 위치 `features/run/*` |
| 지금 구현 | mock 엔진(수성못 호안을 5'15"/km 안팎으로 도는 가짜 러너, 1초에 point 1개) + 메모리 point 저장소. 개발 빌드 `?speed=`로 배속 | 실제 GPS 수신, SQLite 선저장(RUN-006), Batch Sync(RUN-007), 백그라운드 기록(RUN-005)은 GPS PoC(WBS 1)에서 같은 인터페이스로 구현 |
| 지표 계산 | `entities/run/metrics.ts`: 정확도 낮은 point는 거리에서 빼고 다음 point와도 잇지 않음. 평균 페이스 = active 경과 / accepted 거리. 현재 페이스 = 최근 창의 거리/시간. 일시정지·재개 때 창을 끊음. 1km 경계는 구간 안에서 비율로 나눠 스플릿 계산 | 51장 파이프라인, 51.2장 Pace |
| 정책 임시값 | `currentPaceWindowSec` 20초, `minPaceSampleM` 50m(이 거리 전에는 '--'). `getRunPolicy`에 두고 PoC 뒤 확정. 순간 이동(속도 이상치) 기준은 아직 적용하지 않음 | 10.3장 "윈도우 크기와 이상치 기준은 실제 야외 PoC에서 결정", 51.2장 "표본이 부족하면 '--'" |
| 성능 | 초 단위 경과 시간은 `ElapsedMetric` 안에서만 갱신. 각 지표 컴포넌트가 `useRunSnapshot(selector)`로 필요한 값만 구독. 지도 경로는 accepted point 5개마다 하나만 저장 | VISUAL-QA "metric state 분리, 필요한 컴포넌트만 갱신", CLAUDE.md 9항, 77장 경로 단순화 |
| 결과 | 종료 뒤 `/run/result`(light)로 결과 요약을 넘김. Result 화면은 72장 8번 단계라 지금은 준비 중 화면에 요약 표시 | 89장 Result는 light로 복귀 |
| 아이콘 | pause, stop, map, metrics, offline 추가 | expo-symbols 하나만 사용 |
| 개발용 | `/run/active?scenario=` normal / poorGps / offline / recovering / finishPending, `&speed=` 배속. 마이 탭 개발용 링크에 추가 | |

## 16. Active Run — COURSE / PB / CHALLENGE 구현 판단

| 항목 | 판단 | 근거 |
| --- | --- | --- |
| 바뀌는 곳 | 공통 Run Shell은 그대로 두고 강조 strip(`ModeStrip`)과 지도 위 기준 코스만 모드별로 바뀐다 | 92장 "모드별로 가운데 강조 strip만 바뀌도록", CLAUDE.md 6항 "mode-specific panels must be modular" |
| COURSE strip | 코스 진행 %(민트) · 남은 거리 · 진행 rail · 코스 위/이탈(아이콘 + 문구) · 현재 페이스 | 62.1장 COURSE 1차(진행률·거리·이탈·페이스), 2차(남은 거리). CRUN-002 |
| PB·CHALLENGE strip | `GapIndicator`(방향 아이콘 + 부호 + "목표보다 빠름/느림") · 목표 이름과 기록 · 진행 rail · 코스 위/이탈 · 예상 완주 | 62.1장 PB(현재 기록·목표 PB·gap, 2차 진행률·예상 finish), CHALLENGE(목표·gap·진행률, 2차 상대 이름/기록) |
| gap 계산 | 목표 기록을 코스 전체에 고르게 나눈 페이스로 본다: gap = 경과 − 목표 × 진행/코스 길이. 진행 50m 전에는 "비교 기록 없음" | 목표 기록의 구간별 기록(ghost)이 아직 없음. 구간 기록 기반 Ghost는 GAMIFICATION 2차 |
| 진행률 | 코스 선 위에 투영한 거리. 지금 위치 앞뒤 구간(뒤 30m ~ 앞 250m)에서만 찾아 되돌아가는 코스·교차 구간에서 엉뚱한 곳에 붙지 않게 함. 뒤로 가지 않음. 이탈 중에는 멈춤 | 26.3장 "루프·왕복·교차 구간은 단순 시작/끝점만으로 판단하지 않는다" |
| 이탈 | 코스 선에서 `courseDeviationM`(50m) 넘게, `courseDeviationSec`(10초) 넘게 벗어나면 지속 이탈. 위 안내 + strip 경고 + 경고 햅틱 + 음성 "코스를 벗어났어요". 돌아오면 음성 "코스로 돌아왔어요" | CRUN-003 "지속 이탈 시 안내", 69장 Course deviation 경고 햅틱 + 음성. 거리는 명세 1장 "코스 이탈 거리는 정책값" → `course.match_buffer_m` 후보 50m. 지속 시간은 PoC 전 임시값 |
| 완주 | 코스 마지막 구간 끝까지 투영되면 완주. 그 시점 기록을 코스 기록으로 고정하고 안내 "코스 완주 · 10:08" + 완주 햅틱 + 음성(기록, 목표 대비). 아래 버튼이 "완주 기록 저장"으로 바뀌어 확인 없이 저장 | 69장 Finish 완주 햅틱. 기록이 정해졌으므로 SCR-R03 확인을 생략. 공식 판정(CRUN-004)은 서버 Verifier |
| 지도 | 기준 코스(두꺼운 민트 + 번짐) 위에 실제 경로(가는 흰 선), 내 위치 흰 점, 도착점 민트 점 | CRUN-001 기준 코스/실제 경로 동시 표시, CLAUDE.md 8항 색만으로 구분하지 않기(굵기도 다름) |
| 음성 | `expo-speech` 추가, `shared/voice.ts`로 감싸 끌 수 있게 함(설정 SCR-M07 "음성"은 13번 단계). PB gap 임계치 TTS는 명세상 "선택적"이라 넣지 않음 | 69장, REFERENCE Voice feedback(RunDay + NRC) |
| 엔진 | `prepare({ course })`로 기준 코스를 받고 snapshot `course`(길이·진행·이탈·완주 시점), 결과 `courseTimeSec` 추가. 계산은 `entities/run/courseProgress.ts` | 49.1장 경계 유지 |
| 결과 | 코스명·완주 기록·목표를 결과 화면(8번 단계 준비 중)으로 넘김 | |
| 개발용 | `scenario=offRoute`(진행 방향 옆으로 90m 벗어났다 돌아옴), `behind`(목표보다 느리게). 마이 탭 개발용 링크에 코스 러닝 4종 | |

## 17. Run Result 구현 판단

| 항목 | 판단 | 근거 |
| --- | --- | --- |
| 화면 | `/run/result?id=` light 화면. 위에서부터 감정 피드백 → 핵심 수치 → 지도 → 공식 검증 상태 → PB·주간 순위·친구 → 공유/다시 도전 → 구간 기록·고도 | 63.1장 우선순위, 93장 레이아웃, 89장 "light로 복귀, 처음부터 세부 splits 표 금지" |
| 감정 피드백 | 한 줄 결과 + 설명 + 결과 표시(트로피·깃발·러너 아이콘, 좋은 결과는 민트 원). PB 갱신 / 첫 공식 기록 / 목표 달성 / 라이벌 기록을 넘었어요 / 목표보다 N초 느렸어요 / 코스를 끝까지 달리지 못했어요 / 자유 달리기 완료 | 63.1장 1순위 "완주/PB/Challenge 성공 여부" |
| PB 판정 | 서버가 VERIFIED 기록으로 판정(RST-002). 검증 전에는 목표 비교만 보여주고, 검증되면 "PB 갱신"으로 바뀐다 | 1장 "VERIFIED 기록만 공식 랭킹", CRUN-005 |
| 핵심 수치 | 코스 러닝은 코스 기록(코스 끝에 닿은 시점)을 크게. 완주 뒤 더 달렸으면 "완주 뒤까지 합친 전체 2.26km · 11:58"을 따로 | 코스 기록과 활동 기록을 섞지 않는다 |
| 지도 | 밝은 브랜드 지도 위 기준 코스(짙은 민트 테두리 + 형광 민트)와 달린 길(검정 가는 선), 출발·도착 점 | RST-001, CLAUDE.md 8항 |
| 상태 | local-only(휴대폰에만 저장됨) / syncing(기록 올리는 중) / verification pending(검증 중, PB·순위 "검증 뒤 반영") / verified / unverified·rejected(사유 + "랭킹에 반영되지 않아요") / PB / no PB / 완주 못 함 / 찾을 수 없음 | SCREEN-SPECS Result 상태, CLAUDE.md 7항 |
| 검증 갱신 | 올리는 중이거나 검증 중이면 1초마다 다시 읽어 화면이 스스로 바뀐다 | 25.3장 FINISHED → PENDING VERIFICATION → VERIFIED/UNVERIFIED |
| 경쟁 변화 | 내 PB(이전 → 이번), 이번 주 순위(18위 → 14위, 오르면 아이콘), 친구 최고와 차이. 값이 아직 없으면 흐린 작은 글자 | RST-002~004 |
| 행동 | 코스: 공유(보조) + 다시 도전(민트, 핵심 하나). PB를 새로 세웠으면 다음 목표는 이번 기록. 자유 달리기: 공유 + 확인(검정) | 63장 "완주 → 검증 → PB/랭킹 → 공유 → rematch", 95장 핵심 행동 하나 |
| 공유 | 지금은 시스템 공유로 결과 요약 + 코스 딥링크(`dallimo://course/{id}`). 공유 카드(SCR-R05 Map/Record/Ranking/Battle 템플릿)는 별도 화면이라 이번에 넣지 않음 | RST-005, SHR-004 |
| 저장 경계 | 러닝이 끝나면 서버에 올렸든 못 올렸든 먼저 `RunResultRepository.saveFinished`로 기기에 저장하고 id로 결과를 연다. mock은 앱을 켜 둔 동안만 기억하고 동기화·검증을 시간으로 흉내 | RUN-006 Local First, 119장 repository 경계, 42.4장 Finish 응답 |
| 순위 mock | 이번 주 상위 기록보다 빠르면 그 자리, 아니면 기존 순위에서 조금 오르는 규칙. 실제 순위는 서버 값 | mock 전용 |
| `ElevationProfile` | 코스 상세와 결과가 함께 써서 `components/`로 옮김 | CLAUDE.md 13항 |
| 개발용 | `/run/result?demo=` pb / noPb / free / dnf, `&scenario=` normal / localOnly / syncing / unverified / rejected. 마이 탭 개발용 링크에 8종 | |

## 18. Ranking(SCR-E04) 구현 판단

| 항목 | 판단 | 근거 |
| --- | --- | --- |
| 진입 | 코스 상세 "이번 주 랭킹" 아래 "전체 랭킹 보기", 결과 화면 경쟁 카드 아래 "코스 랭킹 보기" → `/course/[id]/ranking` (light) | 64장 결과/랭킹 → 재도전 루프, 코스가 중심 객체 |
| 기간·범위 | 칩 4개: 이번 주 · 이번 달 · 전체 기간 · 친구. 이번 주가 기본(코스 상세 미리보기와 같은 기준) | SCR-E04 "전체/주간/월간/친구", RNK-001~004, RUNPLE 주간 리그 |
| self anchor | 맨 위 검정 카드: 내 순위(민트 큰 숫자) / 총 인원, 내 기록, "17위까지 7초", 내 앞뒤 2명씩(RNK-005). 목록에서 내 행은 민트 연한 배경 + "나" | 89장 "self-anchor가 중요, 나를 기준으로 위/아래 rank가 읽힘", 루티니스트 "총 N명 중 M등", 탐색 티켓·경쟁 카드와 같은 검정 표면 |
| podium | 1~3위는 검정 원 배지만. 금·은·동 색·장식 없음 | 89장 "podium은 과장하지 않음" |
| 목록 | `FlatList` 가상화 + cursor 페이지(20개씩) 이어 받기. 끝이면 "마지막 순위예요 · 총 N명" | 43장 scope/period/cursor/size, CLAUDE.md 9항 긴 목록 가상화 |
| 내 순위로 돌아가기 | 카드가 화면 밖으로 나가면 아래 가운데 "● 내 순위 18위" 버튼 하나. 누르면 맨 위로 | self visible 상태. 떠 있는 버튼은 이것 하나만 둔다(CLAUDE.md 5항) |
| 상태 | loading / empty(기간별 문구 + 이 코스 달리기) / user unranked(카드에 "아직 순위가 없어요" + 이 코스 달리기) / self visible / cursor loading(목록 끝 로딩 심볼) / error(다시 시도) | SCREEN-SPECS Ranking 상태 |
| 데이터 | `entities/ranking`: `RankingRepository.getPage(scope, period, cursor, size)`, `getMyStanding`(RNK-005). 공식 랭킹은 사용자별 최고 VERIFIED 기록 | 43장, 23.1장, 1장 |
| mock | 1위 기록과 내 기록(코스 상세의 이번 주 순위)을 지나는 곡선으로 순위표를 만든다. 이번 주 1~3위와 내 순위는 코스 상세와 같게, 친구 최고 기록은 기록이 맞는 자리에 둔다 | mock 전용. 실제 순위는 서버 값 |
| 개발용 | `?scenario=` normal / loading / empty / unranked / error, `?tab=` weekly / monthly / all / friends. 마이 탭 개발용 링크 | |

## 19. Together Lobby (SCR-T01~T03) 구현 판단

| 항목 | 판단 | 근거 |
| --- | --- | --- |
| 범위 | 함께 탭 = Together 홈(SCR-T01), `/together/new` 방 만들기(SCR-T02), `/together/[roomId]` 대기실(SCR-T03). 출발 뒤 Live(SCR-T04)·결과(SCR-T05)는 11번 단계 | 72장 10번 Together Lobby, SCREEN-SPECS SCR-T01~T05 |
| 홈 | 예정된 방 카드(모드 설명 · 목표 · 시작 시각 · 준비 인원, 나를 초대한 방은 "초대 받음"), 최근 결과 줄(순위/완주). 위에 "방 만들기"(검정) | SCR-T01 "예정 방, 최근 결과, 새 방 생성". 민트는 달리기 시작에만 쓴다 |
| 모드 | 레이스(LIVE_RACE, 먼저 도착하면 승리) · 타임 어택(TIME_ATTACK, 시간 안에 더 멀리) · 함께(TOGETHER, 승패 없이). Play Mode와 같은 `PlayModeCard` 타일 | 45.1장 모드 불변식, 89장 "설정 화면 같은 radio list 금지" |
| 목표 | 레이스·함께: 3 / 5 / 10km, 타임 어택: 20 / 30 / 60분. 코스로 만든 방은 코스 거리가 목표이고 타임 어택은 잠김("코스는 거리로만") | 45.1장 LIVE_RACE는 targetDistanceM, TIME_ATTACK은 targetSeconds |
| 시작 시각 | 모두 준비되면 / 10분 뒤 / 30분 뒤 / 1시간 뒤. 예약 시각은 방을 만드는 순간 기준 | SCR-T02 "시작시간" |
| 친구 | 체크 목록에서 한 명 이상 골라야 방을 만들 수 있다. "서로의 위치는 공유되지 않아요" 안내 | TGT-002, 823행 정확한 GPS 비공개 |
| 코스에서 함께 | Play Mode "함께" → `/together/new?courseId=`로 바로 연다(시트 자리를 바꿔 뒤로 가면 코스 상세). 13항의 "함께 탭으로 courseId" 대신 | 탭에서 자동 이동하면 딥링크 진입 때 내비게이터 준비 전에 이동해 오류가 났다 |
| 대기실 | dark. 모드 배지 → 목표 값 크게(10km) → 시작 시각 → 내 GPS·서버 연결 → 참가자(상태 먼저, 나·방장 표시) → 아래 내 행동 | 89장 "room goal + participant readiness가 핵심, 채팅창 없음, 메신저 room처럼 구성하지 않음". Run Ready와 같은 dark pre-run canvas |
| 내 행동 | 초대 받음: 참가하기 / 참가: 준비 완료(GPS가 잡혀야 누를 수 있음) / 준비됨: 안내 + 준비 취소 | TGT-003 Ready |
| 출발 | 참가한 사람(2명 이상)이 모두 준비하고 예약 시각이 되면 서버가 출발 시각을 정한다(mock 5초 뒤). 대기실이 큰 숫자로 세고 숫자마다 약한 햅틱, 출발 강한 햅틱 → Live | 45.1장 "방 상태 전이는 서버가 결정", SCR-T03 카운트다운, 69장 Run Start |
| 갱신 | WebSocket ROOM_SNAPSHOT 연동 전까지 방 snapshot을 1초마다 다시 읽는다. 받아 둔 방이 있는데 읽기에 실패하면 "다시 연결하는 중" | 9장 "방 생성·참가·Ready·조회는 REST", 46장 |
| 나가기 | ✕ → 확인 sheet. 방장은 "방을 취소할까요?", 참가자는 "방에서 나갈까요?" | 45장 leave · cancel |
| 초대 링크 | 오른쪽 위 공유: 목표 · 시작 시각 + `dallimo://together/{roomId}` | SHR-004 딥링크 |
| 상태 | 로딩 / 비어 있음 / 오류 / 초대 받음 / 준비 전(waiting) / 준비 완료 / 연결 끊김 / 다시 연결 중 / 카운트다운 / 취소됨 / 방 없음 | SCREEN-SPECS Together "invite, waiting, ready, disconnected, reconnecting" |
| `ParticipantChip` | 상태 `waiting`("준비 전", 시계 아이콘) 추가. 67.1장 상태(invited/ready/running/disconnected/finished/DNF)는 그대로 | SCREEN-SPECS Together 상태의 waiting |
| 데이터 | `entities/live`: `LiveRoom`(모드·목표·예약·상태·출발 시각·참가자, GPS 좌표 없음), `LiveRoomRepository`(listUpcoming/listRecent/listFriends/create/get/join/setReady/leave). mock은 초대한 친구가 차례로 들어와 준비하는 흐름을 시간으로 흉내 | 45장 REST, 6.3장 LiveRoomStatus/LiveMemberStatus |
| `useNow` | 렌더 중 `Date.now()`를 부르지 않도록 현재 시각을 주기적으로 갱신하는 hook | React 순수성 규칙(lint) |
| 개발용 | `/together?scenario=` normal / loading / empty / error, `/together/demo?scenario=` normal / disconnected / canceled | |

## 20. Together Live (SCR-T04~T05) 구현 판단

| 항목 | 판단 | 근거 |
| --- | --- | --- |
| 범위 | `/together/[roomId]/live` Live(SCR-T04, dark), `/together/[roomId]/result` Live 결과(SCR-T05, light). 대기실 카운트다운이 끝나면 Live로 넘어온다 | 72장 11번 Together Live, SCREEN-SPECS SCR-T04~T05, 89장 Result는 light 복귀 |
| 레이아웃 | 위: 목표 · "N/M명 달리는 중" · 연결 점 → 내 순위(가장 큰 숫자) · 내 거리 / 목표 → 참가자 진행 rail → 선두와 차이 · 평균 페이스 → 일시정지 | 94장 Live 레이아웃, 89장 self metric 항상 고정 |
| 모드별 hero | 레이스: 순위 + 거리 / 목표. 타임 어택: 순위 + 거리 + 남은 시간. 함께: 순위 없이 거리를 가장 크게 + 함께 달린 시간 | 45.1장 모드 불변식, 62.1장 TOGETHER는 승패를 강조하지 않음 |
| 참가자 표시 | 지도 marker 대신 `ParticipantChip` rail. 진행률(목표 거리 대비, 타임 어택은 선두 대비)과 나와의 거리 차이("+72m" / "−110m")만 보인다. 상대 좌표는 모델에 없다 | 94장, CLAUDE.md 6항 원격 Together에서 정확한 위치 비노출 |
| 순위 규칙(화면) | 레이스: 완주한 사람(기록 순) → 달리는 사람(거리 순). 타임 어택: 거리 순. 중도 포기는 맨 뒤. 최종 순위는 서버 결과 값 | 46.1장 결과는 서버 finalization |
| Live 채널 | `LiveChannel`(connect / sendState / close)과 이벤트 MEMBER_STATE · CONNECTION · ROOM_FINISHED. WebSocket 연동 전 mock은 참가자 페이스로 상태를 만든다 | 46장 RUN_STATE · 방 이벤트 |
| 상태 전송 간격 | `run.live_state_interval_sec` 기본 3초. `entities/run/policy.ts`에 추가 | 10.5장 정책 값 "3~5초 후보" 중 가장 짧은 값 |
| 내 기록 | 개인 Run은 항상 만든다. 러닝 엔진이 기록하고, 끝나면 `runResultRepository`에 저장한 뒤 runId를 채널에 보낸다. 결과 화면 "내 러닝 기록 자세히"로 연결 | 45.1장 개인 Run 항상 생성 |
| 끝나는 조건 | 레이스·함께: 목표 거리 도달. 타임 어택: 목표 시간 도달. 모두 FINISHED/DNF가 되면 서버가 방을 끝낸다(ROOM_FINISHED) | 45.1장 |
| 내가 먼저 끝나면 | 아래 카드 "완주 · 기록" 또는 "중도 포기했어요" + "모두 끝나면 결과가 나와요". 다른 참가자 rail은 계속 갱신 | SCREEN-SPECS Together finished |
| 일시정지 · 그만두기 | 일시정지 → 위에 "일시정지 중이에요. 다른 참가자는 계속 달려요" + 그만두기 / 계속 달리기. 그만두기는 확인 sheet(중도 포기로 기록, 순위에서 빠짐, 내 기록은 남음). 중도 포기 뒤에는 순위 숫자와 선두 차이를 숨긴다 | TGT-011 DNF, Active Run 일시정지 흐름과 같게 |
| 연결 끊김 | 내 연결: 위 점이 경고색 + "연결이 끊겼어요. 내 기록은 계속되고, 다시 연결되면 순위를 맞춰요". 마지막으로 받은 상태를 그대로 둔다. 다른 참가자: rail에 "연결 끊김" | SCREEN-SPECS Together disconnected, reconnecting |
| 햅틱 | 순위가 바뀌면 약한 햅틱, 완주·방 종료는 complete | 69장 Rank change |
| 뒤로 가기 | Android 하드웨어 뒤로 가기로 Live를 빠져나가지 않는다 | 러닝 중 실수 이탈 방지 |
| 결과 | 헤드라인("N위로 들어왔어요" / "함께 완주했어요" / "중도 포기했어요"), 내 기록(타임 어택은 거리), 순위표(나와의 차이, 중도 포기는 "—"), 공유 · 같은 멤버로 다시 · 내 러닝 기록 자세히 | TGT-011~012 |
| 재대결 | "같은 멤버로 다시"는 같은 모드 · 목표 · 코스 · 참가자로 새 방을 만들고 대기실로 간다 | TGT-012 |
| 데이터 | `LiveMemberState`, `LiveResult`, `LiveResultEntry` 타입. `LiveRoomRepository`에 `getResult`, `rematch` 추가 | 45장, 46장 |
| 개발용 | `/together/demo/live?mode=` LIVE_RACE / TIME_ATTACK / TOGETHER, `&scenario=` normal / memberDisconnected / dnf / offline, `&speed=`. 마이 탭 개발용 링크 | |

## 21. My / History (SCR-M01~M03) 구현 판단

| 항목 | 판단 | 근거 |
| --- | --- | --- |
| 범위 | 마이 탭 = My(SCR-M01), `/my/runs` 러닝 히스토리(SCR-M02), `/my/runs/[id]` 러닝 상세(SCR-M03). 모두 light. 내 코스(M04) · 친구(M05) · Activity(M06)는 이번 단계에 넣지 않았고, 설정(M07)은 13번 단계 | 72장 11번 My/History "기록 회고", 73장 History 완료 기준 |
| My 구성 | 프로필(이미지가 없으면 닉네임 첫 글자) → 누적 거리 · 시간 · 횟수 → 최근 기록 3개 + 전체 보기 | SCR-M01 "프로필, 누적거리/시간/횟수, 최근 기록", MY-001~003 |
| 누적 통계 카드 | 랭킹 내 순위 카드 · 탐색 티켓과 같은 검정 표면. 누적 거리를 가장 크게(민트), 아래에 달린 시간 · 러닝 횟수. 기록이 없으면 0을 민트로 강조하지 않는다 | 95장 숫자 우선, 브랜드 표면 재사용(CLAUDE.md 13항) |
| 히스토리 | 최근 기록부터 월별로 묶는다(sticky 월 제목). `SectionList` 가상화 + cursor 20개씩. 끝이면 "첫 기록까지 모두 봤어요". 월별 합계는 페이지가 나뉘면 틀린 값이 나올 수 있어 넣지 않았다 | SCR-M02 "날짜별 기록 목록", 1321행 cursor pagination, CLAUDE.md 9항 |
| 목록 한 줄 | 경로 모양 썸네일(코스 기록은 민트 코스 선, 자유 기록은 검정 선) → 이름(코스 이름 또는 모드 이름) · 날짜 · 시작 시각 · 모드 → 기록 시간 · 페이스 → 거리 | 목록에서 기록을 모양으로 찾게 한다. 결과 지도와 같은 선 구분(CLAUDE.md 8항) |
| 상태 표시 | 눈에 띄어야 하는 상태만 붙인다: PB(민트 바탕 글자), 검증 중, 미인증, 인증 거부, 휴대폰에만 저장, 올리는 중. 아이콘과 글자를 함께 쓴다. 인증된 보통 기록에는 표시하지 않는다 | 67.1장 VerificationBadge Result/History, 68장 색만으로 구분하지 않음 |
| 휴대폰에만 있는 기록 | My · 히스토리 위에 "휴대폰에만 있는 기록 N개 · 인터넷에 연결되면 자동으로 올려요. 기록은 지워지지 않아요" | RUN-006 Local First, 73장 "서버/네트워크 문제와 기록 유실을 혼동시키지 않음" |
| 러닝 상세 | 날짜 · 시작 시각 → 이름 · 모드 · PB → 코스를 끝냈으면 코스 기록, 아니면 거리를 가장 크게 → 거리/시간 · 평균 페이스 → 지도 → 동기화 · 검증 상태 → 코스 보기 → 구간 기록 → 고도 | SCR-M03 "지도, 거리, 시간, 페이스, 스플릿, 검증상태". 결과 화면의 감정 피드백 · 다시 도전은 달린 직후용이라 넣지 않았다 |
| 공용 컴포넌트 | 결과 화면의 동기화 · 검증 표시를 `run-result/components/RecordState`로 분리해 상세와 함께 쓴다. 지도 · 구간 기록 · 고도는 결과 화면 것을 그대로 쓴다 | CLAUDE.md 13항 |
| Live 결과 연결 | Live 결과의 "내 러닝 기록 자세히"는 러닝 상세로 간다 | 개인 Run 기록 조회는 SCR-M03 |
| 새 기록 반영 | 마이 탭에 돌아올 때마다 통계와 최근 기록을 다시 읽는다 | 탭 화면은 계속 살아 있어 방금 달린 기록이 늦게 보일 수 있다 |
| 데이터 | `RunResultRepository.list(cursor, size)`(GET /runs), `RunSummary`(목록용, 경로는 점 40개로 줄임). `entities/user`: `UserRepository.getMe()`(GET /users/me) 프로필 + 누적 통계. 통계가 들어올 응답은 OpenAPI 확정 시 맞춘다 | 43장, 486 · 504행, MY-001~003 |
| mock | 지난 기록 31개. 코스 상세 mock(수성못 PB 10:12, 신천 PB 24:40)과 함께 탭 최근 결과(어제 3km 레이스, 사흘 전 5km 함께)에 맞췄다. 이번 실행에서 달린 기록은 목록 맨 위에 더한다 | mock 전용 |
| 개발용 링크 | 자리 표시 화면(`PendingScreen`)을 지우고 개발용 링크를 `features/dev/DevLinks`로 옮겨 마이 탭 맨 아래에 둔다(`__DEV__`에서만) | 마이 탭이 실제 화면이 됨 |
| 개발용 | `/my?scenario=` · `/my/runs?scenario=` normal / loading / empty / error / localOnly, `/my/runs/run-missing`(없는 기록) | |

## 22. Auth / Onboarding / Settings (SCR-A01~A02, SCR-M07) 구현 판단

| 항목 | 판단 | 근거 |
| --- | --- | --- |
| 범위 | `/login` 로그인(SCR-A01, dark), `/onboarding/profile` 최초 프로필(SCR-A02), `/settings` 설정(SCR-M07), `/settings/profile` 프로필 수정, `/legal/[kind]` 약관 · 개인정보 처리방침 | 72장 12번 Onboarding/Auth/Settings, AUTH-001~004, MY-006 |
| 온보딩 | 로그인 → (처음 가입이면) 프로필 설정 → 탐색. 소개 슬라이드는 명세에 없어 넣지 않았다. 위치 권한은 지금처럼 탐색 · 러닝 준비에서 필요할 때 묻는다 | SCREEN-SPECS SCR-A01~A02, LOC-001~002 |
| 라우트 보호 | 루트 Stack을 `Stack.Protected`로 나눈다: 로그인 전에는 로그인만, 프로필 설정이 남았으면 프로필 설정만, 로그인 뒤에는 앱 전체. 약관 화면은 어느 상태에서나 연다 | 로그인 없이 앱 화면에 들어가지 않게 |
| 자동 로그인 | 앱을 켜면 splash를 유지한 채 저장된 Refresh Token으로 새 토큰을 받는다. 토큰이 폐기(401)됐으면 로그인으로, 서버에 닿지 못했으면 저장된 세션으로 계속한다 | AUTH-003, RUN-006 오프라인에서도 러닝 기록 |
| 토큰 저장 | Refresh Token만 기기(SecureStore: iOS Keychain · Android Keystore)에 두고 Access Token은 메모리에만 둔다. 웹은 개발 확인용으로 localStorage. `expo-secure-store` 추가 | 14.1장 "Refresh Token은 안전한 형태로", 41.1장 deviceId |
| 가입 중 앱 종료 | 처음 가입한 뒤 프로필 설정을 끝내기 전에 앱을 닫아도 다시 프로필 설정부터 이어진다(기기에 표시를 남김) | 닉네임 없이 앱에 들어가지 않게 |
| 로그인 화면 | splash와 같은 검정 바탕에 심볼 · 워드마크 · 짧은 문구(BRAND-AND-PROJECT Short copy), 아래에 카카오 · Apple · Google 버튼과 약관 동의 문구 | SCR-A01 "Apple/Google/Kakao 버튼, 약관/정책 진입" |
| `SocialLoginButton` | 새 컴포넌트. 버튼 색과 로고는 각 provider 가이드 값(카카오 #FEE500, Apple 검정, Google 흰 바탕 4색 G)이라 브랜드 토큰에 넣지 않고 컴포넌트 안에만 둔다 | 외부 가이드 준수. CLAUDE.md 5항 "보기 좋아서 토큰 추가" 금지 |
| provider SDK | 소셜 로그인 범위(3개 모두 또는 단계 도입)가 오픈 이슈라 SDK 연동 전까지 credential을 mock으로 받는다(`features/auth/providerSignIn`). 서버가 credential을 검증하는 구조(41.1장)는 그대로 | 20.2장 "소셜 로그인 범위 – Auth 개발 전" |
| 프로필 설정 | 프로필 사진(사진 보관함에서 정사각형으로 자르기, `expo-image-picker` 추가) · 닉네임. 입력을 멈추면 중복 확인하고 "쓸 수 있는 이름이에요 / 이미 다른 사람이 쓰고 있어요"를 아이콘과 함께 보여준다. 사진이 없으면 닉네임 첫 글자 | AUTH-002 "닉네임 중복 확인, 프로필 이미지 선택" |
| 닉네임 길이 | 명세에 길이 규칙이 없어 DB 컬럼(nickname VARCHAR(40))만 따른다: 비어 있지 않고 40자 이하 | tbl_user.nickname. 정책이 정해지면 `checkNicknameLocal`만 바꾼다 |
| 친구 코드 | 서버가 가입 때 만든다. 설정 > 계정에서 보여주고 공유할 수 있다 | AUTH-002 "친구코드 생성" |
| 설정 구성 | 프로필 → 러닝(자동 일시정지 · 음성 안내 · 진동) → 알림(함께 달리기 · 친구 요청 · 기록 도전/갱신) → 개인정보(위치 권한 → 휴대폰 설정, 개인정보 처리방침, 이용약관) → 계정(로그인 방식, 친구 코드, 로그아웃, 탈퇴) → 앱 버전 | SCR-M07 "자동일시정지, 음성, Push, 개인정보, 로그아웃/탈퇴" |
| 설정 저장 | `shared/preferences`에 모아 기기에 저장하고 앱 시작 때 읽는다. 음성 · 진동은 바로 `voice` · `haptics`에 반영 | ACCESSIBILITY 햅틱 끌 수 있음, AUD-001~003 |
| 자동 일시정지 | 켜고 끄는 값만 저장한다. 멈춤 판단 기준(속도/시간)은 필드 테스트 뒤 정하므로 mock 엔진은 아직 자동으로 멈추지 않는다 | RUN-009(P1), 20.2장 "자동 일시정지 – 필드 테스트" |
| 알림 | 14.2장 Push 이벤트를 세 묶음으로: 함께 달리기(LIVE_INVITE · LIVE_REMINDER · LIVE_START), 친구 요청(FRIEND_REQUEST), 기록 도전 · 갱신(CHALLENGE · RECORD_BEATEN). 휴대폰 알림 권한 표시는 Expo Notifications 연동(WBS 10) 때 붙인다 | 14.2장, NTF-001~007 |
| 약관 · 개인정보 처리방침 | 본문은 서비스 정책 · 법적 검토 뒤 확정이라 "문서를 준비하고 있어요" 안내만 둔다 | 16장, OI-07 |
| 로그아웃 | 확인 sheet. 아직 올리지 못한 기록이 있으면 개수를 알려 주고 올린 뒤 로그아웃하길 권한다. 서버에 닿지 못해도 기기의 세션은 지운다. 로그아웃하면 이전 계정의 서버 데이터 캐시를 비운다 | AUTH-004, RUN-006 |
| 탈퇴 | 빨간 확인 버튼 sheet. 서버 처리가 끝나야 세션을 지운다. 실패하면 sheet 안에 다시 시도 안내. 경로는 41장 표에 없어 OpenAPI 확정 시 맞춘다 | AUTH-004 |
| 진행 중 러닝 보호 | 러닝이 진행 중이면 로그아웃 · 탈퇴 대신 "러닝을 끝내고 기록을 저장한 뒤에…" 안내만 보여준다 | AUTH-004 "진행 중 러닝 보호 후 세션 종료/탈퇴" |
| `Avatar` | 새 컴포넌트. 프로필 사진, 없으면 검정 원에 닉네임 첫 글자. 마이 · 설정 · 프로필 입력에서 쓴다. 마이 탭 오른쪽 위에 설정 버튼 추가 | CLAUDE.md 13항 |
| mock 계정 | 카카오 = 기록이 있는 기존 계정(수성러너), Apple · Google = 처음 가입하는 계정(지난 기록 없음). 계정 상태는 기기에 저장해 새로고침해도 이어진다. 탈퇴하면 처음 상태로 돌아간다 | mock 전용 |
| 개발용 | `/login?scenario=error`(서버 연결 실패). 이제 앱 화면은 로그인한 뒤에 열린다(웹은 한 번 로그인하면 유지) | |

## 23. 공유 카드 (SCR-R05) 구현 판단

| 항목 | 판단 | 근거 |
| --- | --- | --- |
| 순서 | 72장 13단계가 끝난 뒤 사용자 선택으로 진행 | 72장 이후 순서는 명세에 없음 |
| 진입 | 러닝 결과 · Live 결과의 "공유" → `/share/compose?runId=` · `?roomId=` (modal). 전에는 텍스트만 보냈다 | RST-005 "공유 카드 생성", TGT-011~012 공유 |
| 성격 | 앱 화면 캡처가 아니라 공유 전용 이미지 한 장. 9:16 세로(1080×1920)로 스토리 · 메신저에 바로 올린다 | 66장 Share Composer "앱 UI 캡처가 아닌 공유 전용 asset", 63장 루티니스트 스토리 공유 카드 |
| 템플릿 | 지도(어두운 지도 위 코스 · 달린 길) · 기록(영수증처럼 큰 기록 + 항목) · 순위(이번 주 순위와 변화) · 대결(나와 목표/라이벌, Live는 순위표). 만들 수 있는 것만 보여준다: 순위는 인증된 순위가 있을 때, 대결은 비교 상대가 있을 때 | SCR-R05 "Map/Record/Ranking/Battle", 67.1장 ShareTemplateCard |
| 처음 템플릿 | Live 결과는 대결, 코스 기록은 지도(코스가 중심 객체), 코스 없는 기록은 기록 카드 | 16장 privacy zone 검토 전 출발 지점 노출을 피함 |
| 출발 지점 안내 | 코스 없는 기록에서 지도 카드를 고르면 "지도에 출발 지점이 그대로 보여요. 집 근처에서 시작했다면 기록 카드를 권해요" | 16장, OI-08 privacy zone (마스킹은 개인정보 검토 뒤) |
| 공식 기록 표시 | 서버 검증을 통과한 기록에만 "✓ 공식 기록". PB · 순위 변화도 인증된 값만 쓴다 | 1장 VERIFIED 기록만 공식 |
| 카드 그리기 | 기준 폭 360에 비례해 그리고 기기 글자 크기 설정을 따르지 않는다(어느 기기에서 만들어도 같은 이미지). 색은 dark 토큰, 숫자는 브랜드 기울임 숫자 | ROUTE SIGNAL, 83장 |
| 공유 방법 | "이미지 공유"(`react-native-view-shot`로 1080×1920 PNG → `expo-sharing`), "링크 보내기"(POST /shares로 share_code 링크를 만들어 메시지로). 웹(개발 확인용)은 이미지를 내려받는다 | 14.3장 "이미지 카드 + URL" |
| 링크 | 서버에 올라간 기록만 링크를 만든다(휴대폰에만 있는 기록은 "기록을 올린 뒤에 링크를 만들 수 있어요", 이미지는 바로 공유). 링크를 못 만들면 이미지는 지금도 공유할 수 있다고 알린다 | 22장 share_link, RUN-006 |
| 링크 주소 | Web Landing 범위가 정해지기 전까지 앱 딥링크 `dallimo://share/{code}`. 주소 앞부분은 `SHARE_URL_BASE` 한 곳에서 바꾼다 | 20.2장 "공유 Web Landing – Phase 2~3" |
| 링크 열기 | `/share/[code]` → GET /shares/{code}로 해석해 코스가 있으면 코스 상세, 없으면 기록 상세. 잘못된 링크면 "공유 링크를 열 수 없어요" | SHR-004 Deep Link |
| 공용 로직 | Live 결과 헤드라인 계산을 `together/liveOutcome`으로 분리해 결과 화면과 카드가 함께 쓴다 | CLAUDE.md 13항 |
| 데이터 | `entities/share`: `ShareRepository.create(type, referenceId)` · `resolve(code)`, `ShareType` RUN / COURSE / CHALLENGE | 22장 share_link.type, SHR-001~004 |
| 애니메이션 | 템플릿 전환에 애니메이션을 넣지 않았다 | INTERACTION-SPECS Share "과한 애니메이션 없음" |
| 개발용 | `/share/compose?runId=…&scenario=offline`(링크 만들기 실패) | |

## 24. 코스 등록 (SCR-E05) · 내 코스 (SCR-M04) 구현 판단

| 항목 | 판단 | 근거 |
| --- | --- | --- |
| 순서 | 공유 카드 다음 후보(코스 등록+내 코스 / 친구+Activity / Mock contract 검증) 중 첫 번째로 진행 | 72장 이후 순서는 명세에 없음 |
| 진입 | 자유 달리기(FREE) 결과와 러닝 상세에 "이 경로를 코스로 등록" → `/course/new?runId=` (modal) | 3.2장 코스 생성 "자유 러닝 완료 → 코스로 공유 → 정보 입력 → 경로 확인 → 등록", CREG-001 |
| 단계 | 1/2 정보 입력(코스 이름 · 설명 · 태그 · 추천 시간) → 2/2 경로 확인(지도 · 출발/도착 · 거리 · 입력 요약) → 코스 등록. 등록하면 새 코스 상세로 바꾼다 | SCR-E05 "코스명, 설명, 태그, 추천시간, 경로 확인", CREG-002~004 |
| 입력 | 이름은 필수, 길이는 course.name VARCHAR(100)만 따른다. 설명은 선택. 태그는 탐색 필터 · 기존 코스와 같은 이름(평지, 오르막, 강변, 신호 적음, 야간 밝음, 초보 추천) 여러 개. 추천 시간은 새벽 · 아침 · 오전 · 오후 · 저녁 · 밤 여러 개, 하루 순서로 "새벽 · 저녁"처럼 적는다 | 명세에 따로 정한 길이 · 목록 규칙이 없음 |
| 등록 조건 | 서버에 올라간 내 기록만(휴대폰에만 있으면 입력 전에 "기록을 서버에 올린 뒤에…" 안내, 다음 단계 막음). 경로가 부족하면 서버가 거부하고 이유를 보여준다. mock 기준은 500m · 점 10개(서버 정책 확정 전 mock 값) | 43.1장 "sourceRunId는 내 FINISHED Run", "RunPoint가 충분하지 않으면 생성 거부" |
| 공개 안내 | 경로 확인 단계에 "등록하면 누구나 이 코스와 출발 · 도착 지점을 볼 수 있어요. 집이나 회사 앞에서 시작한 기록이라면 등록하지 않는 걸 권해요" | course.visibility 기본 PUBLIC, 16장 privacy zone 검토 전, 20.2장 코스 공개 정책 오픈 이슈 |
| 코스 상태 | `CourseDetail.status`(6.3장 NEW / VERIFIED / POPULAR) 추가. 막 등록한 코스는 NEW라 코스 상세 위 줄에 "새 코스" | 6.3장 CourseStatus, tbl_course.status 기본 NEW |
| 경로 | mock은 기록 경로를 그대로 코스 경로로 쓴다. 실제로는 서버가 코스용으로 정규화한 불변 snapshot | 43.1장 |
| 코스 저장 | 코스 상세의 저장 버튼이 이제 저장 API를 부른다(바로 바꿔 보여주고 실패하면 되돌림). 전에는 화면 안에서만 바뀌었다 | CRS-105 POST · DELETE /courses/{id}/bookmarks |
| 내 코스 | `/my/courses` 등록 · 저장 · 완주 탭. 코스 카드(경로 모양 · 이름 · 거리)에 탭별 정보: 등록은 등록 날짜 · 새 코스, 완주는 내 PB · 완주 횟수. 누르면 코스 상세. 탭마다 빈 상태와 다음 행동(달리기 시작 / 코스 찾기) | SCR-M04 "등록/저장/완주 코스", MY-005 |
| 마이 탭 | 누적 통계 아래 "내 코스" 입구 | 65장 My: Profile / Runs / Records / Courses |
| 데이터 | `CourseRepository.setBookmark` · `getMine(kind)`(MY-005, 경로는 OpenAPI 확정 시), `CourseRegistrationRepository.create`(POST /courses: sourceRunId, name, description, tags + 추천 시간) | 43장 |
| 개발용 | `/course/new?runId=…&scenario=` rejected / error, `/my/courses?scenario=` loading / empty / error, `?tab=` created / saved / finished | |

## 25. Mock · API 계약 대조 (119장 9번)

| 항목 | 판단 | 근거 |
| --- | --- | --- |
| 결과 문서 | `docs/api/MOCK-CONTRACT-CHECK.md`: API마다 일치 / 변환 / 명세 없음 / 미구현 / 이번에 고침과 백엔드에 정할 목록 | 119장 9번 "frontend 상태/Mock contract 검증" |
| 기준 | 앞쪽 장과 뒤쪽 계약 장이 다르면 뒤쪽 계약(42 · 46장)을 따른다. 다른 곳은 문서 11항에 모았다 | 42 · 46장이 OpenAPI 계약 |
| 앱 모델 이름 | 앱 모델 이름(epoch ms, 소문자 검증 상태, `entries` 등)은 그대로 두고 API 클라이언트가 바꾼다 | 119장 "UI를 서버 응답 구조에 묶지 않는다" |
| 이번에 고친 것 | 공통 응답 · 오류 코드 · cursor 타입(`shared/api/contract.ts`), Run API 요청 · 응답 타입과 point 변환(`entities/run/api/runApi.ts`), 엔진이 `clientRunUuid` 생성, RunPointStore 서명을 49.1장대로(runUuid), 기록에 `startedAt` · `clientRunUuid`(히스토리 시작 시각을 계산하지 않고 저장값 사용), 평균 페이스 정수, Together 방장은 `cancel`(POST /cancel) | 42.1 · 42.2 · 49.1 · 7.4 · 45장 |
| 고치지 않은 것 | 명세에 없는 API(탈퇴, 닉네임 확인, 내 주변 순위, 내 코스, 방 목록 등)는 앱에 두고 문서 12항에 모아 결정을 받는다 | 문서에 없는 API를 임의로 명세에 넣지 않음 |

## 26. iOS 애플 지도 도입

| 항목 | 판단 | 근거 |
| --- | --- | --- |
| 결정 | **사용자 결정: iOS를 먼저 만들고 지도는 애플 지도.** 명세는 지도 SDK를 GPS PoC 직후 정하게 되어 있으나 사용자가 먼저 정했다 | 20.2장 지도 SDK 오픈 이슈, 사용자 결정 |
| 비교한 후보 | MapLibre + OSM(직접 호스팅 · OpenFreeMap), 네이버, 카카오, Google + 애플. 비교 내용은 대화 기록과 PR 본문에 남긴다 | 20.2장 기준: 국내 지도 품질, Expo 호환, 비용, 경로 표시 |
| 라이브러리 | `react-native-maps` (Expo 지원). iOS 기본 provider가 애플 지도라 키 · 요금이 없다 | |
| 플랫폼 나눔 | 지도 컴포넌트마다 `*.ios.tsx`를 두고 같은 props로 애플 지도를 그린다. 웹(개발 확인용)과 Android는 기존 SVG 지도를 그대로 쓴다. 애플 지도 코드는 iOS 번들에만 들어간다 | Android 지도는 아직 미정 |
| 공용 부품 | `components/AppleMap`: 브랜드 지도 바탕(`mutedStandard`, 라이트 · 다크), 코스 선(번짐 + 짙은 민트 테두리 + 형광 민트), 달린 길, 점, 말풍선 핀, region 계산 · 부드러운 이동 | 83장 route signal, CLAUDE.md 8항 |
| 바탕 지도 | 애플 지도는 바탕 색을 바꿀 수 없다. 차분한 `mutedStandard`로 코스 선이 먼저 보이게 하고, 러닝 컨텍스트(준비 · 러닝 중)는 다크로 | 110.1장 light 탐색 / dark 러닝 |
| 제스처 | 탐색만 움직일 수 있다. 코스 상세 · 결과처럼 스크롤 위에 놓인 지도와 러닝 준비 · 러닝 중 지도는 제스처를 끈다 | CLAUDE.md 6 · 8항, 62.2장, NRC N4 |
| 장소 표시 | 탐색에서만 켠다. 나머지는 끄고 경로가 먼저 보이게 한다 | 83장 |
| 지명 | 애플 지도가 보여주므로 mock 지명(`base.labels`)은 iOS에서 쓰지 않는다 | |
| 탐색 코스 선택 | 애플 지도 선은 누르기 판정이 좁아서 러너 수 핀을 눌러 고른다 | 90장 리스트 · 지도 연결 |
| 공유 카드 | 그대로 SVG. 애플 지도 캡처를 외부로 공유하는 건 약관 확인 전이라 쓰지 않는다. mock 바탕 지도 밖 지역은 바탕 없이 경로만 보인다 | |
| 공용으로 뺀 것 | 탐색 지도 범위 계산(`exploreFrame.ts`), 내 위치 점(`MyDot.tsx`)을 SVG · 애플 지도가 함께 쓴다 | CLAUDE.md 13항 |
| NRC 참고 | `REFERENCE-RESEARCH-2026-09.md` 7항. 러닝 중 지도는 확인용(N4)을 반영, 길게 눌러 끝내기(N5) · km 음성 안내(N8)는 제안만 | 사용자 요청 |
| 확인 못 한 것 | 이 환경에는 iOS 기기 · 시뮬레이터가 없다. iOS 번들 빌드와 웹 회귀만 확인했다. 실제 지도 모양 · 핀 위치 · 다크 지도 · 성능은 아이폰 개발 빌드에서 확인해야 한다 | CLAUDE.md 11항 |
