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
| NRC 참고 | `REFERENCE-RESEARCH-2026-09.md` 7항. 러닝 중 지도는 확인용(N4) 반영, 길게 눌러 끝내기(N5)는 제안만 | 사용자 요청 |
| 구간 음성 안내 | **사용자 결정으로 추가**(NRC N8). 1km(기본) · 2km마다 "2킬로미터. 10분 40초. 평균 페이스 5분 20초."처럼 거리 · 누적 시간(멈춘 시간 제외) · 평균 페이스를 읽는다. 러닝 · Together Live 모두. 설정 > 러닝에 "구간 안내"(1km마다 / 2km마다 / 끔), 음성 안내를 끄면 고를 수 없다 | AUD-001 기본 안내, AUD-003 빈도 설정, WBS 13 "구간 TTS 이벤트", REFERENCE-MATRIX Voice "짧고 행동 가능한 음성" |
| 확인 못 한 것 | 이 환경에는 iOS 기기 · 시뮬레이터가 없다. iOS 번들 빌드와 웹 회귀만 확인했다. 실제 지도 모양 · 핀 위치 · 다크 지도 · 성능은 아이폰 개발 빌드에서 확인해야 한다 | CLAUDE.md 11항 |

## 27. GPS PoC (WBS 1)

| 항목 | 판단 | 근거 |
| --- | --- | --- |
| 범위 | 권한, 앞 · 뒤 위치 수신, SQLite 저장, 경로 표시(기존 지도), 복구, 실기기 테스트 준비. Batch Sync · 네트워크 상태는 WBS 2 | 19장 WBS 1 산출물 |
| 엔진 | `deviceRunningEngine`: 같은 `RunningEngine` 경계. 거리 · 페이스 · 스플릿 · 코스 진행은 mock 엔진과 같은 함수 | 49.1장 |
| 엔진 고르기 | iOS · Android는 실제 위치. `scenario` · `speed`(개발용) 파라미터가 있으면 mock 러너. 웹은 mock, `?gps=device`로 브라우저 위치 | 개발 QA 상태 유지 |
| 위치 수신 | 49.2장 startForeground · startBackground를 하나로: iOS는 앱 사용 중 시작한 위치 업데이트를 화면이 꺼져도 한 task로 준다. 권한은 "앱 사용 중 허용"만 요청(항상 허용 요청 없음). Android는 알림 있는 foreground service | 29.3장, expo-location 구현 확인 |
| 저장 | 백그라운드 task → `recorder` → SQLite append(50.1장 트랜잭션, seq는 저장소가 붙임). 엔진은 저장된 point로 지표 계산. 앱이 꺼진 상태에서 task가 깨어나도 저장은 이어진다 | 29.3장 "GPS 수신과 SQLite append만", ADR-001 |
| 스키마 | 29.2장 그대로 + `course_id` TEXT(코스 id가 문자열), `local_run.plan`(이어 달릴 때 화면 계획), `local_run_segment`(달린 구간: 복구 때 일시정지 시간 · 일시정지 중 이동을 빼려면 필요). `PRAGMA user_version` migration | 51.2장 pause segment 제외, 11.3장 |
| 품질 표시 | 정확도 > 20m는 LOW_ACCURACY, 직전 정상 point 대비 12m/s 넘으면 JUMP(3번 이어지면 새 위치 기준). 둘 다 거리에서 빼고 원본은 남긴다. 값은 모두 PoC 시작값 | 10.5 · 51장, LOC-004, 15항에서 미뤘던 순간 이동 판정 |
| GPS 상태 | 정확도 10m 이하 양호, 20m 이하 보통, 넘으면 약함. 10초 넘게 위치가 없으면 찾는 중 | LOC-003 |
| 일시정지 | 위치는 계속 받되(내 위치 · 앱 유지) 저장하지 않는다 | 51.2장 |
| 복구 | 로그인 뒤 탭이 처음 뜰 때 RUNNING · PAUSED 러닝이 있으면 카운트다운 없이 러닝 화면. 꺼져 있던 시간은 빼고 마지막 point까지만 달린 것으로 본다. GPS를 다시 잡으면 이어서 기록(RECOVERY → RUNNING). 일시정지 중 꺼졌으면 일시정지로 돌아온다 | 11.3장, 15항 recovering |
| 서버 | 서버 연동 전이라 종료하면 결과는 mock 저장소에 올린 것으로 본다. SQLite point는 PENDING으로 남긴다 | WBS 2 Batch Sync |
| 웹 | SQLite 대신 메모리 저장소(새로고침하면 사라짐), 백그라운드 task 없음 | 웹은 개발 확인용 |
| 러닝 준비 · 탐색 | 실제 위치. 러닝 준비는 화면이 보일 때만 위치를 받는다(러닝 화면이 위에 뜨면 끔). 탐색은 한 번만 읽는다. Together 대기실 · Live는 Live PoC 전이라 mock | 배터리 |
| PoC 도구 | 마이 탭 "GPS PoC 기록 보기 · 내보내기": 러닝별 point 수 · 평균 간격 · 평균 정확도 · 제외 비율, JSON(원본) · GPX 내보내기, 지우기. 개발 빌드와 `EXPO_PUBLIC_GPS_POC=1` 빌드에서만 | 18장 GPS 지표, 57장 GPS PoC Report |
| 빌드 | `expo-dev-client` 추가, `eas.json`에 development · gps-poc · production. 야외 테스트는 JS가 앱 안에 들어간 빌드(Release 또는 EAS gps-poc) | 9장 Build "EAS Development Build", 29.3장 |
| 문서 | `docs/test/gps-poc.md`: 설치, 시나리오, 정할 값 | 57장 |
| 확인한 것 | SQLite 저장소를 Node SQLite로 실행해 확인(seq · 구간 · 통계 · 동시 저장). 웹에서 브라우저 위치를 움직여 전체 경로 확인: 120m→0.12km, 튄 point 제외, 정확도 낮음 동안 거리 멈춤 + "GPS 약함", 일시정지 중 이동 · 시간 제외, 복구 후 이어서 기록. iOS · Android 번들 빌드, Info.plist(UIBackgroundModes location, 위치 문구) | |
| 확인 못 한 것 | 아이폰 실기기: 화면 잠금 기록, 강제 종료 뒤 복구, 실제 정확도 · 배터리 | CLAUDE.md 11항 |

## 28. Running Core — 기록 동기화 · 오프라인 (WBS 2)

| 항목 | 판단 | 근거 |
| --- | --- | --- |
| 범위 | WBS 2 중 남은 것: batch sync, offline. 상태 머신 · 거리/페이스 · pause/resume · recovery는 WBS 1(27항)에서 이미 실제 엔진으로 돌아간다 | 19장 WBS 2 |
| 동기화 | `features/run/sync/runSync`: 서버 Run 만들기(clientRunUuid) → 아직 Batch에 들지 않은 연속 seq를 Batch로 SQLite에 먼저 기록 → 전송 → 성공 ACKED + point SYNCED · 실패 RETRY_WAIT → 끝난 러닝이면 finish → `local_run.sync_state` SYNCED | 29.4 · 50.2 · 50.3장 |
| 값 | Batch 최대 60 point, 재시도 2초 · 4초 · 8초 … 최대 5분, 러닝 중 15초마다, 종료 때 최대 20초 기다림. 명세에 값이 없어 정한 시작값 | 29.4장 "backoff", 20.2장 GPS 샘플링과 함께 PoC에서 조정 |
| 재시도하지 않는 오류 | 422 RUN_POINT_INVALID, 409 IDEMPOTENCY_CONFLICT, 400, 403 → Batch · 러닝 FAILED | 50.3장 FAILED, MOCK-CONTRACT-CHECK 1.1 |
| 앱이 꺼질 때 | 켜질 때 SENDING Batch를 RETRY_WAIT로 되돌려 같은 batchUuid로 다시 보낸다 | 50.3장 |
| 서버가 Run을 모를 때 | 404면 서버 id · Batch를 지우고 처음부터 다시 올린다(clientRunUuid 멱등이라 중복 없음) | 11.3장 |
| FINISHING | finish 응답이 FINISHING이면 빠진 Batch를 보낸 뒤 다시 요청 | 42.4장 |
| 언제 도나 | 앱을 켤 때(로그인 뒤 탭) · 앱으로 돌아올 때 · 인터넷이 다시 연결될 때 · 재시도 시각 · 러닝 중 주기. 백그라운드 위치 task에서는 네트워크를 부르지 않는다 | 29.3장 |
| 종료 | 온라인이면 남은 point를 바로 올리고("남은 기록 N개를 올리고 있어요") finish까지 끝나면 결과로. 오프라인이거나 20초 안에 못 끝내면 "기록은 휴대폰에 저장했어요" → 결과 보기(휴대폰에만 저장됨). 연결되면 뒤에서 올리고 결과 · 히스토리가 저절로 바뀐다(결과 화면은 5초마다 다시 읽음) | RUN-006 · RUN-007 · RUN-010, 15항 local-only |
| 네트워크 상태 | `@react-native-community/netinfo`. 연결이 없거나 인터넷에 닿지 않으면 오프라인. 러닝 중 "오프라인이에요. 기록은 휴대폰에 저장하고 있어요"가 실제 상태로 뜬다. 웹은 브라우저 online/offline만 본다 | SCREEN-SPECS Active Run offline |
| 서버 | 백엔드 전까지 `mockRunApi`(clientRunUuid · batchUuid 멱등, 서버가 point로 거리를 다시 계산). 앱을 다시 켜면 비어 있어 위 404 경로로 다시 올린다 | 42 · 25.2장 |
| pause · resume API | 부르지 않는다. 요청에 시각이 없어 오프라인 일시정지를 나중에 올릴 수 없다. 백엔드 결정 항목에 넣었다 | MOCK-CONTRACT-CHECK 12항 13번 |
| PoC 화면 | 러닝마다 "서버 동기화 PENDING / SYNCED / FAILED · 서버 id" | |
| 확인한 것 | 동기화를 Node SQLite · 메모리 저장소로 실행해 확인(60개씩 나눔, 오프라인이면 안 보냄, backoff 시각 전 대기 · 같은 batchUuid 재전송, SENDING 복구, finish → SYNCED, 서버가 잊으면 처음부터, FINISHING이면 대기, 422면 FAILED 후 재시도 없음). 웹에서 온라인 종료 → 바로 결과, 러닝 중 오프라인 안내, 오프라인 종료 → 휴대폰에 저장 → 다시 연결 → 자동으로 올라가 결과의 "휴대폰에만 저장됨"이 사라짐. iOS · Android 번들 빌드 | |
| 확인 못 한 것 | 아이폰에서 비행기 모드 · 네트워크 전환(GPS-M-002), 실제 서버 | |

## 29. 앱 로고 · 스플래시 다듬기

사용자 결정: 11항 "모" 심볼은 그대로 두고 다듬는다. 스플래시는 짧은 애니메이션.

| 항목 | 판단 | 근거 |
| --- | --- | --- |
| 비교 | 현재 / A 트랙 모서리 / D A+속 넓힘 / E D+점 작게를 220 · 120 · 60 · 29px과 워드마크로 비교해 E를 골랐다 | 작은 아이콘(29~60px)에서 "모"가 읽혀야 한다 |
| ㅁ 루프 | 선 굵기로 그리던 둥근 사각형을 바깥 · 안쪽 윤곽으로 바꿨다. 안쪽 모서리도 둥글게(육상 트랙) | 11.1항 "ㅁ을 한 바퀴 코스 루프로" |
| 획 대비 | 세로 획 300 · 가로 획 260(글꼴 단위). 기둥 318 · 가로획 260과 맞춰 "달리"(Pretendard Black)와 같은 대비 | 워드마크 안에서 "모"만 균일 두께로 보이던 점 |
| 속 넓힘 | 루프를 위아래로 조금 키우고 기둥을 짧게 해 안쪽 높이 390 → 494 | 29px에서 속이 막힘 |
| 출발점 | 반지름 150 → 135, 둘레 80 → 72 | 큰 크기에서 점이 글자보다 먼저 보이던 점 |
| 로딩 · 스플래시 경로 | 출발점이 루프 획 가운데의 둥근 사각형 길을 따라 돈다(`pointOnTrack`) | 모서리에서 획 밖으로 나가지 않게 |
| 앱 아이콘 | 검정 바탕, 심볼 폭 60%. iOS 18 다크(투명 바탕) · tinted(흑백, 출발점 둘레를 뚫음) 추가 | Apple HIG iOS 18 아이콘 모드 |
| Android | 적응형 전경 41%(안전 영역 지름 66/108 안), 모노크롬(테마 아이콘) 출발점 둘레를 뚫음 | Android 적응형 아이콘 안전 영역 |
| 스플래시 | 네이티브: 검정 바탕 + 심볼 120(워드마크 대신). 앱 안 `BrandSplash`가 같은 크기 · 자리 · 색으로 이어 받아 네이티브 스플래시를 내리고, 출발점이 루프를 한 바퀴(0.9초) 돈 뒤 0.28초 동안 사라진다. 동작 줄이기면 돌지 않고 바로 사라진다 | 사용자 결정, ACCESSIBILITY 10항, `motion.splashLap` · `splashFade` |
| 색 | 출발점은 앱 안 심볼과 같은 `text.primary`(#F4F5F4) | 네이티브 → 앱 스플래시 이어질 때 색이 바뀌지 않게 |
| 만드는 법 | `scripts/brand/brand_assets.py`가 `brandGeometry.ts`에서 SVG를 만들고 `render.js`(Playwright)가 PNG로 그린다 | geometry 한 곳에서 아이콘 · 스플래시 · 앱 안 심볼을 함께 바꾼다 |
| 확인한 것 | 웹에서 스플래시 프레임(한 바퀴 → 사라짐 → 로그인), 동작 줄이기, 로그인 · 탐색 심볼, iOS · Android 번들, prebuild 결과(AppIcon 3종 · Android 스플래시 아이콘), expo-doctor | |
| 확인 못 한 것 | 실제 기기에서 네이티브 스플래시 → 앱 스플래시가 한 치 어긋남 없이 이어지는지(특히 Android 12+ 스플래시 아이콘 크기), 홈 화면 아이콘 모양 | |

## 30. 이메일 로그인 · 세션

**사용자 결정: 소셜 로그인은 빼고 JWT 기반 이메일 · 비밀번호 · 닉네임 가입. 로그인 세션을 확실하게.** 명세 41장(소셜 로그인)과 SCR-A01(Apple/Google/Kakao 버튼) · SCR-A02(가입 뒤 프로필 설정)를 바꾼다.

| 항목 | 판단 | 근거 |
| --- | --- | --- |
| 가입 | 이메일 · 비밀번호 · 닉네임 한 화면. 가입하면 바로 로그인. 닉네임을 가입 때 받으므로 SCR-A02 프로필 설정 단계는 뺐다(사진 · 닉네임 변경은 설정 > 프로필) | 사용자 결정 |
| 입력 규칙 | 이메일: 형식 · 191자, 앞뒤 공백 제거 · 소문자로 저장. 비밀번호: 8~64자, 영문과 숫자 함께, 공백 없음. 닉네임: 앞뒤 공백 제거 · 40자(DB), 중복 불가(입력을 멈추면 확인) | 명세에 규칙 없음. DB 컬럼 길이 |
| 로그인 실패 | 없는 이메일과 틀린 비밀번호를 같은 문구로("이메일 또는 비밀번호가 맞지 않아요") | 가입 여부 노출 방지 |
| 토큰 | Access Token: JWT 30분, 메모리에만. Refresh Token: 30일, 기기 SecureStore(Keychain · Keystore), 쓸 때마다 새로 바뀜(회전) | 14.1장 Access + Refresh, 기기 단위 |
| 세션 | 서버는 기기마다 세션 하나(tbl_refresh_token, 토큰 원문 대신 해시). Access Token이 세션 id를 담고 요청마다 세션이 살아 있는지 본다 → 로그아웃 · 같은 기기 재로그인 · 탈퇴 즉시 남은 Access Token도 막힘 | 14.1장 "탈퇴/로그아웃 시 폐기" |
| 탈취 감지 | 이미 바뀐 옛 Refresh Token이나 다른 기기에서 온 Refresh Token은 세션을 끊는다. 단, 응답을 못 받은 재시도는 60초 안이면 받아 준다 | 모바일 네트워크 재시도로 로그아웃되지 않게 |
| 앱 동작 | 만료 1분 전이면 요청 전에 미리 새로 받는다. 서버가 만료(TOKEN_EXPIRED)라고 하면 한 번 새로 받아 다시 보낸다. 새로 받기는 한 번에 하나만. 세션이 끝났다(AUTH_REQUIRED)면 로그인 화면. 서버에 닿지 못하면 세션을 유지(오프라인 러닝) | RUN-006 |
| 앱 시작 | splash를 유지한 채 저장된 Refresh Token으로 새 토큰을 받는다(AUTH-003) | |
| 서버 없이 | `EXPO_PUBLIC_API_URL`이 없으면 mock 계정(개발용 runner@dallimo.app / dallimo123, 기록 있음). 이메일에 "offline"이 들어가면 연결 실패를 흉내 낸다 | 웹 확인 · GPS PoC 빌드 |
| 화면 | 로그인: 심볼 · 워드마크 · 짧은 문구 → 이메일 · 비밀번호 → 로그인 → "처음이세요? 회원가입". 가입: 뒤로 · "달리모 시작하기" → 이메일 · 비밀번호(규칙 안내) · 닉네임(중복 확인 · 글자 수) → "가입하고 시작하기" → 약관 동의 문구. 비밀번호 보기 · 숨기기. 설정의 "로그인 방식"은 "이메일"로 | SCR-A01 dark 브랜드 첫 화면 유지 |
| 뺀 것 | `SocialLoginButton`, provider SDK 경계, 온보딩 프로필 화면 · 라우트 | |
| 서버 | `backend/README.md` 인증 항목 | |
| 확인한 것 | 서버 테스트 39개(가입 · 로그인 · 회전 · 재시도 허용 · 재사용 감지 · 다른 기기 · 로그아웃 · 만료 · 탈퇴 · 닉네임). 앱 HTTP 계층(만료 → 새로 받아 재시도, 세션 끝 → 로그인, 네트워크 오류). 웹 + 실제 서버: 가입 → 새로고침 복구 → 만료 전 자동 갱신(1번) → 로그아웃 → 틀린 비밀번호 → 중복 이메일 → 서버가 세션을 끊으면 로그인 화면. mock 모드 가입 · 설정 · 탈퇴와 기존 흐름 회귀 | |
| 확인 못 한 것 | 아이폰에서 SecureStore 저장 · 앱 재시작 뒤 복구 | |

## 31. Run API 서버 연결 (WBS 2 서버)

사용자 결정: finish 요청에 앱이 잰 달린 시간(`activeSeconds`, 일시정지 제외)을 함께 보낸다. 서버는 거리만 point로 다시 계산하고, 달린 시간은 이 값을 받되 시작~종료 시간을 넘지 않게 자른다. 명세 42.4장 요청 필드에 없는 값이다.

| 항목 | 판단 | 근거 |
| --- | --- | --- |
| 서버 | 명세 42장 Run API 6개. 멱등 · 거리 다시 계산 · FINISHING 판정 · 결정 사항은 `backend/README.md` Run API 항목 | 25.2장 · 42장 |
| 앱 연결 | `EXPO_PUBLIC_API_URL`이 있으면 `httpRunApi` · `httpRunResultRepository`, 없으면 지금까지의 mock. 기록 동기화(`syncRun`)는 그대로 | 30항과 같은 방식 |
| 서버 id | 서버 Run id는 숫자. 앱은 문자열로 저장하고, 히스토리 · 결과에서는 `srv-{runId}`로 쓴다 | 기기 기록 id(`run-N`)와 겹치지 않게 |
| 코스 id | 숫자가 아닌 mock 코스 id(`c-suseongmot` 등)는 코스 없이(`courseId: null`) 올린다. 그래서 검증 상태는 NONE | 서버 코스 API 전. 없는 코스를 보내면 404로 기록이 FAILED가 된다 |
| 히스토리 | 서버 GET /runs + 이번 실행에서 끝낸 기록(기기에만 있음 · 올리는 중 포함). 기기 기록은 첫 페이지에 기기 값으로 보여주고 서버 쪽 같은 기록은 뺀다 | RUN-006 Local First, 같은 기록 두 번 표시 방지 |
| 서버 기록 상세 | GET /runs/{id}의 거리 · 시간 · 페이스 · 스플릿 · 경로. 코스 이름 · PB · 순위 · 친구 기록은 없다 | 코스 · 랭킹 서버 전 |
| 서버 기록 썸네일 | 빈칸. 목록 응답에 경로 미리보기가 없다 | MOCK-CONTRACT-CHECK 16번. 명세에 넣을지 정해야 한다 |
| 결과 화면 오프라인 | 결과 조회를 `networkMode: 'offlineFirst'`로. 전에는 오프라인이면 TanStack Query가 조회를 멈춰 기기에 저장한 결과도 로딩만 보였다 | RUN-006. 웹 E2E에서 발견 |
| 확인한 것 | 서버 테스트(MySQL · MariaDB, RUN-IT-001~007 + 상태 · 검증 · 목록 · 거리 계산). Node에서 실제 서버로: 오프라인이면 안 보냄 → 달리는 중 업로드 → 일시정지 60초 포함 종료 → 달린 시간 600초(시작~종료 660초 아님) · 거리 1794m → 같은 기록 한 번만 → 끝난 뒤 새 Batch 409 · 없는 Run 404 → 앱 재시작 뒤 서버 기록 목록 · 상세 → 다른 사용자 기록 안 보임 → cursor 20+5. 웹 + 실제 서버: 가입 → 러닝(기기 GPS) → 결과, 러닝 중 오프라인 → 휴대폰에 저장 → 오프라인 결과 → 다시 연결 → 자동 업로드 → 서버에 2건 → 새로고침 뒤 히스토리 · 상세가 서버 값 | |
| 확인 못 한 것 | 아이폰에서 실제 서버로 올리기(백그라운드 · 앱 재시작 뒤 이어 올리기) | |

## 32. 코스 서버 연결 (WBS 4 Course Core)

사용자 결정: 로컬 개발 DB에만 앱 mock 코스 3개(수성못 둘레길 · 신천 강변 왕복 · 들안로 왕복)를 넣는다. 운영 · 테스트 DB에는 넣지 않는다.

| 항목 | 판단 | 근거 |
| --- | --- | --- |
| 서버 | 명세 43장 코스 API(주변 · 검색 · 상세 · 경로 · 등록 · 저장)와 내 코스(MY-005). 결정 사항은 `backend/README.md` Course API 항목 | 43장 · 43.1장 |
| 앱 연결 | `getCourseRepository(scenario)` · `getCourseRegistration(scenario)`. 서버 주소가 있고 개발용 상태가 `normal`이면 서버, 아니면 mock. 코스를 쓰는 화면(탐색 · 상세 · 준비 · 시작 · 결과 · 기록 상세 · 내 코스 · 공유 · 함께 방 만들기 · 랭킹 이름)이 모두 이 함수를 쓴다 | 개발용 상태 QA는 서버 모드에서도 mock으로 |
| 서버에 없는 값 | 지역 · 추천 시간 · 러닝 환경은 null, 주간 순위 · 친구 기록은 비운다. 화면은 이미 "정보 없음" · "첫 기록이 1위가 돼요"로 보여준다 | ERD에 저장할 곳이 없음, 랭킹은 WBS 6 |
| 코스 id | 서버 코스 id(숫자)를 문자열로. 코스 러닝을 올리면 서버가 코스 러닝으로 받고 검증 대기(PENDING) | 31항 `courseId` 변환 |
| 코스 등록 | 결과 · 기록 상세의 "이 경로를 코스로 등록" → 앱 기록 id를 서버 Run id로 바꿔 보낸다. 종료 때는 동기화가 결과 저장보다 먼저 끝나므로 서버 Run id를 먼저 기억해 둔다 | 43.1장 sourceRunId |
| 등록 거부 문구 | 짧은 기록 "경로 기록이 부족해서 코스로 만들 수 없어요", 올리기 전 "기록을 서버에 올린 뒤에 코스로 등록할 수 있어요" 등 mock과 같은 문구 | |
| 설명 길이 | 입력을 1000자로 막는다(서버와 같게) | backend/README |
| 추천 시간 | 입력은 받지만 서버로 보내지 않는다 | 43장 요청 필드에 없음(MOCK-CONTRACT-CHECK 8번) |
| "이번 주 인기" | 이번 주 달린 사람이 1명 이상일 때만 붙인다. 전에는 모두 0명이어도 첫 코스에 붙었다 | 서버 연결 확인 중 발견 |
| 랭킹 화면 | 서버 코스는 빈 랭킹("첫 기록이 1위가 돼요"). 전에는 "연결을 확인하고 다시 시도"가 떴다 | 랭킹 API(WBS 6) 전 |
| 확인한 것 | 서버 테스트 86개(MySQL · MariaDB: 코스 등록 · 거부 · 주변 거리순 · 반경 · cursor · 비회원 조회 · 숨김 · 비공개 · 검색(%, _ 글자 그대로) · 저장 멱등 · 내 코스 · 기록 숫자 · 코스 러닝 PENDING). 웹 + 실제 서버: 탐색에 서버 코스 3개(거리순) → 상세(경로 · 고도 · 태그 · 만든 사람) → 저장 → 내 코스 저장 탭 / 약 100m 기록 등록 거부 → 약 640m 기록으로 코스 등록 → 새 코스 상세 → 그 코스 달리기 → 서버에 코스 러닝(PENDING) → 내 코스 등록 탭 / 랭킹 빈 상태. mock 모드 탐색 · 상세 · 랭킹 · 내 코스 회귀 | |
| 확인 못 한 것 | 아이폰에서 서버 코스로 실제 달리기, 코스가 많을 때(수백 개) 주변 조회 속도 | |

## 33. 코스 완주 검증 (WBS 5 Course Verification)

사용자 결정: 판정 기준은 명세 10.5장 후보값(출발 · 도착 반경 100m, 경로 허용 폭 50m, 최소 일치율 85%)으로 시작한다. 공식 기록은 출발점에 가장 가까운 지점부터 도착점에 가장 가까운 지점까지의 시간이고 일시정지는 뺀다.

| 항목 | 판단 | 근거 |
| --- | --- | --- |
| 서버 | finish 커밋 뒤 비동기 검증, 검사별 근거 · 정책 버전 저장, VERIFIED면 공식 기록. 자세한 기준은 `backend/README.md` 코스 완주 검증 항목 | 26장 · 10.4장 |
| 결과 화면 | 서버 판정을 그대로 보여준다: 인증됨(코스 기록 = 공식 기록, 첫 기록 · PB 변화), 미인증(사유), 인증 거부(사유). 판정 전에는 지금처럼 "기록 검증 중"으로 1초마다 다시 읽는다 | CRUN-005, RST-002 |
| 기기 기록 | 이번 실행에서 끝낸 코스 러닝도 서버에 올라간 뒤에는 서버 판정을 붙인다. 서버에 닿지 못하면 "검증 중"으로 둔다 | RUN-006 Local First |
| 실패 사유 문구 | 출발점 근처에서 시작하지 않았어요 / 코스 도착점까지 달리지 않았어요 / 달린 거리가 코스보다 많이 짧아요 / 코스 경로를 벗어난 구간이 많아요 / 비정상적으로 빠른 구간이 있어 기록이 거부됐어요 / GPS 기록이 부족해 확인하지 못했어요 (`entities/run/verificationReason.ts`) | mock 결과 화면 문구와 같은 말투 |
| 히스토리 | 서버 기록에 코스 이름, 인증 상태. 기기 기록 줄도 서버 판정 상태를 쓴다 | MY-003 |
| 확인한 것 | 서버 테스트 106개(검증 로직 12 + MySQL · MariaDB CRS-IT-001~003 · PB · 한 번만 판정 · 주기 재검사 포함). 웹 + 실제 서버: 약 550m 코스 등록 → 정상 완주 → 약 1.5초 안에 "공식 기록 인증됨 · 첫 공식 기록 2:15(코스 구간만)" / 절반만 → "미인증 · 코스 도착점까지 달리지 않았어요" / 초속 9m → "인증 거부 · 비정상적으로 빠른 구간" → 코스 상세 코스 1위 · 완주 1명 · 내 PB → 새로고침 뒤 서버 기록 결과도 같은 판정 | |
| 남은 것 | 결과 화면 "이번 주 순위"는 인증된 뒤에도 "검증 뒤 반영"으로 보인다(주간 순위는 랭킹 API, WBS 6에서 채운다). 기준값은 실제 GPS 기록으로 오판율을 재 보고 조정해야 한다(26.3장) | |
| 확인 못 한 것 | 아이폰 실제 GPS로 루프 · 왕복 코스 판정, 실제 GPS 흔들림에서의 일치율 | |

## 34. 코스 랭킹 서버 연결 (WBS 6 Ranking/PB)

사용자 결정: 주간은 한국 시간 월요일 0시, 월간은 1일 0시부터. 친구 랭킹 탭은 친구 기능(WBS 8) 전까지 빈 상태("이 코스를 달린 친구가 아직 없어요.").

| 항목 | 판단 | 근거 |
| --- | --- | --- |
| 서버 | 43장 rankings + 내 주변 순위(`/rankings/me`). 사용자별 최고 공식 기록 순. 자세한 기준은 `backend/README.md` 코스 랭킹 항목 | 23.1장, RNK-001~005 |
| 앱 연결 | `getRankingRepository(scenario)`: 서버 주소가 있고 개발용 상태가 normal이면 서버, 아니면 mock (코스 저장소와 같은 규칙). 랭킹 화면(탭 4개 · 내 순위 카드 · cursor 목록)은 그대로 | |
| 코스 상세 | 이번 주 1~3위, 내 이번 주 순위 · 내 줄, 코스 1위(전체 기간)를 서버 값으로. 1~3위가 있으면 "전체 랭킹 보기"가 나온다 | CRS-104 |
| 결과 화면 | "이번 주 순위"가 서버 값: 처음이면 "2위", 바뀌면 "2위 → 1위". 33항에 남긴 "인증 뒤에도 검증 뒤 반영" 문제가 풀렸다 | RST-003 |
| 확인한 것 | 서버 테스트 116개(MySQL · MariaDB 랭킹 10개 포함: RNK-IT-001, 한국 시간 주 · 월 경계, cursor, 내 주변, 친구 빈 목록, 숨김, 코스 상세 미리보기, 실제 검증을 거친 주간 순위 변화). 웹 + 실제 서버: 코스 등록 → 라이벌 둘(3:00 · 1:39) → 내 코스 러닝 2:15 → 결과 "이번 주 순위 2위" → 코스 상세 이번 주 1~3위(나 포함) · 코스 1위 1:39 · 1위까지 0:36 → 랭킹 화면 이번 주 · 이번 달 · 전체 기간 "내 순위 2위 / 3명", 친구 탭 빈 상태. mock 모드 코스 상세 · 랭킹 회귀 | |
| 남은 것 | 친구 랭킹 · 친구 최고 기록(WBS 8). 기록이 많아지면 순위 쿼리 실행 계획 확인(23.1장) | |

## 35. 공유 링크 · 함께 달리기 초대 (WBS 7 Share + 45장 대기실)

사용자 요청: 초대는 실제로 초대가 되어야 하고(받은 사람이 그 방에 실제로 들어온다), 링크를 누르면 열려야 한다. 사용자 결정: 받은 사람에게는 코스와 기록 숫자만 보여주고 자유 달리기 경로는 보내지 않는다.

| 항목 | 판단 | 근거 |
| --- | --- | --- |
| 링크 모양 | 서버 공유 페이지 `http(s)://…/s/{code}`. 메신저에서 눌리고, 휴대폰이면 바로 앱(`dallimo://share/{code}`)을 연다. 안 열리면 "달리모 앱에서 열기" 버튼 | 사용자 요청. 메신저가 `dallimo://`를 링크로 보여주지 않는 경우가 많다. 14.3장 Web Landing의 첫 단계 |
| 공유 대상 | 기록 · 코스 · 함께 달리기 방. 기록 카드(결과 공유), 코스 공유, 대기실 초대 버튼이 모두 같은 공유 링크를 쓴다. 전에는 `dallimo://course/{id}`처럼 내부 id가 드러났다 | 16장 share_code |
| 링크를 열면 | 초대 → 그 방 대기실(초대 코드와 함께, 내 줄 "초대됨" + "참가하기"), 코스 · 코스 기록 → 코스 상세, 자유 달리기 기록 → "○○님의 달리기 기록 · 거리 · 시간 · 페이스" + "나도 달리기" | SHR-004, 받은 사람이 같은 코스 · 같은 방으로 |
| 로그인 전 | 로그인하지 않은 사람이 링크를 열면 로그인 화면을 거친 뒤 그 링크를 이어서 연다 (`usePendingShareLink`) | 받은 사람 대부분이 처음 온 사람 |
| 방 만들기 | 친구 기능(WBS 8) 전 서버 모드는 고를 친구가 없다. "방을 만든 뒤 대기실에서 초대 링크를 보내요…" 안내와 "5km 레이스 · 방 만들기" 버튼 | 친구가 없어 방을 못 만들던 문제 |
| 방 흐름 | 서버가 방 상태를 정한다: 모두 준비 → 5초 카운트다운(서버 출발 시각, 기기 시계로 맞춤) → 두 사람이 같은 시각에 달리기 화면 | 45.1장 |
| 달리기 이후 | 달리는 중 다른 사람 진행 · 결과는 Live 단계(WBS 11, WebSocket) 전이라 지금까지의 화면(mock 채널)을 그대로 쓴다. 방 정보(이름 · 목표)는 서버 방 | 이번 범위는 초대 · 대기실 |
| 확인한 것 | 서버 테스트 126개(MySQL · MariaDB 공유 · 방 10개 포함). 웹 + 실제 서버, 브라우저 두 개: 방장이 방 만들기 → 초대 링크 → 받은 사람(로그인 안 함)이 공유 페이지 → "웹에서 열기" → 로그인 → 그 방 대기실(초대됨 · 참가하기) → 참가 → 방장 화면에 2/2명 → 둘 다 준비 → 카운트다운 → 같은 시각에 둘 다 달리기 화면, 서버 방 RUNNING. 기록 · 코스 · 잘못된 링크 열기. mock 모드 함께 달리기 회귀 | |
| 확인 못 한 것 | 아이폰에서 메신저 링크 → 공유 페이지 → 앱 열림(개발 빌드는 노트북 IP 주소로 링크가 만들어진다). 앱이 없는 사람 안내 · 스토어 링크 · 도메인은 배포 단계 | |

## 36. 함께 달리기 실시간 경쟁 (WBS 11 Live)

사용자 결정: 명세대로 Redis로 달리는 중 상태를 둔다(ADR-005). 방이 끝나는 때는 모두 끝나면 바로, 레이스 · 거리 함께 달리기는 첫 완주 + 30분(남은 사람 DNF), 타임 어택 · 시간 함께 달리기는 목표 시간 + 5분(마지막으로 받은 거리로 순위). 안전장치로 출발 + 6시간을 더했다.

| 항목 | 판단 | 근거 |
| --- | --- | --- |
| 서버 방 · mock 방 | 방 id가 숫자(서버 방)면 기기 위치로 기록하고 실제 채널(`httpLiveChannel`, STOMP)에 붙는다. 개발용 mock 방(`r-*` · `demo`)은 mock 러너와 mock 채널 그대로 | 실제 상대와 겨루는 방에 가짜 러너 값을 보내지 않는다. 상태 QA용 mock 방은 남긴다 |
| 개인 Run 연결 | 기기 러닝 계획(plan JSON)에 `liveRoomId`를 두고 기록 동기화가 `POST /runs`에 보낸다. SQLite 스키마는 바꾸지 않는다 | 45.1장 개인 Run은 항상 생성. 결과의 "내 러닝 기록"이 서버 Run으로 이어진다 |
| 앱이 꺼졌다 켜지면 | 남은 러닝의 계획에 방 id가 있으면 그 방 달리기 화면으로 돌아가 기록을 이어 붙인다. 방이 이미 끝났으면 SYNC_STATE로 결과가 와서 결과 화면으로 간다 | 11.3장 복구를 함께 달리기에도 |
| 연결 끊김 | 앱: STOMP heartbeat 5초, 두 번 못 받으면 연결을 버리고 2초 뒤 다시 붙는다. 끊긴 동안 "연결이 끊겼어요. 내 기록은 계속되고…" 안내. 다시 붙으면 방 snapshot으로 순위를 맞추고, 끊긴 동안 보내지 못한 마지막 상태(완주 · 포기 포함)를 다시 보낸다. 서버: 15초 동안 소식이 없으면 다른 사람 화면에 "연결 끊김" | 32장. 휴대폰 망에서는 연결이 소리 없이 끊긴다(웹 확인에서 heartbeat 없이는 다시 켜질 때까지 몰랐다) |
| 러닝 중 순위 | 내 거리는 기기 값으로, 다른 사람은 마지막으로 받은 값으로 한 목록에서 순위 · 차이를 계산한다. 중도 포기한 사람과는 차이를 비교하지 않는다 | 연결이 끊겼을 때 순위 숫자와 "2위와 …m 앞서요"가 서로 달랐다 |
| 끝날 때 | 목표에 닿거나 그만두면 그 순간 상태를 먼저 보내고, 기록 마무리(남은 point 올리기)는 그 뒤에 한다. 서버가 마감으로 방을 끝내면 달리던 기록도 끝내고, 기록 저장이 끝난 뒤 결과로 간다 | 완주 순서가 기록 올리기 시간에 밀리지 않게. 결과의 내 기록 연결 |
| 결과 화면 · 공유 | 서버 방은 GET /result(서버 확정 값). mock 방은 mock 저장소 | 46.1장 |
| 값 | 채널 재연결 2초, 방 heartbeat 5초, STOMP heartbeat 5초 | 명세에 값 없음 |
| 확인한 것 | 서버 테스트 134개(MySQL · MariaDB 실시간 경쟁 4개씩 포함). 웹 + 실제 서버, 브라우저 두 개(위치를 1초마다 옮김): 준비 → 같은 시각 출발 → 서로의 거리 · 순위 · 차이가 실시간으로 바뀜 → 친구 연결 끊김 20초(친구 화면 안내, 방장 화면 "연결 끊김") → 다시 연결 → 방장 완주 · 기다림, 친구 화면 "선두 ○○님이 완주했어요" → 친구 완주 → 둘 다 결과 화면(1위 0:59, 2위 1:27, 서버 결과 · 방장 Run 연결 일치). 중도 포기(확인 시트 → 중도 포기, 방장 완주 즉시 방 종료, 결과 DNF 순위 없음). 타임 어택 5분. mock 방 회귀 | |
| 확인 못 한 것 | 아이폰 · 안드로이드에서 실제로 달리며 두 기기 경쟁, 백그라운드에서 WebSocket 유지(앱이 백그라운드면 연결이 끊기고 돌아오면 다시 붙는다고 보고 만들었다) | 실기기 필요 |

## 37. 친구 (WBS 8 Friends, SCR-M05)

사용자 결정: 검색은 닉네임 일부와 친구 코드 정확히, 둘 다. 친구 프로필은 닉네임 · 인증된 코스 기록 · 마지막으로 달린 날만 보여주고 자유 달리기 경로는 보여주지 않는다. 친구 랭킹 탭과 함께 달리기 친구 초대까지 이번에 붙인다.

| 항목 | 판단 | 근거 |
| --- | --- | --- |
| 들어가는 곳 | 마이 › "친구" 줄(내 코스 아래). 받은 요청이 있으면 "받은 친구 요청 N개"와 숫자 배지, 없으면 친구 수 | 65장 My에 친구가 있다. 처리할 일이 먼저 보이게 |
| 친구 화면 | 위에 검색창(닉네임 또는 친구 코드). 검색어가 없으면 받은 요청(수락 · 거절) → 친구 목록 → 보낸 요청(요청 취소) → 내 친구 코드(코드 보내기) | 받은 요청이 할 일이라 맨 위. 코드는 메신저로 보내 찾게 한다 |
| 검색 결과 | 한 줄에 관계에 맞는 버튼 하나: 친구 요청 · 요청 취소 · 거절/수락. 이미 친구면 "친구" 표시만 | 버튼 하나로 다음 행동이 분명하게 |
| 친구 프로필 | 이름 · 마지막 달리기, 코스 기록(코스마다 최고, 누르면 그 코스), 맨 아래 "친구 끊기"(확인을 한 번 더). 친구가 아니면 관계 버튼과 "친구가 되면 코스 기록을 볼 수 있어요" | 사용자 결정. 기록을 보면 그 코스로 가서 겨루도록 (핵심 루프) |
| 알리지 않는 것 | 거절 · 친구 끊기는 상대에게 알리지 않는다. 확인 문구에도 적는다 | 관계 부담을 줄인다. 요청 알림은 Push(WBS 10) |
| 친구 랭킹 | 나 + 친구 안에서 순위. 친구가 없으면 나 혼자 | 친구와 겨루는 화면이라 내 자리가 보여야 한다 |
| 친구 최고 기록 | 코스 상세 경쟁 카드 "친구 최고", 코스 러닝 결과 친구 비교, 플레이 모드 목표 후보가 서버 값으로 채워진다 | 자리는 있었는데 서버 값이 없었다 (CRS-104 · RST-004) |
| 함께 달리기 초대 | 방 만들기에서 친구를 고르면 방을 만든 뒤 초대한다. 고르지 않아도 방을 만들 수 있다(링크로 부르기). 대기실에 "친구 초대" 시트(방에 없는 친구만). 같은 멤버로 다시는 친구인 사람을 바로 초대 | 친구가 있어도 친구가 아닌 사람을 링크로 부를 수 있어야 한다 |
| 초대받은 쪽 | 함께 달리기 목록에 "초대 받음"으로 방이 뜨고, 들어가면 "참가하기". 나가기는 "초대를 거절할까요?"로 바뀐다. 출발할 때까지 참가하지 않으면 방에서 빠진다 | 링크 없이도 실제로 초대가 된다 |
| 개발용 상황 | `/my/friends?scenario=empty · error` (mock) | 다른 화면과 같은 규칙 |
| 확인한 것 | 서버 테스트 150개(MySQL · MariaDB 친구 8개씩 포함). 웹 + 실제 서버, 브라우저 두 개: 닉네임 검색 → 친구 요청 → 요청 취소 버튼, 친구 코드(RUN- 없이 소문자)로 찾기, 받은 사람 마이에 배지 → 수락 → 두 사람 친구 목록, 거절은 보낸 사람 목록에서 빠질 뿐, 친구 프로필 코스 기록, 코스 친구 랭킹(친구 · 나 2명), 코스 상세 "친구 최고", 방 만들기에서 친구 고르기 → 친구 화면에 "초대 받음" → 참가 → 둘 다 준비 → 출발. 긴 닉네임 말줄임, 빈 목록 · 오류 상태 | |
| 확인 못 한 것 | 휴대폰에서 코드 보내기(공유 시트), 글자 크기 키움 | 실기기 필요 |

## 38. 도전 (WBS 9 Challenge)

사용자 결정: 서버 도전은 친구의 인증 기록만 대상으로 한다. 인증되고 공식 기록이 목표와 같거나 빠르면 성공, 미인증 · 거부 · 느리면 실패. 목표 기록은 도전을 만든 때로 고정하고, 재도전은 친구의 지금 최고 기록으로 새 도전을 만든다. 알림(Push) 전에는 도전 목록으로 보여준다. 시작하는 곳은 친구 프로필 · 플레이 모드 친구 최고 · 결과 "다시 도전".

| 항목 | 판단 | 근거 |
| --- | --- | --- |
| 도전을 만드는 때 | 달리기 준비에서 "시작"을 누를 때 (버튼 "도전 만드는 중"). 서버에 닿지 못하면 목표만 두고 달린다(라이벌 연습) | 출발하지 않고 돌아선 도전이 쌓이지 않게. 오프라인이어도 달릴 수 있어야 한다 (RUN-006) |
| 도전과 러닝 연결 | 도전 id를 기기 러닝 계획(plan JSON)에 두고 기록 동기화가 `POST /runs`에 보낸다 | 함께 달리기 방 연결과 같은 방식. SQLite 스키마를 바꾸지 않는다 |
| 라이벌 목표 | 플레이 모드 라이벌 중 "친구 최고 · 도전"만 서버 도전. 코스 1위 · 이번 주 상위는 지금처럼 목표로만 | 사용자 결정 1 |
| 결과 화면 | 맨 위 감정 피드백은 도전 결과가 먼저("○○ 기록을 넘었어요", PB도 세웠으면 설명에 "· PB 갱신"). 경쟁 카드에 "○○ 기록 도전 · 목표 3:19 성공 · 실패 · 판정 중" | 63.1장 1순위 "완주/PB/Challenge 성공 여부". 확인 중 "첫 공식 기록"이 도전 성공보다 먼저 나와 바꿨다 |
| 다시 도전 | 친구의 지금 최고 기록으로 새 도전 (CHL-004) | 사용자 결정 3 |
| 도전 목록 | 달리기 탭 아래 "최근 도전" 3개(65장 Run › Recent Challenge), 친구 프로필 "주고받은 도전". 보낸 도전은 성공 · 실패, 받은 도전은 "기록 넘김" · "기록 지킴"으로 말한다. 누르면 보낸 도전은 내 러닝 결과, 받은 도전은 그 코스 | 받은 사람이 결과를 아는 곳 (Push 전). 받은 쪽은 내 기록을 지켰는지가 관심사 |
| 숨기는 것 | 만들고 달리지 않은 도전(open)은 목록에 보이지 않는다 | 출발 전에 그만둔 도전 |
| 확인한 것 | 서버 테스트 158개(MySQL · MariaDB 도전 4개씩). 웹 + 실제 서버: 친구가 코스 기록(3:19)을 남김 → 친구 프로필 "도전" → 달리기 준비(라이벌 · 목표 3:19) → 시작(서버 도전) → 실제 위치로 코스 완주 → 인증 1:40 → 결과 "성공", 서버 SUCCESS → 친구 달리기 탭 · 프로필 "기록 넘김", 내 달리기 탭 "성공" → 다시 도전 → 친구 최고 기록으로 달리기 준비. 결과 문구 단위 확인 | |
| 확인 못 한 것 | 휴대폰에서 실제로 달리며 도전 · 오프라인에서 시작한 도전 | 실기기 필요 |

## 39. 알림 · Push · 로컬 알림 (WBS 10)

사용자 결정: 알림이 많으면 안 되니 꼭 필요한 것만. Push는 친구 요청 · 함께 달리기 초대 · 예약한 방 취소 · 친구가 내 코스 기록을 넘음 네 가지. 로컬 알림은 GPS 약함 · 코스 이탈 · 코스 완주 · 일시정지 방치 · 함께 달리기 연결 끊김 · 시작 10분 전 · 올리지 못한 기록 일곱 가지. 밤 10시~아침 8시에는 Push를 보내지 않는다.

| 항목 | 판단 | 근거 |
| --- | --- | --- |
| 명세 14.2장과 다른 점 | LIVE_START · CHALLENGE(받음)는 뺐다. LIVE_REMINDER는 서버 Push 대신 휴대폰 예약 알림. 예약한 방 취소를 더했다. 막아낸 도전은 알림함에만 | 출발은 모두 대기실에서 준비해야 일어나 이미 화면을 보고 있다. 도전은 상대가 출발할 때 만들어져 받는 순간 할 일이 없다. 10분 전은 Push 준비 없이도, 인터넷이 없어도 울려야 한다 |
| 권한을 묻는 때 | 앱을 켤 때 묻지 않는다. 친구 요청을 보낼 때, 함께 달리기 방을 만들거나 참가할 때, 달리기 "시작"을 누를 때(창이 닫힌 뒤 출발). 앱 실행 동안 한 번, 거절하면 다시 묻지 않는다 | 알림이 왜 필요한지 알 수 있는 순간에 묻는다 |
| 알림함 | 마이 오른쪽 위 알림 버튼(안 읽은 수 배지) → 알림 화면. 안 읽은 알림은 연한 민트 배경과 점, 누르면 읽음 + 그 화면(친구 · 대기실 · 코스)으로. "모두 읽음" | Push를 끄거나 밤에 온 알림도 여기서 본다 |
| 달리는 중 Push | 달리는 중(일시정지 · 복구 포함)에는 친구 · 함께 달리기 · 기록 Push를 화면에 띄우지 않는다. 알림 목록 · 알림함에는 남는다 | 62.2장 달리는 중 주의를 빼앗지 않는다 |
| 달리는 중 로컬 알림 | 화면이 꺼졌거나 앱이 뒤에 있을 때만(화면을 보고 있으면 화면 · 음성). GPS는 30초 넘게 약할 때, 코스 이탈은 벗어날 때, 완주는 한 번. 같은 알림은 상황이 풀렸다가 다시 생겨야, 최소 2분 간격. 소리 없이 진동(Android "달리는 중 알림" 채널). 일시정지 30분은 예약이라 화면과 상관없이 | 사용자 결정. 화면 · 음성과 겹치지 않게 |
| 시작 10분 전 | 예약 방에 참가(JOINED · READY)하면 휴대폰에 예약, 나가거나 취소 · 시작되면 지운다. 함께 달리기 홈 · 대기실을 열 때마다 맞춘다. 설정 "함께 달리기"를 끄면 걸지 않는다 | 방이 취소돼도 앱을 열면 지워지고, 취소 Push가 따로 간다 |
| 올리지 못한 기록 | 끝난 러닝을 서버에 못 올린 채 하루가 지나면 한 번. 다 올라가면 지운다 | 오프라인으로 끝난 코스 러닝은 올라가야 인증된다 |
| 설정 | 알림: 함께 달리기(초대 · 예약 방 취소 · 10분 전) · 친구 요청 · 내 코스 기록 · 달리는 중 알림. 앞의 셋은 서버에도 저장(서버가 Push 전에 본다), 화면을 열 때 서버 값으로 맞춘다 | MY-006 |
| 웹 | 휴대폰 알림이 없다 (`notifier.web.ts`는 아무것도 하지 않는다). 알림함 · 설정은 웹에서도 동작 | 개발 확인용 |
| 확인한 것 | 서버 테스트 171개(MySQL · MariaDB 알림 6개씩 + 밤 시간 규칙). 로컬 알림 규칙 단위 테스트(GPS 30초 · 2분 간격 · 화면 보고 있을 때 · 설정 끔 · 이탈 · 완주 · 일시정지 예약/취소). 웹 + 실제 서버: 친구 요청 → 마이 알림 배지 1 → 알림함 → 누르면 친구 화면 · 읽음, 예약 방 초대 → 누르면 대기실, 방 취소 알림, 모두 읽음, 설정 "친구 요청" 끔 → 서버 저장. Android 번들 빌드(expo export) | |
| 확인 못 한 것 | 휴대폰에서 실제 Push 도착 · 로컬 알림 표시 · 권한 창 · 화면 끈 채 달리기 알림. Expo 계정 연결(eas init) · FCM · APNs · 개발 빌드가 필요하다 (backend README "실제 Push를 받으려면") | 실기기 필요 |
| 같이 고친 것 | 대기실 예약 시각이 "2시간 60분 뒤"로 보이던 반올림 | 확인 중 발견 |

## 40. 중간점검 뒤 누락분 1 — 자동 일시정지 · 대기실 GPS · 최근 결과 · 도전 공유 · 함께 달리기 실시간

사용자 결정: 중간점검에서 찾은 누락분을 모두 채운다. 프로필 이미지(업로드 API를 따로 만든다) · 프론트 CI(앱이라 필요 없다)는 뺀다. 개인 인터벌(명세 123장)은 이번에 만들지 않고, 만들 때 이름은 "인터벌 달리기"로 한다. 함께 달리기는 단순히 같이 뛰는 게 아니라 서로 달리는 모습이 실시간으로 보여야 한다.

| 항목 | 판단 | 근거 |
| --- | --- | --- |
| 인터벌 이름 (구현 전) | 진입점 "인터벌 달리기", 구간 WARMUP · WORK · RECOVERY · COOLDOWN은 "몸풀기 · 빠르게 · 천천히 · 마무리". 예: "빠르게 400m → 천천히 200m × 5회" | 사용자 결정. 명세 "훈련하기"보다 무엇을 하는지 바로 안다 |
| 자동 일시정지 기준 (RUN-009) | 0.6m/s보다 느린 상태가 6초 이어지면 멈추고, 1.5m/s 이상이 2초 이어지면 이어서 기록한다. 기기 속도가 없으면 최근 5초 동안 움직인 거리로 본다. 정확도가 20m보다 나쁜 위치로는 판단하지 않는다 | 20.2장 "필드 테스트"에서 정할 값이라 `RunPolicy` 시작값으로 둔다. 걷는 속도(약 1.2m/s)로는 멈추지도 이어 가지도 않는다 |
| 멈춘 시각 | 느려지기 시작한 때로 되돌려 멈춘다. 멈춰 선 6초는 달린 시간에 넣지 않는다 | 신호 대기 시간이 기록에 섞이지 않게 |
| 자동 일시정지를 쓰는 모드 | 자유 · 코스 · PB · 도전. 함께 달리기 · 레이스 · 타임 어택은 쓰지 않는다 | 여러 사람이 같은 시계로 달리는 방에서 한 사람만 시간이 멈추면 비교가 어긋난다 |
| 자동 일시정지 표시 | 위 상태 "자동 일시정지", 안내 "멈춰 있어서 기록을 잠시 멈췄어요. 다시 달리면 이어서 기록해요", 햅틱 + 음성("자동 일시정지" · "다시 기록해요"). 직접 멈춘 경우에는 저절로 이어 가지 않는다 | 62.2장 화면을 보지 않아도 상태를 안다 |
| 대기실 GPS | 서버 방은 Run Ready와 같은 실제 위치(권한 요청 → 정확도). 권한이 없으면 "위치 권한과 위치 서비스를 켜면 준비할 수 있어요". 웹 · mock 방은 mock | 준비 완료를 GPS 상태로 막는데 실제 GPS를 보지 않고 있었다 |
| 함께 달리기 실시간 (TOGETHER) | 친구마다 지금 거리(오른쪽 숫자) + 지금 페이스 · 나보다 몇 m 앞/뒤(한 줄), 아래 "N명이 함께 ○km 달렸어요". 레이스 · 타임 어택은 지금처럼 나와의 차이가 오른쪽, 페이스가 한 줄 | 사용자 요청. SCREEN-SPECS Together "함께 달린 시간/거리, 친구 진행". 상대 위치 대신 거리 · 페이스만 (94장) |
| 끊긴 친구 · 포기한 친구 | "마지막 ○km · 다시 연결을 기다려요", "○km에서 멈췄어요" | 끊긴 동안 숫자가 멈춘 이유를 알 수 있게 |
| 응원 | 함께 달리기 중 "응원 보내기"(모두에게). 10초에 한 번(보낸 뒤 "응원을 보냈어요"). 받으면 햅틱 + 음성 "○○님이 응원했어요" + 4초 배너. 레이스 · 타임 어택에는 없다 | SCREEN-SPECS Together 보조 정보 "응원". 달리는 중 조작을 줄이려고 한 사람씩 고르지 않고 버튼 하나. 승부 모드에서는 방해가 된다 |
| 최근 결과 | 서버 `GET /live-runs/recent`로 함께 달리기 홈 "최근 결과"(끝난 방 10개) | 서버 모드에서 비어 있었다 |
| 도전 공유 (SHR-003) | 도전으로 달린 기록을 공유하면 기록 링크 대신 도전 링크. 받은 사람은 판정 카드("○○님이 △△님의 기록을 넘었어요" · "△△님이 도전을 막아냈어요" · "기록에 도전해요", 코스 · 목표 · 도전 기록) → "이 코스 보기" | 받은 사람이 누가 누구에게 이겼는지를 먼저 본다. 코스로 바로 넘기지 않는다 |
| 탐색 검색 | 이번에 하지 않고 다음(코스 지역 · 지도 재검색과 같이) | 탐색 화면을 두 브랜치가 같이 고치지 않게 |
| 확인한 것 | 서버 테스트(MySQL · MariaDB 실시간 4개 · 도전 5개씩, 최근 결과 · 응원 · 응원 간격 · 레이스 응원 거부 · 도전 공유 판정). 자동 일시정지 규칙 단위 테스트(6초 · 5초만 멈춤 · 정확도 · 한 번 튄 속도 · 걷는 속도 · 속도 없음 · 모드). 웹 mock: 함께 달리기 친구 거리 · 페이스 · 앞뒤 · 합계, 응원 받기 · 보내기, 자동 일시정지 켬 → 기록 중 → 자동 일시정지(0:20에서 멈춤) → 기록 중, 끄면 멈추지 않음. 웹 + 실제 서버 두 브라우저: 함께 달리기 응원 → 친구 화면 배너, 끝난 뒤 함께 달리기 홈 최근 결과, 도전 공유 페이지 제목 · 앱에서 판정 카드 → 코스 | |
| 확인 못 한 것 | 휴대폰에서 실제로 멈춰 섰을 때 자동 일시정지(속도 값 · 기준값), 대기실 실제 GPS, 화면 끈 채 응원 음성 | 실기기 필요 |
## 41. 중간점검 뒤 누락분 2 — 코스 평가 · 신고 · 러닝 환경 · 지역 검색 · 평점 필터 · 추천 · 지도 재검색

사용자 결정: 중간점검에서 찾은 누락분을 모두 채운다 (40항과 같은 결정). 이 항목은 WBS 14 Review와 탐색(CRS-002~005) 몫이다.

| 항목 | 판단 | 근거 |
| --- | --- | --- |
| 평가 자격 (REV-001) | 그 코스를 인증 완주한 사람만(공식 기록이 있어야). 한 사람 한 평가, 다시 쓰면 바뀐다. 완주 전에는 "이 코스를 인증 완주하면 평가할 수 있어요" | 명세 "완주자 기반 환경 평가". 한 사람이 평균을 여러 번 끌어올리지 않게 |
| 평가 항목 | 별점 1~5(필수) + 신호 · 야간 조명 · 혼잡 · 노면(적음/보통/많음처럼 셋 중 하나, 선택) + 화장실 · 급수대(있어요/없어요, 선택) + 한 줄 평(1000자, 선택). 같은 답을 다시 누르면 고르지 않은 것으로 | ERD course_review 점수 네 개 + CRS-102 화장실 · 급수. 1분 안에 끝나게 선택 항목은 건너뛸 수 있다 |
| 러닝 환경 (CRS-102) | 완주자 평가를 모은 값으로 채운다. 셋 중 하나 평균을 세 단계로, 화장실 · 급수대는 "있다"가 절반 이상이면 있음. 평가가 있으면 제목 옆 "완주자 평가 기준" | 만든 사람 한 명보다 달린 사람 여럿의 답이 정확하다. 저장할 곳을 따로 만들지 않는다 |
| 평가 위치 | 코스 상세 4차(61.1장) "완주자 평가": 평균 · 수 → 평가하기 / 내 평가 고치기 → 최근 평가(20개씩 더 보기). 러닝 결과에서 인증 완주면 "이 코스 평가하기" | 결정에 필요한 1~3차 정보를 가리지 않는다. 완주 직후가 평가를 가장 잘 남기는 때 |
| 신고 (CREG-005) | 코스 상세 맨 아래 작은 "코스 신고" → 사유(위험해요 · 사유지예요 · 정보가 틀려요 · 그 밖의 문제) + 자세히(선택) → "신고를 받았어요". 서버에 쌓기만 한다 | 자주 쓰는 기능이 아니라 눈에 띄지 않게. 숨김 기준은 20.2장 코스 공개 정책과 함께 정한다 (MOCK-CONTRACT-CHECK 24) |
| 코스 지역 | 등록할 때 휴대폰 지오코더로 출발점을 "대구 수성구"처럼 바꿔 함께 보낸다(경로 확인 단계에 표시). 웹에서 등록하면 비어 있다 | 외부 지도 API 없이 기기 기능만. 지역 검색(CRS-003)에 쓴다 |
| 추천 시간 | 등록 화면에서 고른 추천 시간을 서버에 저장한다 | 전에는 서버가 받지 않아 서버 코스에서 사라졌다 |
| 검색 (CRS-003) | 검색창에 입력하면 0.3초 뒤 서버에서 이름 · 지역 · 태그로 찾아 목록 · 지도를 검색 결과로 바꾼다. 제목 "'검색어' 검색 결과", 결과 줄에 지역. 없으면 "찾는 코스가 없어요 · 코스 이름, 지역(예: 수성구), 특징(예: 강변)으로 찾아보세요" | 반경 밖 코스를 찾을 수 없었다 (주변 목록 안에서만 글자를 거르던 것) |
| 평점 필터 · 정렬 (CRS-004) | 빠른 필터 "평점 4점 이상"(평가가 있는 코스만), 정렬 "평점순"(평가 없는 코스는 뒤). 목록 줄 앞에 "★ 4.3" | 명세 "거리 · 특징 · 인기 · 평점 필터" |
| 추천 (CRS-005) | 시트 맨 위 "추천" 한 줄: 평소 달리는 거리(최근 기록 20개의 가운데 값, 기록이 없으면 3~5km)에 가까운지 ×2 + 평점 + 이번 주 러너 + 출발점이 가까운지 + 아직 안 달린 코스. 가장 크게 기여한 이유를 한 줄로("평소 달리는 5km와 비슷해요"). 누르면 그 코스를 고른다 | 명세 "초기 규칙 기반 추천". 가중치는 명세에 값이 없어 정한 시작값. 탐색을 추천 피드로 바꾸지 않게 한 줄만 |
| 지도 재검색 (CRS-002) | iOS 애플 지도를 손으로 옮기면 위에 "이 지역에서 찾기" → 누르면 지도 중심 · 보이는 반경(0.5~20km)으로 찾고 제목 "이 지역 코스". 내 위치 버튼을 누르면 내 주변으로 돌아온다. 웹 · Android 임시 지도는 움직이지 않아 버튼이 없다(검색으로 다른 지역을 찾는다) | 지도 SDK가 정해지면 Android도 같은 props(`onUserMoved`)로 붙인다 |
| 확인한 것 | 서버 테스트(MySQL · MariaDB 코스 10개씩: 지역 · 태그 검색, 지역 · 추천 시간 저장, 평가 권한 403 · 남의 기록 · 점수 범위, 다시 쓰기, 환경 모으기, 평가 목록 cursor, 지우기, 신고 한 번 · 사유 확인, 스키마 V10). 추천 규칙 단위 테스트(평소 거리 · 기록 없음 · 평점 · 평가 없는 평점 무시 · 가운데 값). 웹 + 실제 서버: 인증 완주한 사람이 코스 상세 "평가하기" → 별 4 · 신호 적음 · 밝음 · 화장실 있음 · 한 줄 → 상세 평균 4.0 · 러닝 환경 채워짐 · 내 평가, 코스 신고 → 서버 저장, 탐색 추천 줄, 지역 검색 · 결과 없음, 평점 필터 | |
| 확인 못 한 것 | iOS에서 지도를 옮겨 "이 지역에서 찾기", 휴대폰 지오코더 지역 이름(시 · 구가 기기마다 다르게 나올 수 있다) | 실기기 필요 |

## 42. 친구 활동 (ACT-001~002, SCR-M06)

사용자 결정: 중간점검에서 찾은 누락분을 모두 채운다 (40항과 같은 결정).

| 항목 | 판단 | 근거 |
| --- | --- | --- |
| 들어가는 곳 | 마이 › "친구 활동"(친구 아래). 탭 · 탐색에는 두지 않는다 | 65장 "Activity는 독립 탭이 아니라 알림/프로필/관련 도메인에서 진입", CLAUDE.md "Instagram 같은 피드가 아니다" |
| 담는 소식 | 첫 공식 기록 · PB 갱신 · 이번 주 코스 3위 안 · 도전 성공 · 새 코스. 친구와 내 것 | SCR-M06 "PB, 코스등록, Challenge, 랭킹 이벤트". 달리기만 한 것(인증 기록이 아닌 것)은 담지 않는다 |
| 문구 | 제목은 누가 무엇을("민수님이 PB를 세웠어요", "민수님이 내 기록을 넘었어요", 내 것은 "내가 …"), 설명은 코스 · 숫자("수성못 둘레길 · 10:00 (53초 단축)") | 한 번에 읽히게. 도전은 넘은 상대가 나면 "내 기록" |
| 누르면 | 그 코스 상세 | 코스가 중심. 소식을 보고 같은 코스를 달리게 한다 |
| 없는 것 | 좋아요 · 댓글 · 사진 | 피드를 중심 IA로 만들지 않는다 (79장) |
| 내 소식 표시 | 연한 민트 배경 | 알림함 안 읽음 · 목록 내 줄과 같은 표시 |
| 상태 | 불러오는 중 · 오류(다시 시도) · 비어 있음("아직 친구 활동이 없어요" + 친구 찾기) · 당겨서 새로 고침 · 끝까지 내리면 더 불러오기. 개발용 `?scenario=empty · error` | SCREEN-SPECS 상태 |
| 확인한 것 | 서버 테스트(MySQL · MariaDB 활동 2개씩). 문구 단위 테스트. 웹 + 실제 서버: 내가 코스를 만들고 친구가 그 코스를 달려 인증 → 마이 › 친구 활동에 "친구님이 이번 주 1위에 올랐어요" · "첫 공식 기록을 남겼어요" · "내가 새 코스를 만들었어요" → 누르면 코스 상세. 빈 상태 · 오류 상태 | |
| 같이 고친 것 | 새 코스 소식에 같은 id의 기록 시간이 붙던 것(대상 종류를 보지 않고 찾음) | 확인 중 발견 |

## 43. Hardening — Privacy Zone · 누적 통계 · App Link · 요청 제한

사용자 결정: 중간점검 누락분을 모두 채운다. 프로필 이미지(업로드 API를 따로 만든다) · 프론트 CI(앱이라 필요 없다)는 뺀다.

| 항목 | 판단 | 근거 |
| --- | --- | --- |
| Privacy Zone (16장) | 코스 없는 기록(자유 달리기 · 함께 달리기)의 공유 카드 지도에서 출발 · 도착 200m 안 경로를 뺀다. 한 바퀴 돌아 출발점 근처를 다시 지나는 점도 뺀다. 남는 경로가 없으면 지도 카드가 없다. 카드 아래 "집 · 직장이 드러나지 않게 출발 · 도착 200m는 지도에서 가렸어요" | 20.2장 "시작/종료 지점 마스킹 범위 — 출시 전 개인정보 검토"라 200m는 시작값. 코스 기록은 이미 공개된 코스 위라 가리지 않는다. 내 결과 화면(나만 보는 곳)은 그대로 |
| 코스 없는 기록 기본 카드 | 전과 같이 "기록" 카드 | 가려도 지도 카드는 고르는 사람만 |
| 누적 통계 (MY-002) | 서버 `GET /users/me`의 `stats`에 아직 올리지 못한 기기 기록만 더한다 | 기록 전체를 받아 더하던 것(기록이 늘수록 요청이 늘어남)을 없앴다 |
| App Link · Universal Link (SHR-004) | 공유 페이지 주소 `https://{도메인}/s/{code}`를 앱이 깔려 있으면 바로 연다(`app/s/[code]` → 공유 링크 화면, 로그인 전이면 로그인 뒤 이어서). 도메인 · 번들 id · 패키지는 `APP_LINK_DOMAIN` · `IOS_BUNDLE_ID` · `ANDROID_PACKAGE`로 빌드할 때 넣는다(`app.config.ts`). 값이 없으면 지금처럼 공유 페이지 → `dallimo://` | 도메인 · 스토어 앱 id는 배포 단계에서 정한다 (backend README 공유 링크) |
| 요청 제한 | 서버에서만(앱 화면 변경 없음). 429면 앱은 기존 "요청이 너무 많아요. 잠시 뒤 다시 시도해 주세요" 오류 문구 | 27장 RATE_LIMITED |
| 확인한 것 | 서버 테스트(요청 제한 · 확인 파일 · 누적 통계). Privacy Zone 단위 테스트(앞뒤 200m · 짧은 기록 · 출발점을 다시 지나는 왕복). `expo config`에 환경 변수를 넣으면 associatedDomains · intentFilters가 들어가고 없으면 그대로. 웹: 자유 달리기 공유 카드 지도에서 출발 · 도착이 빠진 경로, 마이 누적 통계 | |
| 확인 못 한 것 | 실제 도메인 · 서명 인증서로 휴대폰에서 링크를 눌러 앱이 바로 열리는지 | 배포 단계 |

## 44. 경쟁 음성 안내 (AUD-002)

사용자 결정: 중간점검 누락분을 모두 채운다 (40항과 같은 결정). 앱 화면에서만 바뀌고 서버 계약은 그대로다.

| 항목 | 판단 | 근거 |
| --- | --- | --- |
| PB 어택 · 도전: 앞섬 · 뒤처짐 | 목표보다 3초 넘게 느려지면 "뒤처졌어요. 목표보다 5초 느려요", 3초 넘게 빨라지면 "다시 앞섰어요. …". 처음 정해지는 쪽은 읽지 않고 바뀔 때만 읽는다. 3초 안쪽은 이전 상태를 유지하고 1분에 한 번까지 | 69장 "PB gap 임계치 통과 시 선택적 TTS". 3초 · 1분은 명세에 값이 없어 정한 시작값. 목표 근처에서 오르내릴 때 계속 읽지 않게 |
| PB 어택 · 도전: 구간 안내 | 구간 안내 끝에 "목표보다 5초 빨라요"를 붙인다. 도전은 "민수님 기록보다 …" | 1km마다 한 번 목표와의 차이를 알 수 있게. 따로 읽지 않고 한 번에 |
| 목표 차이 계산 | 화면 gap strip과 같은 계산(목표를 코스 전체에 고르게 나눈 페이스, 16항). 초 아래는 버려 화면과 같은 값을 읽는다. 코스를 50m 달리기 전 · 완주 뒤에는 읽지 않는다 | 보이는 값과 들리는 값이 다르면 헷갈린다 |
| 레이스 · 타임 어택: 순위 | 순위가 5초 유지되면 "2위로 올라섰어요" · "3위로 내려갔어요". 처음 순위는 읽지 않고 20초에 한 번까지. 기존 순위 변화 햅틱은 그대로 | 69장 "순위 변화 가벼운 햅틱". 잠깐 엎치락뒤치락할 때마다 읽지 않게 |
| 타임 어택: 남은 시간 | "남은 시간 5분" · "남은 시간 1분"을 한 번씩 | 끝나는 시점을 화면 없이 알 수 있게 |
| 친구 완주 | 레이스는 먼저 들어온 한 명만 "선두 민수님이 완주했어요"(내가 1등이면 읽지 않는다). 같이 달리기는 친구마다 "민수님이 완주했어요" | 레이스는 선두만 알면 되고, 같이 달리기는 함께 뛰는 사람이 적다 |
| 설정 | 설정 › 러닝 "경쟁 안내"(기본 켬): "목표보다 앞서거나 뒤처질 때, 순위가 바뀔 때, 친구가 완주할 때 알려요". 음성 안내를 끄면 고를 수 없다 | AUD-003 음성 설정. 구간 안내 · 이탈 · 완주 같은 기본 안내와 따로 끌 수 있게 |
| 확인한 것 | 규칙 단위 테스트(첫 상태 무시 · 임계치 · 1분 간격 · 순위 5초 유지 · 20초 간격 · 남은 시간 한 번 · 레이스 선두만 · 내가 선두면 안 읽음 · 같이 달리기 모두). 웹 + 실제 서버(읽은 문장을 가로채 확인): 레이스 "3위로 올라섰어요 · 2위로 올라섰어요 · 선두 민수님이 완주했어요", 타임 어택 순위 · "남은 시간 5분 · 1분", 같이 달리기 "민수님이 완주했어요 · 지수님이 완주했어요", PB 어택 "1킬로미터. … 목표보다 5초 느려요."(화면 +0:04, 4배속에서 1초 차이 → 초 아래 버림으로 맞춤), 경쟁 안내를 끄면 구간 안내만 | |
| 확인 못 한 것 | 실제 달리기에서 앞섬 · 뒤처짐이 바뀌는 순간 음성(mock 러너는 목표 근처를 일정하게 달려 3초를 넘나들지 않았다. 단위 테스트로만 확인). 휴대폰 TTS 속도 · 다른 앱 소리와 겹칠 때 | 실기기 필요 |

## 45. 인터벌 달리기 (123장 Training)

사용자 결정: 40항에서 미뤘던 개인 인터벌을 이번에 만든다("2번 확실하게 진행해"). 명세 128장은 1.5~2차 기능이지만 사용자 요청으로 지금 넣는다. 이름은 40항대로 "인터벌 달리기", 구간은 몸풀기 · 빠르게 · 천천히 · 마무리.

| 항목 | 판단 | 근거 |
| --- | --- | --- |
| 들어가는 곳 (125장) | 달리기 탭 자유 달리기 카드 아래 진입점: 코스 달리기 · 함께 달리기 · **인터벌 달리기**. 탭 · 탐색은 그대로 | 125장 "Run 탭에서 시작하면 4개 진입점"(자유 · 코스 · 인터벌 · 함께), 129장 "4개 이상 노출하지 않는다" |
| 인터벌 목록 (123.1장) | 직접 만들기 → 내 인터벌(누르면 달리기 준비, 아래 "고치기") → 추천 인터벌 3개(누르면 달리기 준비, "고쳐서 저장") → 최근 인터벌 달리기 3개. 빈 상태 · 오류 상태(추천은 그대로 보임). 개발용 `?scenario=empty · error` | 123.1장 나의 인터벌 · 최근 훈련 · 추천 템플릿 · 직접 만들기 |
| 추천 인터벌 | 400m 인터벌(123.2장 예시 그대로), 1분 빠르게 · 1분 천천히 × 8(시간만), 1km 반복 × 3(페이스 5'00", 천천히 3분). 앱에 둔다 | 예시 외 값은 명세에 없어 정한 시작값. 시간 · 페이스 목표 예시를 하나씩 |
| 만들기 (129장 1분 기준) | "직접 만들기"는 400m WORK + 200m RECOVERY × 5 구성으로 시작한다. 반복 횟수만 ± 하고 저장하면 된다. 이름을 비우면 "400m × 5"처럼 붙인다 | 129장 "400m WORK + 200m RECOVERY x N을 1분 내 생성 · 저장". 브라우저에서 반복 +1 · 구간 하나 고치기 · 이름 · 저장까지 6초 |
| 순서 바꾸기 | 끌어서 옮기기(Drag & Drop) 대신 구간 · 묶음마다 ↑ ↓ 버튼 | 123.2장 "Drag & Drop하거나 추가/삭제". 스크린 리더 · 한 손 · 웹에서도 같게 동작하게. 버튼만으로 모든 순서를 만들 수 있다 |
| 구간 고치기 (WorkoutStepEditor) | 아래에서 올라오는 시트: 종류 칩 → 끝나는 조건(거리 · 시간 · 직접 넘기기) + 자주 쓰는 값 칩(200m~2km, 30초~5분) + 직접 입력 → 목표(없음 · 목표 시간 · 최대 시간 · 목표 페이스). 시간 목표는 거리 구간에서만. 틀린 값이면 이유를 보여 주고 "완료"를 막는다 | 입력을 줄이려고 칩 먼저. 서버와 같은 범위(`validate.ts`) |
| 목표 뜻 | 목표 시간 = 이 시간에 맞추기(`min = max`), 최대 시간 = 이 시간 안(`max`만, 천천히 구간에 기본), 목표 페이스 = 1km 페이스. 범위(`min ≠ max`)는 API만 받는다 | 123.2장 예시 "목표 1:30", "최대 1:30" |
| 고치기 · 복제 · 지우기 | 고치면 버전이 오른다(지난 기록은 그때 구성). 고치기 화면 아래 "복제해서 새로 만들기" · "이 인터벌 지우기"(확인). 고친 채 뒤로 가면 "저장하지 않고 나갈까요?" | 123.2장 "다시 실행하거나 복제해서 수정", 123.3장 버전 |
| 달리기 준비 | 인터벌 카드(이름 · 구성 · 총량) + "다른 인터벌 고르기". GPS 준비는 자유 달리기와 같다 | 72장 Run Ready 흐름 그대로 |
| 달리는 화면 (TrainingRunHUD) | 지금 구간 칩(빠르게 2/5) · 구간 n/전체 → 남은 거리/시간(가장 크게, 직접 넘기기면 지난 시간) → 진행 막대 → 목표와 차이 + 목표 · 지금 → "다음 구간"(직접 넘기기일 때만) → 다음 구간 한 줄 → 전체 거리 · 시간(작게). 50m 전에는 "50m 달리면 비교해요" | INTERVAL-TRAINING-SPEC "current step, remaining, target, gap, next. Do not overload" |
| 구간 판정 | 엔진이 point마다 · 1초마다 판정한다. 거리 구간은 넘긴 point 사이를 나눠 정확히 그 거리의 시각으로 닫는다. 목표 시간은 달린 거리 비율만큼 나눈 시간과 비교(400m 1:30이면 200m에서 45초) | 1초에 3~4m씩 생기는 오차가 구간마다 쌓이지 않게 |
| 소리 · 진동 | 출발 "인터벌 시작. 몸풀기 1킬로미터." → 구간이 끝나면 강한 진동 + "빠르게 끝. 1분 28초. 목표보다 2초 빨라요. 다음, 5번 중 2번째. 천천히 200미터. 최대 1분 30초." → 빠르게 구간(400m · 1분 이상)이 끝나 갈 때 "100미터 남았어요" · "10초 남았어요" → 모두 끝나면 완주 진동 + "인터벌 끝. 수고했어요. 인터벌 기록 저장을 누르면 끝나요." 1km 구간 안내는 끈다(겹치지 않게) | 123.2장 "오디오/진동 Cue는 구간 전환 시", 129장 "화면을 보지 않아도 Step 전환을 이해" |
| 모두 마치면 | "인터벌 완료" + 아래 "인터벌 기록 저장"(코스 완주처럼 확인 없이 저장). 더 달려도 기록은 이어진다 | 끝난 뒤 세 번 눌러야 저장되던 것을 줄임 |
| 자동 일시정지 | 인터벌 달리기는 쓰지 않는다 | 천천히 걷거나 서서 쉬는 구간의 시간도 세야 한다 |
| 중간에 끝내면 | 하던 구간을 "중간에 끝냄"으로 남긴다. 결과 맨 위 "인터벌을 중간에 끝냈어요 · N개 구간을 마쳤어요" | 마지막 구간이 조건대로 끝났는지로 끝까지 했는지 안다 |
| 결과 (WorkoutResult) | 맨 위 "인터벌 완료 · 빠르게 5번 중 3번 목표를 맞췄어요"(목표보다 빠르거나 목표 안이면 맞춤) → 시간 · 거리 → **인터벌 구간**(빠르게 평균 + 구간마다 시간 · 거리 · 페이스 · 목표와 차이) → 지도 → 1km 기록. 기록 상세 · 히스토리 제목은 인터벌 이름 | 123.2장 "각 Step별 실제 시간, 평균 페이스, 목표 대비 차이" |
| 기기 저장 · 이어 달리기 | 구간이 끝날 때마다 경계를 SQLite `local_run.workout_progress`(v2 migration)에 저장. 앱이 꺼졌다 켜지면 저장한 경계부터 이어 간다(직접 넘긴 구간 포함). 서버에 올릴 때 계획의 인터벌 + 경계로 구간 결과를 만든다 | RUN-006 Local First. 오프라인에서 끝내도 구간 결과가 남는다 |
| 서버 | 126장 Workout API + DELETE, Run에 인터벌 id · 버전 · 이름, 구간 결과 (backend README, MOCK-CONTRACT-CHECK 27) | 123.3장 |
| 확인한 것 | 서버 테스트(MySQL · MariaDB 인터벌 3개씩 + 전체 191개). 단위 테스트(구간 풀기 · 문구 · 거리 보간 · 한 번에 여러 구간 · 시간 구간 · 직접 넘기기 · 끝낼 때 · 결과 · 목표 비교 · 검증 · 계획 JSON · 되살리기 · 동기화 요청 · 음성 문장 · 편집 모델 · SQLite v1 → v2). 웹 + 실제 서버: 달리기 탭 진입점 → 목록 → 직접 만들기 · 구간 고치기(800m · 목표 3:05) · 저장 → 서버 값 확인 → 고치기(반복 줄이기 · 마무리 위로, 버전 2) → 잘못된 값 막힘 → 추천 인터벌 달리기 준비. mock 러너 20배속: 400m × 5 끝까지 음성 전부 · 화면 · 결과(3/5 목표), 직접 넘기기 · 중간에 끝냄. 실제 기록 엔진(브라우저 위치 초속 4m) + 서버: 저장한 인터벌로 달려 "다음 구간" → "인터벌 기록 저장" → 서버에 구간 6개(80m 20초 · 천천히 12초 44~48m) · 버전 · 달린 수 · 최근 인터벌 달리기 · 기록 상세. 빈 상태 · 오류 상태 | |
| 확인 못 한 것 | 휴대폰에서 화면을 끈 채(백그라운드) 구간 음성 · 진동, 앱을 강제로 끈 뒤 이어 달리기(웹은 기기 저장소가 메모리라 새로 고치면 사라진다. 되살리기는 단위 테스트로만), 실제 GPS 흔들림에서 짧은 구간(200m) 판정 | 실기기 필요 |
| 같이 고친 것 | 서버 `GlobalExceptionHandlerTest`가 요청 제한 필터(43항) 때문에 컨텍스트를 못 띄우던 것(테스트 slice에서 필터를 뺌). CI `./gradlew build`가 main에서 실패하던 원인 | 전체 테스트 중 발견 |

## 46. 프로필 사진 업로드 (AUTH-002 · SCR-M07)

사용자 결정: 미뤄 둔 프로필 사진 API를 만든다. 저장은 "저장소 경계 + 서버 디스크"(나중에 S3로 바꿀 수 있게).

| 항목 | 판단 | 근거 |
| --- | --- | --- |
| 올리는 곳 | 설정 › 프로필 수정의 사진 고르기 · 바꾸기 · 빼기(화면은 그대로). "저장"을 누르면 새로 고른 사진만 올린다(닉네임과 한 번에). 사진을 바꾸지 않았으면 사진 요청을 보내지 않는다 | 41장 PATCH /users/me (nickname?, profileImage?) |
| 사진 고르기 | 정사각형으로 잘라 고르게 한다(휴대폰 사진 선택기 편집). 서버가 다시 가운데 정사각형 512px로 만든다 | 원 모양 아바타. 어떤 사진이 와도 같은 모양 |
| 틀린 사진 | 서버 문구 + "다른 사진을 골라 주세요"(예: "JPG · PNG 사진만 올릴 수 있어요.", "사진은 5MB까지 올릴 수 있어요."). 닉네임도 바뀌지 않는다 | 이유를 알려 준다 (73장) |
| 개인정보 | 서버가 사진을 다시 만들어 EXIF(촬영 위치 · 기기)를 남기지 않는다 | 16장 위치 개인정보. 프로필 사진은 친구 · 랭킹 · 검색에서 보인다 |
| 보이는 곳 | 마이 · 설정 · 친구 목록 · 친구 검색 · 친구 프로필 (서버가 주는 `profileImageUrl`) | 기존 `Avatar` 그대로 |
| 전에 기기에만 두던 사진 | 쓰지 않는다(서버 사진만). 전에 고른 사진은 다시 골라야 한다 | 기기에만 있던 사진은 다른 사람에게 보이지 않았다 |
| 확인한 것 | 서버 테스트(MySQL · MariaDB 프로필 3개씩: 올리기 · 512px · 캐시 · 다른 사람 프로필 · 닉네임과 함께 · 옛 파일 지움 · 틀린 사진이면 닉네임 그대로 · 남의 닉네임 409 · JSON 그대로 · 빼기 · 로그인 · 폴더 밖 경로 · 탈퇴하면 지움, 사진 다시 만들기 4개: 자르기 · 투명 PNG · EXIF 회전 6 · 8과 EXIF 없음 · 틀린 파일) + 전체 201개. 웹 + 실제 서버: GIF 고르기 → 문구, 1200×800 JPEG 고르기 → 저장 → 서버 주소 · 512px JPEG · EXIF 없음 → 설정 · 마이 사진, 다른 사람 검색에 사진 주소, 빼기 → 옛 파일 404, 6MB → 413 문구 | |
| 확인 못 한 것 | 아이폰 · 안드로이드 사진 선택기에서 고른 사진(HEIC 사진이 JPEG로 바뀌어 오는지), 휴대폰에서 노트북 IP 서버로 올린 사진 주소 | 실기기 필요 |
| 추가 작업 | 이미지 저장소를 Cloudflare R2로 바꾼다(사용자 결정). 이미지 작업은 나중에 따로 한다. 앱은 서버가 주는 주소를 그대로 쓰므로 바뀌지 않는다 | MOCK-CONTRACT-CHECK 12항 28번 |

## 47. 외부 기록 가져오기 (122장 External Activity Integration)

사용자 결정: 외부 기록 가져오기부터 하고, 다음 브랜치에서 Apple Watch와 실시간으로 잇는다("앱에서 시작누르면 워치에서도 보여야해"). Apple Watch를 먼저 한다. 폰이 기록하고 워치는 표시 · 조작 · 심박을 맡는다. 실기기 확인은 코드와 확인 방법 문서로 한다.

| 항목 | 판단 | 근거 |
| --- | --- | --- |
| 이번 범위 | Apple 건강(HealthKit)에서 달리기 읽기 → 서버로 가져오기 → 코스 매칭 · 검증 → Source Badge. Health Connect(안드로이드)는 서버 · 앱 경계만 두고 읽는 쪽은 만들지 않았다 | 122.1장 1.5차는 Apple Health · Health Connect. 사용자가 Apple Watch를 먼저 골랐다 |
| 건강 앱 읽기 | 로컬 Expo 모듈 `modules/dallimo-health`(Swift). 달리기 운동 목록 · 운동 경로(HKWorkoutRoute) · 거리만 읽고 쓰지 않는다. 앱 쪽 경계는 `HealthProvider`(연결 · 목록 · 경로) | 122.2장 Provider Adapter. 나중에 Garmin · COROS를 더해도 화면은 그대로 |
| 개발 중 확인 | 웹 · 개발 빌드에서 HealthKit이 없으면 가짜 건강 앱(오늘 아침 실내 5km · 어제 동네 한 바퀴 · 이틀 전 수성못 둘레길). 개발용 `?health=empty · unavailable · denied`. 배포 빌드의 웹 · 안드로이드는 "Apple 건강은 아이폰에서 쓸 수 있어요" | 실기기 없이 화면 · 서버 흐름을 끝까지 보려고 |
| 들어가는 곳 | 설정 › 외부 기록 › Apple 건강(연결됐으면 "연결됨"). 연결한 뒤 새 기록이 있으면 마이에 "새 러닝 기록 N개를 발견했어요" | 122.3장 Integration Settings · "새 러닝 기록 N개를 발견했어요". 탐색 · 달리기 탭은 그대로 |
| 연동 설정 | Apple 건강 카드: 연결 전 "연결하기"(건강 앱 권한 창) + "달리기 운동 · 경로 · 거리만 읽어요. 건강 앱에 아무것도 쓰지 않아요.", 연결 뒤 "연결됨 · 가져온 기록 N개 · 마지막 날짜" + "연결 해제". 권한을 거절하면 건강 앱에서 켜는 방법 | 122.3장 "연결 상태, 권한, 마지막 동기화". HealthKit은 읽기 거절을 앱에 알려 주지 않아서 빈 목록일 때도 같은 안내를 둔다 |
| 가져오기 후보 | 최근 30일 50개. 줄마다 체크 · 경로 모양(실내면 "실내") · 날짜 · 기기 · 거리 · 시간 · 페이스. 처음엔 모두 골라져 있다. 지난번 실패한 기록은 사유와 함께 다시 보인다. 가져온 기록 · 겹친 기록은 빠진다 | 122.3장 Import Candidates. 30일 · 50개는 명세에 값이 없어 정한 시작값 |
| 가져오기 결과 | 하나씩 보낸다. "수성못 둘레길과 97% 일치 · 인증 확인 중"(2초마다 다시 읽어 "코스 기록 인증 · PB" / "공식 기록으로 인증되지 않았어요"), "러닝 기록으로 저장했어요", "이미 달리모로 기록한 러닝이에요", "가져오지 못했어요 · 사유"(다시 시도). 누르면 기록 상세 | 122.3장 Import Result. 매칭 코스 · 검증 상태를 바로 보여준다 |
| 공식 기록 | 가져온 기록은 먼저 러닝 기록이다. 서버가 경로를 미리 검증해 인증되는 코스가 있을 때만 코스를 잇고 보통 검증을 거친다. 기준은 달리모 기록보다 엄하다(따라 달린 비율 90%, point 간격 5초 이하) | FEATURE-FEEDBACK 1항 "가져왔다는 이유만으로 공식 기록을 만들지 않는다", 122.1장 "추가 검증 후 가능" |
| 달리모 기록과 겹침 | 같은 시간에 달리모로 기록한 러닝이 있으면 새로 만들지 않는다. 달리모가 건강 앱에 남긴 운동(`DallimoClientRunUuid`)은 후보에서 먼저 뺀다(달리모가 운동을 쓰는 건 워치 브랜치에서) | 122.2장 Merge Candidate. 워치로 함께 기록해도 두 번 쌓이지 않게 |
| Source Badge | 히스토리 줄 · 기록 상세에 "Apple Watch에서 가져옴"(기기를 모르면 "Apple 건강에서 가져옴") | 122.3장 Source Badge. 색이 아니라 아이콘 + 글자 |
| 서버 | `POST /imported-activities/check` · `/{externalId}/import`, `GET /integrations`, Run source 필드, 가져오기 기록부 (backend README, MOCK-CONTRACT-CHECK 3.2 · 12항 29번) | 126장 |
| 확인한 것 | 서버 테스트(MySQL · MariaDB 가져오기 3개씩 + 전체 207개). 단위 테스트(배지 문구 · 가짜 건강 앱 목록 · 경로 · 상황). `expo-modules-autolinking`에 `DallimoHealthModule` 연결. 웹 + 실제 서버: 설정 → 연결하기 → 후보 3개(실내 · 동네 · 수성못) → 하나 빼면 "2개 가져오기" → 3개 가져오기 → 수성못 둘레길 100% 일치 · 코스 기록 인증 · PB(서버 VERIFIED, 정책 `2026-09-imp-v1`) · 나머지 둘은 자유 러닝 → 다시 열면 "새 러닝 기록이 없어요 · 이미 가져온 기록 3개" → 히스토리 · 상세 배지. 마이 배너 → 가져오기 화면. 쓸 수 없음 · 권한 거절 · 빈 목록 | |
| 확인 못 한 것 | 아이폰에서 HealthKit 권한 창 · 실제 워치 운동 · 경로 읽기 · 빌드 서명(`docs/test/health-import.md` 순서대로 확인) | 실기기 필요 |
| 다음 | `feat/watch-companion`: 워치 앱(SwiftUI) · WatchConnectivity. 폰에서 시작하면 워치 앱이 켜지고 거리 · 시간 · 페이스를 실시간으로 보여 준다. 워치에서 일시정지 · 끝내기 · 다음 구간, 심박을 폰으로 | 사용자 결정 |

## 48. Apple Watch 연결 (WATCH-001~004)

사용자 결정: "워치랑 실시간으로 연동이 되어야하고 앱에서 시작누르면 워치에서도 보여야해". Apple Watch를 먼저 한다. 휴대폰이 기록하고 워치는 보여 주기 · 조작 · 심박을 맡는다. 실기기 확인은 코드와 확인 방법 문서로 한다.

| 항목 | 판단 | 근거 |
| --- | --- | --- |
| 역할 나누기 | 기록(GPS · 거리 · 서버 동기화 · 검증)은 지금처럼 휴대폰 엔진 하나. 워치는 휴대폰이 보낸 상태를 보여 주고 조작 · 심박만 보낸다 | 기록이 두 곳에서 생기면 거리 · 시간이 어긋나고 검증 · 동기화가 두 벌이 된다. 명세 5장 WATCH는 P2라 워치 단독 기록은 뒤로 |
| 워치 앱 | `targets/watch`(SwiftUI, watchOS 10). `@bacons/apple-targets`가 prebuild 때 워치 타깃을 만든다(휴대폰 앱에 들어간다). 번들 id는 휴대폰 id + `.watchkitapp` | Expo 관리 방식(CNG)을 그대로 쓴다. `ios/`를 저장소에 두지 않는다 |
| 휴대폰 쪽 | 로컬 모듈 `modules/dallimo-watch`(WatchConnectivity · `startWatchApp`). 앱 쪽 경계 `watchTransport`. 웹 개발에서는 가짜 워치(`window.__dallimoWatch`로 보낸 메시지 · 명령) | 외부 기록 가져오기(47항)와 같은 방식 |
| 시작하면 워치에 | 카운트다운을 시작할 때 HealthKit `startWatchApp`으로 워치 앱을 켠다. 워치는 운동 세션을 시작하고(손목을 내려도 달리모 화면) 3 · 2 · 1 · 출발을 햅틱과 함께 보여 준다. 이어 달리기 · 함께 달리기는 기록을 시작할 때 켠다 | 사용자 요청. 워치 앱을 먼저 켜 둘 필요가 없다 |
| 실시간 | 휴대폰이 1초마다(그리고 point가 올 때) 지금 상태를 보낸다: 상태 · 제목 · 거리 · 달린 시간 · 평균 페이스 · 상태 안내(짧게) · 모드별 한 줄 · 할 수 있는 조작. 워치는 받은 문구를 그대로 보여 주고 시간만 스스로 센다. 상태가 바뀌면 마지막 상태로도 남겨 워치 앱이 나중에 켜져도 안다 | 문구 · 계산을 휴대폰 한 곳에 둬서 휴대폰 화면과 같은 값을 보여 준다(메시지 모양 `watchMessages.ts` v1) |
| 워치 화면 | 오른쪽(기본): 상태 · 시간 · 거리(가장 크게) · 페이스 · 심박 · 모드별 한 줄. 왼쪽: 일시정지/계속 · 끝내기(확인) · 다음 구간(직접 넘기는 구간만) · 완주 기록 저장(확인 없음) | CLAUDE.md 6항 1초에 읽히는 2~4개 지표. Apple 운동 앱과 같은 좌우 페이지 |
| 모드별 한 줄 | 자유: 현재 페이스, 코스: 진행 % · 남은 거리, PB · 도전: "목표 0:05 빨라요" · "민수님 기록 0:03 느려요", 인터벌: "빠르게 2/5 · 3/12 · 120m 남음", 함께 달리기: "4명 중 2위 · 선두와 12초 차이" | 휴대폰 ModeStrip · IntervalPanel · 함께 달리기와 같은 계산 (WATCH-002 · 003) |
| 워치 조작 | 일시정지 · 계속 · 다음 구간은 휴대폰 버튼과 같은 동작(햅틱 포함). 끝내기는 워치에서 확인하고 휴대폰이 바로 저장한다. 함께 달리기는 "그만두기"(중도 포기). 휴대폰과 바로 연결되지 않으면 보내지 않고 "휴대폰과 연결이 끊겼어요" | 늦게 도착한 "끝내기"가 엉뚱한 때 기록을 끝내지 않게 줄 세워 보내지 않는다 |
| 햅틱 (WATCH-004) | 휴대폰 햅틱이 울릴 때 워치도(출발 · 일시정지 · 경고 · 인터벌 구간 · 완주 · 순위 변화) + 1km마다. 설정 › 진동을 끄면 워치도 울리지 않는다 | 손목에서 화면 없이 알 수 있게 (69장) |
| 심박 | 워치 운동 세션이 잰 심박을 5초마다 휴대폰으로. 러닝 화면 위쪽 GPS 옆에 ♥ 심박(15초 넘게 새 값이 없으면 숨김). 기록 · 서버에는 아직 남기지 않는다 | 사용자 결정 "심박을 폰으로". 심박 목표(HR Zone)는 명세 123.2장 "후속" |
| 건강 앱 | 워치 운동은 휴대폰이 저장하면 건강 앱에 운동으로 남기고 `DallimoClientRunUuid`를 붙인다(활동 링 반영). 취소하면 버린다. 외부 기록 가져오기 후보에서는 빠진다 | 47항 겹침 방지 |
| 설정 | 설정 › Apple Watch › "워치에 러닝 보여주기"(기본 켬) + 연결 상태(워치 없음 · 앱 없음 · 연결됨). 아이폰에서만 보인다 | 끌 수 있어야 한다 |
| 번들 id | `app.config.ts`: 번들 id가 없으면 개발용 `com.dallimo.dev`, 서명 팀은 `APPLE_TEAM_ID` | 워치 타깃은 휴대폰 번들 id가 있어야 만들어진다. 배포 id는 배포 단계(43항) |
| 확인한 것 | 단위 테스트(메시지 · 모드별 한 줄 · 인터벌 직접 넘기기 · plist 값). `expo prebuild`로 워치 타깃(번들 id · watchOS 10 · HealthKit entitlement · Embed Watch Content) · 두 로컬 모듈 연결. Swift 구문 검사(모든 파일) + 워치 연결 · 운동 코드 형식 검사(프레임워크 흉내). 웹 + 가짜 워치: 카운트다운 3 · 2 · 1 · 0 + 워치 앱 켜기 → 1초마다 상태 → 워치 일시정지 · 계속 → 심박 152 휴대폰 표시 → 1km 햅틱 → 워치 끝내기 → 요약 · 결과 화면. 인터벌 다음 구간, PB "목표 0:01 빨라요", 함께 달리기 "4명 중 2위" · 그만두기, 워치 없음 · 취소 · 설정 끄기 | |
| 확인 못 한 것 | 실제 워치 빌드 · 서명, 워치 화면 · 햅틱, 화면을 끈 휴대폰과의 전달, 심박 · 건강 앱 운동 (`docs/test/watch.md` 순서대로) | 실기기 · Xcode 필요 |

## 49. 코스 크라운 · 로컬 레전드 (124장 게임화 2차)

사용자 결정: 남은 기능을 차례로 만든다("다음꺼"). 2차 게임화는 실기기 없이 만들 수 있는 Course Crown · Local Legend부터 한다(다음은 Segment Attack → Ghost).

| 항목 | 판단 | 근거 |
| --- | --- | --- |
| 뜻 | 코스 크라운: 최근 90일 가장 빠른 인증 기록. 로컬 레전드: 최근 90일 가장 많이 인증 완주한 사람(2번 이상). 두 타이틀을 나눠 보여 준다 | 124장 "Course Crown과 Local Legend는 합치지 않는다. 하나는 기록, 하나는 반복 참여를 보상" |
| 기간 · 최소 횟수 · 같은 값 | 90일, 레전드 2번 이상, 같으면 먼저 세운(채운) 사람 | 명세에 값이 없어 정한 시작값 (backend README 결정 사항) |
| 코스 상세 | 경쟁 카드 아래 "코스 타이틀" 섹션: 크라운 줄(왕관 · 가진 사람 · 기록) + 레전드 줄(불꽃 · 가진 사람 · 완주 수), 아래에 내 상태 한 줄("크라운까지 0:45", "나는 1번 · 3번 더 완주하면 레전드", "지금 크라운이에요"). 아직 없으면 "아직 없어요 · 90일 안 첫 인증 기록이 크라운이 돼요" | 127장 CourseCrownBadge · LocalLegendRow. "내가 왜 달려야 하는지"를 한 번 더 (61.1장) |
| 랭킹 | 내 순위 카드 아래 같은 타이틀 카드. 순위 줄 이름 옆에 왕관 · 불꽃 아이콘(스크린 리더는 "코스 크라운 · 로컬 레전드") | 89장 podium은 과장하지 않는다. 금색 · 반짝임 없이 아이콘 하나 |
| 결과 | 이 기록으로 새로 가졌으면 경쟁 카드에 "코스 크라운 · 차지했어요", "로컬 레전드 · 2번째 완주로 레전드" | 63.1장 Finish 감정 피드백. 이미 가진 사람이 다시 달리면 보이지 않는다 |
| 활동 | 친구 피드에 "민수님이 코스 크라운을 차지했어요 · 수성못 둘레길 · 9:58", "지수님이 로컬 레전드가 됐어요 · 90일 동안 9번 완주" | ACT 행동형 피드. Push는 보내지 않는다(알림은 꼭 필요한 것만, 사용자 결정) |
| 안전 · 개인정보 | 검증된 기록만 센다. 다른 사람의 위치는 보여 주지 않는다. 빠르기만이 아니라 자주 달리기(레전드)도 보상한다 | 124장 "위험한 속도 경쟁을 유도하지 않게", 129장 |
| 서버 | `GET /courses/{id}/crown` · `/local-legend`, 러닝 상세 `crownTaken · legendTaken`, 활동 `CROWN · LEGEND` (backend README, MOCK-CONTRACT-CHECK 4항 · 12항 31번) | 126장 Gamification "Crown/Legend 집계" |
| 확인한 것 | 서버 테스트(MySQL · MariaDB 타이틀 3개씩 + 활동 테스트 기대값 갱신, 전체 213개 통과). 웹 + 실제 서버: 새 코스에 라이벌 약 225초 → 내 첫 기록 299초(없음) → 2번째 완주 "로컬 레전드 · 2번째 완주로 레전드" → 179초 "코스 크라운 · 차지했어요". 코스 상세(나: "지금 크라운이에요 · 지금 로컬 레전드예요", 라이벌: "크라운까지 0:45 · 나는 1번 · 3번 더 완주하면 레전드", 기록 없는 코스), 랭킹 줄 왕관 · 불꽃과 읽는 이름, 활동 피드 | |
| 확인 못 한 것 | 아이폰 · 안드로이드에서 왕관 · 불꽃 아이콘 모양(SF Symbols `crown.fill` · `flame.fill`, Material `crown` · `local_fire_department`) | 실기기 |
| 같이 발견한 것 | 러닝 상세의 주간 순위 변화(RST-003)는 "그 주 전체" 최고 기록으로 계산해, 같은 주에 더 빠른 기록을 나중에 세우면 예전 결과 화면의 순위가 바뀐다(예: "1위 → 1위"). 이번 범위가 아니라 고치지 않았다 | 크라운 · 레전드는 기록한 순간까지로 계산해 이 문제가 없다 |

## 50. 코스 구간 도전 (124장 Segment Attack)

사용자 결정: 구간은 서버가 자동으로 나눈다(코스 주인이 정하지 않는다). 49항 다음 순서.

| 항목 | 판단 | 근거 |
| --- | --- | --- |
| 구간 | 코스를 약 1km씩 같은 길이로 나눈다(구간 수 = 길이 km 반올림). 1.5km 미만 코스는 구간이 없다(코스 기록이 곧 구간 기록) | 사용자 결정. 기존 코스에도 바로 생기고 편집 화면이 필요 없다 |
| 달리는 중 | 코스 러닝(코스 · PB · 도전)에서 구간에 들어서면 지표 아래 한 줄 배너 "구간 1 도전 · 1/2 · 0:09 빨라요 · 내 최고 5:30 · 900m 남음". 목표는 내 구간 최고, 없으면 구간 1위. 구간이 끝나면 12초 동안 "구간 1 기록 4:57 · 내 최고보다 0:33 빨라요". 음성 "구간 1 시작, 2개 중 1번째. 내 최고 5분 30초." · "구간 1 끝. 4분 57초. 내 최고보다 33초 빨라요." + 강한 진동(워치도) | 127장 SegmentAttackBanner. CLAUDE.md 6항 한눈에 · 음성 · 진동. 경쟁 안내 설정(AUD-002)을 끄면 읽지 않는다 |
| 비교하지 않는 경우 | 구간 한가운데서 시작(이어 달리기)하거나 신호가 끊겨 구간을 건너뛰면 그 구간은 "비교 없음" | 처음부터 재지 못한 시간과 비교하면 틀린 말이 된다 |
| 워치 | 그냥 코스 러닝이면 워치 한 줄이 구간 도전이 된다. PB · 도전은 목표 차이가 먼저 | 48항 워치 한 줄 |
| 공식 구간 기록 | 서버가 인증 뒤 GPS point로 다시 잰다(일시정지 제외). 결과 · 기록 상세 "코스 구간 도전": 구간마다 기록 · "구간 PB · 2:00 단축" · "구간 1위" / "2위 · 1위와 0:45" | 앱이 잰 값은 달리는 중 비교용. 공식 기록과 같은 기준 |
| 코스 상세 | 코스 타이틀 아래 "코스 구간 도전": 구간마다 범위 · 기록한 사람 수 · 1위 · 내 최고 · 1위까지 | "내가 왜 달려야 하는지" (61.1장) |
| 이름 | 1km 스플릿 제목을 "구간 기록" → "1km 기록"으로 바꿨다. 새 기능은 "코스 구간 도전", 각 구간은 "구간 1" | 두 가지가 같은 이름이면 헷갈린다 |
| 서버 | `GET /courses/{id}/segments`, 러닝 상세 `verification.segments`, V14 `tbl_course_segment_record` (backend README, MOCK-CONTRACT-CHECK 4항 · 12항 32번) | 126장 "Segment result" |
| 확인한 것 | 서버 테스트(구간 기록 재기 7개 + MySQL · MariaDB 구간 API 2개씩, 전체 224개). 단위 테스트(구간 따라가기 · 이어 달리기 · 건너뛰기 · 목표 차이 · 음성 문장 · 배너 한 줄). 웹 + 실제 서버: 수성못(1.9km → 구간 2개)에 내 구간 기록을 넣어 두고 mock 러너 10배속 → 배너 "구간 1 도전 · 0:09 빨라요" → "구간 1 기록 4:57 · 내 최고보다 0:33 빨라요" → 구간 2 → 음성 4문장. 직선 1.8km 코스에 실제 검증 러닝 3번 → 결과 "구간 PB · 2:00 단축 · 구간 1위", 코스 상세 구간 목록 | |
| 확인 못 한 것 | 실제 GPS 흔들림 · 루프 코스에서 휴대폰 구간 판정과 서버 구간 기록의 차이, 구간이 짧게 반복되는 코스(트랙) | 실기기 |
| 뒤로 미룬 것 | 이 기능 전에 인증된 러닝의 구간 기록(다시 계산하지 않음), 구간별 전체 순위 화면 | 필요하면 따로 |

## 51. 고스트 (124장 Ghost / Pace Chase)

사용자 결정: 남은 2차 게임화를 이어서 한다(50항 다음). 16항에서 미뤄 둔 "구간 기록 기반 Ghost"를 만든다.

| 항목 | 판단 | 근거 |
| --- | --- | --- |
| 무엇과 비교하나 | PB 어택은 내 최고 공식 기록, 도전은 도전 대상 기록의 실제 흐름(코스 어디를 몇 초에 지났는지)과 비교한다. 받기 전 · 오프라인 · 기록 point가 없으면 예전처럼 목표를 고르게 나눈 페이스 | 124장 "내 PB 또는 다른 러너의 기록을 가상 상대처럼". 앞은 빠르고 뒤는 느린 기록이면 고르게 나눈 비교는 틀린 말을 한다 |
| 화면 | PB · 도전 한 줄의 "목표" → "고스트보다 빠름/느림 +1:16", 아래 "고스트보다 315m 뒤"(거리 차이). 지도 보기에 코스 선 위 고스트(속이 빈 점선 원, 내 위치는 속이 찬 흰 점) | 127장 GhostGapIndicator. 색이 아니라 모양으로 구분 (CLAUDE.md 8항: 기준 · 실제 · 목표 경로 구분) |
| 음성 · 워치 | 경쟁 안내(앞섬 · 뒤처짐, 1km 안내 끝 목표 차이)와 워치 한 줄("고스트 0:17 느려요")이 같은 고스트 비교를 쓴다 | 보이는 값 · 들리는 값 · 손목 값이 같아야 한다 |
| 개인정보 | 서버는 GPS 좌표를 주지 않고 "코스 위 거리 → 걸린 초"만 준다. 고스트 자리는 앱이 코스 선 위에 계산한다. 공식 기록(랭킹에 보이는 기록)만 쓴다 | 129장 "상대의 정확한 실시간 위치를 노출하지 않고도 경쟁 상황을 이해" |
| 서버 | `GET /courses/{id}/ghost?recordId=` (없으면 내 PB), 구간 기록과 같은 코스 위 투영 (backend README, MOCK-CONTRACT-CHECK 4항 · 12항 33번) | 126장 표에 경로가 없어 정했다 |
| 확인한 것 | 서버 테스트(고스트 줄이기 3개 + MySQL · MariaDB 고스트 API, 전체 229개). 단위 테스트(고스트 초 · 자리 · 고르게 나눈 비교와 다른 값 · 거리 차이 · 코스 길이 차이). 웹 + 실제 서버: 앞 900m를 초속 5m, 뒤를 초속 2.5m로 달린 내 PB(539초)를 고스트로 PB 어택 10배속 → "고스트보다 76m 뒤 → 315m 뒤 → 191m 뒤"(고스트가 빠른 앞에서 벌어지고 뒤에서 줄어듦), 워치 "고스트 0:17 느려요", 지도에 고스트 원 | |
| 확인 못 한 것 | 휴대폰 애플 지도에서 고스트 점 모양, 실제 GPS로 달릴 때 고스트 차이가 흔들리는 정도 | 실기기 |

## 52. 외부 공개 데이터로 만든 추천 코스

사용자 결정: 코스 추천에 OpenStreetMap(Overpass)과 무료 공개 API를 연결한다. 명세 2.1장이 MVP에서 뺀 "전국 자동 코스 생성"을 외부 데이터 가져오기로 넣는다.

| 항목 | 판단 | 근거 |
| --- | --- | --- |
| 가져오는 곳 | OpenStreetMap(Overpass, 달리기 · 걷기 route relation과 이름 있는 둘레길), 한국관광공사 두루누비(걷기길 GPX, 길 이름 · 순환형은 태그로), 관리자가 올린 GPX(등산 · 트레킹 숲길 등). 고도가 없으면 Open-Meteo 고도(기본 끔) | 경로 좌표를 주는 무료 데이터. 좌표가 없는 데이터(전국길관광정보, 서울둘레길, 대구 산책로)는 코스를 만들 수 없어 연결하지 않았다. Strava는 경쟁 앱 이용 금지 |
| 어떻게 넣나 | 관리 API(`X-Admin-Key`)로 박스 · 목록 단위로 가져오고, 설정하면 주기 실행. 앱은 부르지 않는다 | 공용 Overpass 서버와 공공데이터포털 하루 호출 제한 때문에 요청마다 부르지 않는다 |
| 코스로 만드는 기준 | 1km~21.1km만, 10m 간격으로 다시 찍기, 같은 원본은 한 번, 출발점 100m · 길이 10% 안에 비슷한 코스가 있으면 건너뜀 | 달리기 코스로 쓰기 어려운 종주길 · 트랙을 빼고, 같은 둘레길이 OSM · 두루누비 · 사용자 코스로 겹치지 않게 |
| 앱 화면 | 코스 상세 위 줄 "새 코스" 대신 "달리모 추천", "만든 사람" 대신 "출처 © OpenStreetMap contributors · ODbL 1.0"(누르면 원본). 탐색 목록 · 추천 카드는 기존 그대로(주변 코스로 함께 나온다) | ODbL 출처 표시 의무. 코스가 중심이라는 원칙(CLAUDE.md 2항)은 그대로 |
| 서버 | V15 코스 출처 컬럼, 상세 `source`, 관리 API (backend README "외부 추천 코스", MOCK-CONTRACT-CHECK 4항 · 12항 34번) | |
| 확인한 것 | 서버 테스트(파서 10개 · 두루누비 클라이언트 2개 + MySQL · MariaDB 가져오기 API, 전체 243개). 실제 두루누비(사용자 인증키, 개발계정): 걷기길 코스 139개 중 129개를 코스로 만듦(21.1km 초과 9개 · 중복 1개 제외), 길 이름 태그 · 설명 · 난이도 · 지역 · 고도(GPX ele) 확인. 처음에는 트랙이 두 개인 GPX 14개를 이어 붙여 길이 기준에서 떨어졌다 → 떨어진 트랙을 따로 두고 목록 길이에 맞는 트랙을 고르게 고침. 웹 mock: 대구스타디움 루프 상세 "달리모 추천" · 출처 줄 · 원본 열기(375 · 412), 사용자 코스는 "만든 사람". 웹 + 실제 서버: 가짜 Overpass로 relation(1.8km) · 둘레길(1.4km)을 가져오고 GPX 1개를 올려 상세에서 출처 · 원본 주소 확인, 시스템 사용자는 로컬 seed의 "달리모"를 다시 씀 | |
| 확인 못 한 것 | 실제 Overpass 응답(이 개발 환경에서 서버에 닿지 않는다). 받은 코스가 실제로 달리기 좋은지는 가져온 뒤 사람이 보고 숨긴다 | 배포 환경에서 OSM 박스로 확인 |
| 두루누비 연결 기준 | 사용자가 준 한국관광공사 TourAPI 활용매뉴얼(두루누비) v4.1 · 활용신청방법 매뉴얼 v3.3을 따랐다. 요청 값(`brdDiv` · `MobileOS` · `MobileApp` · `_type`), 응답 항목(`crsContents` · `crsCycle` · `routeIdx` → `routeList`의 길 이름), XML로만 오는 포털 오류 코드 | 매뉴얼 |
| 운영 전에 할 일 | 두루누비 운영계정 신청(한국관광공사 승인 1~3일, 활용기간 24개월). 경로를 저장해 보여 주는 이용을 활용 목적에 적어 승인받는다. OSM 경로를 대량으로 내보내게 되면 ODbL로 제공 | 라이선스 · 매뉴얼 |

## 53. 코스 신고 처리 (자동 숨김 + 관리자 검토)

사용자 결정: 명세 20.2장 오픈 이슈 "코스 공개 정책"에서 신고 처리 방식을 "신고가 쌓이면 자동 숨김 + 관리자 검토"로 정한다. 등록 즉시 공개는 그대로다.

| 항목 | 판단 | 근거 |
| --- | --- | --- |
| 자동 숨김 | 만든 사람이 아닌 서로 다른 사람의 열린 신고가 3건이면 `HIDDEN`. 목록 · 검색에서 빠지고 상세는 "볼 수 없는 코스예요"(기존 hidden 상태 화면) | 사용자 결정. 3건은 명세에 없어 정한 시작값(`COURSE_AUTO_HIDE_REPORTS`). 한 사람이 여러 번 신고해도 한 건 |
| 관리자 검토 | 관리 API로 검토 대기 목록(숨긴 코스 · 열린 신고) · 신고 내용 · 처리 기록을 보고 숨김 · 차단 · 다시 공개. 검토하면 그때까지의 신고는 닫히고, 그 뒤 신고부터 다시 센다 | 잘못 숨겨진 코스를 되돌릴 수 있어야 한다. 외부 추천 코스(52항)도 같은 방법으로 숨긴다 |
| 만든 사람 | 내 코스에 "신고로 숨김 · 검토 중" · "공개 중지". 알림은 보내지 않는다 | 명세 NTF 종류에 코스 숨김 알림이 없다 |
| 관리 키 | 외부 추천 코스와 같은 키 하나(`ADMIN_API_KEY`, 예전 `EXTERNAL_COURSE_ADMIN_KEY`도 받음) | 운영 API가 늘어도 키 하나 |
| 서버 | V16 `tbl_course.moderated_at` · `tbl_course_moderation`, `/api/v1/admin/courses/*` (backend README "코스 신고 처리", MOCK-CONTRACT-CHECK 4항 · 12항 35번) | |
| 확인한 것 | 서버 테스트(MySQL · MariaDB 신고 처리 API, 전체 245개). 웹 + 실제 서버: 세 사람이 신고 → 검토 대기 목록에 숨김 · 열린 신고 3건 · 사유별 수, 만든 사람 내 코스 "신고로 숨김 · 검토 중", 상세 "볼 수 없는 코스예요" → 관리자 다시 공개 → 내 코스 "새 코스", 상세 다시 보임 | |
| 뒤로 미룬 것 | 관리자 화면(지금은 API만), 신고한 사람의 신뢰도 반영, 숨김 알림 | 운영 규모가 생기면 |

## 54. 최근 검색 (SCR-E02)

SCR-E02 지역 검색의 주요 요소 "최근 검색"을 넣는다. 탐색 화면의 검색창(CRS-003)에 붙인다.

| 항목 | 판단 | 근거 |
| --- | --- | --- |
| 언제 보이나 | 검색창을 열고 검색어가 비어 있을 때, 검색창 바로 아래 지도 위 카드로 "최근 검색" · 전체 지우기, 줄마다 다시 검색 · 지우기 | 지도를 덮지 않게 검색하려는 순간에만. 지도 영역을 넘으면 카드 안에서 스크롤 |
| 언제 남기나 | 키보드 검색 키를 누르거나, 검색 결과에서 코스를 열었을 때. 입력 중 글자는 남기지 않는다 | 실제로 찾은 검색어만 |
| 규칙 | 최근 것부터 10개. 같은 검색어(대소문자 · 띄어쓰기 무시)는 하나. 다시 검색하면 맨 위로 | 명세에 개수가 없어 정한 시작값 |
| 어디에 두나 | 기기에만(`shared/recentSearches.ts`, 설정과 같은 저장소). 서버에 보내지 않는다. 로그아웃 · 탈퇴하면 지운다 | 같은 기기를 다른 사람이 쓸 수 있다. 검색 기록은 개인정보라 최소로 |
| 확인한 것 | 단위 테스트(순서 · 중복 · 빈 검색어 · 10개). 웹 mock 375 · 412: 검색 키 → 남음, 결과에서 코스 열기 → 남음, 다시 열면 "수성 · 강변", 누르면 그 검색어로 다시 찾고 맨 위로, 새로고침 뒤에도 남음, 한 줄 지우기 · 전체 지우기, 로그아웃하면 기기에서 지워짐 | |
| 확인 못 한 것 | 휴대폰 키보드가 올라온 상태에서 카드 높이(지도 영역 기준으로 줄였다) | 실기기 |

## 55. 관측성 (요청 · Run 상관관계 로그)

명세 21.1장 비기능 요구사항 "관측성: Run 생성 → 업로드 → Finish → Verification의 상관관계 추적 가능(request/run correlation log)"과 34장 관측성 키를 넣는다.

| 항목 | 판단 | 근거 |
| --- | --- | --- |
| 요청 id | 앱이 요청마다 `X-Request-Id`(UUID)를 보내고 서버가 응답 헤더로 돌려준다. 없으면 서버가 만든다 | 앱 문의 · 오류와 서버 로그를 맞춰 볼 수 있게 |
| 로그 모양 | 줄마다 `[req=… user=… run=…]`. Run 흐름은 `run.create` → `run.batch` → `run.finish` → `run.verification`, 그 밖에 `push.sent` · `live.connect` · `live.disconnect` | 34장 키(clientRunUuid · serverRunId · batchUuid · fromSeq · toSeq · policyVersion · matchRate · failureReason · 알림 종류 · connectionId) |
| 개인정보 | user는 내부 id만. GPS 좌표 · 닉네임 · 이메일 · 토큰은 남기지 않는다 | 34장 "개인정보와 정밀 위치정보를 관측성 데이터에 과도하게 포함하지 않는다" |
| 비동기 | 커밋 뒤 검증 · Push도 요청 id를 잇는다. 이 과정에서 `@Async`가 작업마다 새 스레드를 만들던 문제(Spring Boot 기본 실행기가 WebSocket 실행기 때문에 만들어지지 않음)를 찾아 크기가 정해진 실행기로 바꿨다 | 스레드가 끝없이 늘 수 있었다 |
| 확인한 것 | 서버 테스트(요청 id 돌려주기 · 새로 만들기, 한 Run의 생성 → Batch → 재전송 → Finish → 비동기 검증 로그가 같은 요청 id · 사용자 · Run, 좌표 없음, 전체 247개). 웹 + 실제 서버: 로그인 · 목록 요청 3개 모두 보낸 id와 응답 헤더 id가 같고 CORS 오류 없음 | |
| 아직 없는 것 | DB 쿼리 시간, Sync 재시도 수(앱만 안다), 메트릭 · 대시보드 | 운영 로그 · 메트릭 수집 방식이 정해지면 |

## 56. API 계약 문서 (OpenAPI)

명세 57장 "즉시 생성할 실제 산출물"의 API Contract `docs/api/openapi.yaml`을 만든다. 사용자 결정: 남은 작업 중 이것을 먼저 한다.

| 항목 | 판단 | 근거 |
| --- | --- | --- |
| 만드는 법 | 손으로 쓰지 않고 서버 컨트롤러에서 만든다(springdoc, OpenAPI 3.1) | 명세 41~45장과 달라진 곳이 많다(MOCK-CONTRACT-CHECK 12항). 손으로 쓴 문서는 코드와 금방 어긋난다 |
| 어긋남 확인 | `OpenApiContractTest`가 저장소 문서와 지금 서버를 비교한다. API를 바꾸고 문서를 다시 만들지 않으면 CI가 실패한다 | 계약 문서가 실제와 같다는 것을 보장 |
| 모양 | `/api/**`만, 명세 장 이름으로 묶음(예: "Run (42장)"), 인증 방식은 보안 설정의 공개 API 목록과 같게(공개 · Access Token · 관리 키) | 앱 개발자 · 리뷰어가 명세와 나란히 볼 수 있게 |
| 공개 범위 | 로컬 · 개발 서버에서 `/v3/api-docs`. 운영에서는 끈다 | 운영 서버에 API 목록을 열어 둘 필요가 없다. 저장소 문서를 본다 |
| 없는 것 | 실시간 STOMP 메시지(8장 · 46장)는 OpenAPI로 적을 수 없다. 앱 타입을 이 문서에서 만들지는 않았다 | 필요하면 따로 |
| 확인한 것 | 서버 전체 빌드(테스트 249개). 문서 한 줄을 바꾸면 테스트가 "API가 바뀌었는데 docs/api/openapi.yaml이 그대로예요"로 실패, 되돌리면 통과. 두 번 만들어도 같은 문서 | |

## 57. 배포 DB 접속 · 스키마 자동 생성

사용자 요청: DB 접속과 SQL(스키마)을 자동으로. `ddl-auto`로 바꾸는 것도 검토했지만 사용자 결정으로 Flyway를 유지하고 접속을 자동화한다.

| 항목 | 판단 | 근거 |
| --- | --- | --- |
| 스키마 | Flyway 유지. 서버 시작 때 V1~V16을 자동 적용(이미 그랬다). `ddl-auto`는 `validate` 그대로 | 테이블 29개 중 JPA 엔티티는 5개. `ddl-auto`는 나머지 24개 테이블과 유니크 키 · 인덱스를 만들 수 없다. 명세 22.4장 · ADR-004 |
| 접속 | `DB_HOST` · `DB_PORT` · `DB_NAME` · 계정만 넣으면 서버가 주소를 만든다. DB가 없으면 만든다. `DB_URL`로 통째로 줄 수도 있다 | 배포할 때 넣는 값을 줄인다 |
| 드라이버 | 운영 MariaDB 드라이버를 실행 의존성에 넣었다(전에는 테스트에만 있어 `jdbc:mariadb:` 주소로는 서버가 시작하지 못했다). prod 기본 mariadb, dev 기본 mysql | 15.2장 운영 MariaDB |
| 문자셋 | 마이그레이션 전에 DB 기본 문자셋이 utf8mb4가 아니면 바꾼다. 권한이 없으면 실행할 SQL을 알려 주고 멈춘다 | 서버 기본값이 latin1인 MariaDB면 한글 닉네임 · 코스 이름을 저장하지 못한다 |
| 시간대 · 로그 | DB 세션 UTC. 시작 로그에 DB 비밀번호가 찍히던 Hibernate 로그를 끈다 | 40.4장 UTC. MariaDB 드라이버 주소에 비밀번호가 들어 있다 |
| 확인한 것 | 서버 테스트 251개. latin1 MariaDB 테스트(utf8mb4 테이블 · 한글 저장 · 로그에 비밀번호 없음). prod jar를 빈 MariaDB 11.4에 호스트 · DB 이름 · 계정만 주고 실행 → DB 생성 · 테이블 30개 · 한글 가입 성공 · API 문서 404 · 로그에 비밀번호 없음 | |

## 58. 비밀번호 변경 · 재설정 (Resend 메일 인증 코드)

사용자 요청: 비밀번호를 바꿀 수 있게 하고, 이메일 인증은 Resend로 보낸다. 명세에는 이메일 로그인이 없어서(41장은 소셜 로그인, 30항에서 바꿈) 비밀번호 변경 · 찾기 흐름도 없다. 아래 값은 명세에 없어 정했다.

| 항목 | 판단 | 근거 |
| --- | --- | --- |
| 변경 | 설정 > 계정 > "비밀번호 바꾸기". 지금 비밀번호와 새 비밀번호를 받는다. 이 기기는 로그인이 그대로이고 다른 기기 세션은 끊는다. 바뀌었다는 메일을 보낸다 | 다른 곳에 로그인해 둔 사람이 계속 쓰지 못하게 |
| 재설정 | 로그인 > "비밀번호를 잊었어요" → 이메일 → 6자리 코드 메일 → 코드와 새 비밀번호 → 바꾸고 바로 로그인. 모든 기기 세션을 끊는다 | 앱 안에서 끝낸다. 메일 링크 방식은 웹 페이지 · 딥링크가 따로 필요하다 |
| 코드 | 숫자 6자리, 10분, 5번 틀리면 잠김. 새 코드를 받으면 전 코드는 못 쓰고 한 번 쓰면 끝. DB에는 SHA-256 해시만 둔다(V17 `tbl_password_reset`) | 명세에 값 없음 |
| 요청 제한 | 같은 계정은 60초에 1번 · 1시간에 5번(넘으면 보내지 않고 같은 응답). IP마다 분당 10번(로그인과 같은 규칙). 변경은 사람마다 분당 10번 | 메일 폭탄 · 코드 맞히기 막기 |
| 가입 여부 | 가입하지 않은 이메일도 같은 응답(202) · 같은 화면 | 30항 로그인 실패와 같은 이유 |
| 오류 | 400 `PASSWORD_MISMATCH`(지금 비밀번호가 틀림), 400 `RESET_CODE_INVALID`(코드 틀림 · 만료 · 잠김 · 없는 이메일을 나누지 않음) | 앱은 401을 받으면 로그아웃한다. 그래서 401이 아니라 400 |
| 메일 | Resend API(`RESEND_API_KEY`, 보내는 주소 `MAIL_FROM`). DB 커밋 뒤 비동기로 보내고 실패하면 로그(`mail.failed`)만 남긴다. 로컬 · 테스트는 보내지 않고 로그로 대신한다(`MAIL_PROVIDER=log`). 운영에 키가 없으면 서버는 뜨고 메일만 못 보낸다 | 사용자 결정(Resend). 코드가 운영 로그에 남지 않게 |
| 보내는 주소 | 기본값 `onboarding@resend.dev`는 Resend 계정 본인 메일로만 보낼 수 있다. 실제 사용자에게 보내려면 Resend에서 도메인을 인증하고 `MAIL_FROM`을 그 도메인 주소로 바꾼다 | Resend 제약 |
| 로그 | `password.change` · `password.reset-code` · `password.reset result=` · `mail.sent kind=`. 코드와 비밀번호는 남기지 않는다 | 55항 관측성 |
| 확인한 것 | 서버 테스트 259개(MySQL · MariaDB에서 비밀번호 API 3개씩, Resend 요청 모양 · 거부 2개). 웹 mock 375 · 412와 웹 + 실제 서버(local, 로그 메일): 없는 이메일 → 같은 안내 · 메일 없음, 틀린 코드 → 안내, 약한 비밀번호 → 버튼 꺼짐, 맞는 코드 → 로그인. 설정에서 같은 비밀번호 경고, 틀린 지금 비밀번호 안내, 바꾸기 완료. 옛 비밀번호 로그인 거부, 새 비밀번호 로그인 | |

## 59. 개발 프로필 하나로 (local = dev), 개발 DB는 Docker 없이

사용자 결정: 내 컴퓨터가 곧 개발 서버라 local과 dev 프로필을 나누지 않는다. 개발할 때 Docker를 쓰지 않는다. 명세 15.3장은 local/dev/test/prod 네 가지다.

| 항목 | 판단 | 근거 |
| --- | --- | --- |
| 프로필 | dev(기본) · test · prod. `application-local.yaml`을 `application-dev.yaml`에 합쳤다 | 사용자 결정 |
| dev 값 | DB 주소 · Redis는 localhost 기본값, 환경변수로 바꿀 수 있다. DB 계정은 기본값 없이 환경변수(`DB_USERNAME` · `DB_PASSWORD`)로만 받는다(사용자 결정). 개발용 JWT 키 · 웹 CORS · 개발용 코스 3개 그대로. Push · 메일은 기본 로그(`PUSH_PROVIDER` · `MAIL_PROVIDER`로 바꾼다) | 전 local 동작 유지 |
| DB · Redis | 개발자가 직접 준비하고 계정도 직접 만든다(IntelliJ 등). 서버는 접속 기본값만 둔다(backend README "로컬 실행"). `docker-compose.yml`은 지웠다 | 사용자 결정 |
| 테스트 | `./gradlew test`는 그대로 Testcontainers(Docker)로 MySQL · MariaDB · Redis를 띄운다. CI도 같다 | 명세 15.4장 MySQL · MariaDB 호환 테스트. 개발 서버 실행과는 따로다 |
| 개발용 코스 | `db/seed/dev`로 옮겼다. 파일 이름 `R__local_seed_courses.sql`은 그대로 둔다 | 이름을 바꾸면 이미 적용한 개발 DB에서 Flyway 검증이 실패한다 |

## 60. 메일 발송 · 프로필 사진 뺌

사용자 결정: 메일을 보내지 않고 프로필 사진도 쓰지 않는다. 기능을 통째로 뺀다. 58항의 재설정 부분과 41장의 프로필 사진(`profileImage` · `profileImageUrl`)을 바꾼다.

| 항목 | 판단 | 근거 |
| --- | --- | --- |
| 메일 | Resend 발송(`MailSender` · `ResendMailSender` · `LogMailSender`), 비밀번호 재설정(`/auth/password/reset-code` · `/reset`, 인증 코드), 비밀번호 변경 알림 메일, 오류 코드 `RESET_CODE_INVALID`를 뺐다. 로그인 화면의 "비밀번호를 잊었어요"와 재설정 화면도 뺐다 | 사용자 결정 |
| 비밀번호 변경 | 그대로 둔다(설정 > 계정 > 비밀번호 바꾸기). 이 기기만 남기고 다른 기기 로그아웃. 알림 메일만 없다 | 메일이 필요 없는 기능 |
| 비밀번호를 잊었을 때 | 앱 안에서 되찾을 방법이 없다. 필요하면 운영자가 계정을 정리한다 | 메일 없이는 본인 확인 수단이 없다 |
| 프로필 사진 | 올리기(PATCH multipart) · 빼기(`DELETE /users/me/profile-image`) · 파일 주기(`/files/**`) · 서버 저장(`ImageStorage`)을 뺐다. 응답의 `profileImageUrl`도 뺐다(내 정보 · 친구 · 코스 크라운/레전드). 앱은 닉네임 첫 글자 동그라미만 보인다. `expo-image-picker`와 사진 보관함 권한 문구도 뺐다 | 사용자 결정 |
| DB | V18: V17의 `tbl_password_reset`을 지우고 `tbl_user.profile_image_url` 값을 비운다. 컬럼은 명세 22.4장 DDL이라 남긴다(쓰지 않는다) | 이미 적용한 DB에서 마이그레이션을 지울 수 없다 |
| 설정 | `dallimo.mail.*` · `dallimo.storage.*`, 환경변수 `RESEND_API_KEY` · `MAIL_FROM` · `MAIL_PROVIDER` · `STORAGE_LOCAL_DIR` · `STORAGE_PUBLIC_BASE_URL`을 뺐다. 배포 설정 점검(`DeployConfigCheck`)에서도 뺐다. 관리자 GPX 올리기 때문에 multipart 5MB 제한은 남긴다 | |
| R2 | 이미지 저장소를 R2로 옮기는 추가 작업은 필요 없어졌다(MOCK-CONTRACT-CHECK 12항 28번) | |

## 61. 운영 DB도 MySQL

사용자 결정: 배포 DB를 MySQL로 한다. 명세 15.2장 · ADR-004는 "MySQL 개발 / MariaDB 운영"이다.

| 항목 | 판단 | 근거 |
| --- | --- | --- |
| prod 드라이버 | `application-prod.yaml` 기본 `DB_DRIVER`를 `mysql`로. MariaDB로 띄우려면 `DB_DRIVER=mariadb` | 사용자 결정 |
| 버전 | MySQL 8.4 (개발 · 테스트와 같다) | 버전을 고정해 개발과 운영이 같게 |
| 테스트 | MySQL 8.4 · MariaDB 11.4 이중 테스트는 그대로 둔다. MariaDB 드라이버도 남긴다 | ADR-004 호환성 확인은 계속, 다시 MariaDB로 바꿀 수 있게 |

## 62. 배포 서버 연결 · 운영 Swagger

사용자 요청: 배포한 서버 주소(`https://dallimo.gamjabox.cloud`, gamjabox)를 앱과 서버에 적용하고, Swagger를 만든다. 56항은 운영에서 API 문서를 끄기로 했었다.

| 항목 | 판단 | 근거 |
| --- | --- | --- |
| 앱 서버 주소 | 개발(`npx expo start`)은 `frontend/.env.development`, production 빌드는 `eas.json`의 `EXPO_PUBLIC_API_URL`. 둘 다 배포 서버. 내 컴퓨터 서버나 mock은 `.env.local`로 바꾼다(비우면 mock) | 사용자 요청. `.env.local`이 `.env.development`보다 먼저라 각자 바꿀 수 있다. `gps-poc` 빌드는 그대로 mock |
| App Link 도메인 | production 빌드 `APP_LINK_DOMAIN=dallimo.gamjabox.cloud`, 서버 `SHARE_PUBLIC_BASE_URL=https://dallimo.gamjabox.cloud`(compose) | 둘이 같아야 공유 링크가 앱을 연다(`APP-RELEASE-SETUP` 3장). 앱 id(`APP_LINK_IOS_APP_IDS` 등)는 스토어 등록 뒤 넣는다 |
| Swagger | 운영에서도 `/swagger-ui.html`과 `/v3/api-docs`를 연다. 누구나 볼 수 있다. 호출은 지금처럼 토큰 · 관리 키가 있어야 한다. 입력한 토큰은 새로 고침해도 유지 | 사용자 요청. 56항의 "운영에서 끈다"를 바꾼다. 서버 주소는 `/`라 Swagger가 같은 서버로 보낸다 |
| 운영 CORS | `CORS_ALLOWED_ORIGINS`(쉼표로 여럿). compose는 `http://localhost:8081` | 웹으로 띄운 앱에서 배포 서버를 부를 수 있게. Bearer 토큰 방식이라 쿠키가 없다. 휴대폰 앱은 CORS와 상관없다 |
| 확인한 것 | 서버 전체 빌드 · 테스트. prod jar를 MySQL 8.4 · Redis에 띄워 `/swagger-ui.html` 200, Swagger에서 가입 Try it out → 201, `/` 401. Expo가 개발 모드에서 `.env.development`를 읽고 production 모드에서는 읽지 않음. `tsc` · `expo lint` 통과. 배포 서버 `GET /api/v1/courses/nearby` 200(코스 0개) | |

## 63. 앱 id (번들 ID · 패키지 · Apple 팀)

사용자 결정: iOS 번들 ID와 Android 패키지를 `com.dongseopseo.dallimo`로 한다. Apple 팀 ID는 `Q336TS439T`. 48항의 개발용 `com.dallimo.dev`를 바꾼다.

| 항목 | 판단 | 근거 |
| --- | --- | --- |
| 기본값 | `app.config.ts`의 기본값으로 둔다(`IOS_BUNDLE_ID` · `ANDROID_PACKAGE` · `APPLE_TEAM_ID`로 바꿀 수 있다). 개발 · gps-poc · production 빌드가 모두 같은 id를 쓴다 | 워치 앱 id(`app.json` appExtensions)가 하나라 빌드마다 휴대폰 앱 id가 다르면 워치 서명이 어긋난다 |
| 워치 앱 | `com.dongseopseo.dallimo.watchkitapp` | 휴대폰 앱 id + `.watchkitapp`(48항) |
| Android 패키지 | 늘 넣는다(전에는 App Link 도메인이 있을 때만 넣었다) | 패키지가 없으면 EAS가 빌드 때 묻는다 |
| 서버 App Link | compose에 `APP_LINK_IOS_APP_IDS=Q336TS439T.com.dongseopseo.dallimo`, `APP_LINK_ANDROID_PACKAGE=com.dongseopseo.dallimo`. `APP_LINK_ANDROID_SHA256`은 Play Console에 올린 뒤 넣는다 | 앱 id와 같아야 공유 링크가 앱을 연다 |
| 확인한 것 | `expo config`로 iOS 번들 · 팀 · Android 패키지 · App Link 도메인. `tsc` · `expo lint`. 서버 compose 검증 | 실기기 빌드는 개발이 끝난 뒤 사용자가 한다 |

## 64. 온보딩 (첫 실행 소개 · 러너 정보 · 권한 안내)

사용자 결정: 온보딩을 제대로 만든다. 첫 실행 소개(3장), 가입 직후 러너 정보(평소 거리 · 러닝 경험 · 주로 달리는 시간), 가입 직후 권한 안내를 넣는다. 첫 코스 안내는 넣지 않는다. 명세에는 로그인 · 최초 프로필(SCR-A01~A02) · 위치 권한(LOC-001~002)만 있다. 22항의 "소개 슬라이드는 넣지 않았다"와 Push 권한을 "필요한 순간에만 묻는다"를 바꾼다.

| 항목 | 판단 | 근거 |
| --- | --- | --- |
| 흐름 | 처음 켬: 소개 3장 → 가입 또는 로그인. 가입: 러너 정보(1/2) → 권한 안내(2/2) → 탐색. 로그인(이미 있는 계정)은 소개 · 러너 정보 · 권한 안내를 거치지 않는다 | 사용자 결정 |
| 소개 | `/welcome`, 로그인과 같은 dark. ① 오늘 달릴 코스를 찾아요(코스 지도) ② 지난 기록과 겨뤄요(페이스 + 내 최고 기록보다 빠름) ③ 떨어져 있어도 같이 달려요(함께 달리기 진행). 그림 대신 실제 화면 컴포넌트(CourseMapPreview · MetricBlock · GapIndicator · ParticipantChip)를 그대로 쓴다. 건너뛰기(마지막 장 빼고), 다음, 마지막 장 "가입하고 시작하기" · "이미 계정이 있어요 로그인". 지금 장은 긴 막대 · 나머지는 점(색만으로 구분하지 않음). 동작 줄이기 설정이면 장 넘김 애니메이션 없음 | 1.2장 COURSE · COMPETE · TOGETHER. 5항 장식 그림 금지 |
| 한 번만 | 건너뛰거나 끝까지 보면 기기에 남겨 다시 보이지 않는다. 로그아웃하면 바로 로그인 화면. 이 기능 전에 로그인해 둔 사람은 다음에 로그아웃할 때 한 번 본다 | |
| 러너 정보 | 평소 한 번에 달리는 거리(3km 이하 · 3~5km · 5~10km · 10km 이상), 러닝 경험(이제 시작해요 · 가끔 달려요 · 꾸준히 달려요), 주로 달리는 시간(아침 · 낮 · 저녁 · 밤). 모두 고르지 않아도 되고 다시 누르면 풀린다. 저장에 실패해도 건너뛸 수 있다. 설정 > 러너 정보에서 바꾼다 | 사용자 결정 |
| 서버 | V19 `tbl_user.runner_distance · runner_experience · runner_time`(VARCHAR(20), NULL), `PUT /users/me/runner-profile`(통째로 바꿈, 모르는 값 400), `GET /users/me`의 `runnerProfile`. 탈퇴하면 지운다. 코스 목록(CourseSummary)에 `difficulty · recommendedTime`을 더했다 | 명세 22.4장 · 41장에 없는 값. MOCK-CONTRACT-CHECK 12항 37번 |
| 쓰는 곳 | 추천 코스(CRS-005, 41항): 최근 기록이 없으면 고른 평소 거리의 가운데 값(2.5 · 4 · 7.5 · 12km)을 쓴다. 이제 시작한 사람에게는 쉬운 코스(난이도 EASY · "초보 추천")를 올리고 어려운 코스를 내린다. 꾸준히 달리는 사람에게는 보통 · 어려운 코스를 조금 올린다. 주로 달리는 시간이 코스 추천 시간(예: "새벽 · 저녁")과 맞으면 올린다(밤은 "야간 밝음"도). 이유 문구도 맞춰 바꾼다(예: "처음 달리기 좋은 쉬운 코스예요", "저녁에 달리기 좋은 코스예요"). 탐색 거리 칩은 고른 평소 거리 구간으로 바뀐다(고르지 않았으면 3~5km) | 사용자 결정 |
| 거리 칩 기본 선택 | 칩을 미리 눌러 두지는 않는다. 이름만 평소 거리로 바꾼다 | 주변 코스가 적으면 미리 걸어 둔 필터 때문에 목록이 비어 보인다(운영 코스는 아직 전국 129개) |
| 권한 안내 | 위치(경로 · 거리 기록, 주변 코스), 알림(친구 요청 · 함께 달리기 · 내 코스 기록), Apple 건강(다른 기기로 달린 기록 가져오기)을 한 줄씩. "허용"을 눌러야 휴대폰 권한 창을 띄운다. 허용됨은 체크 + 글자, 거절해서 다시 물을 수 없으면 "설정에서 켜기". 이 기기에서 못 쓰는 권한(웹의 알림, 아이폰이 아닌 기기의 Apple 건강)은 숨긴다. "나중에 할게요" · "이대로 시작하기"로 넘어가면 지금처럼 필요한 순간에 다시 묻는다. 알림을 허용하면 Push 토큰도 바로 등록한다 | LOC-001~002, 14.2장 |
| 이어 하기 | 가입하면 기기에 "온보딩 남음"을 남긴다. 앱을 닫았다 켜도 러너 정보부터 이어서 보인다. 끝내거나 건너뛰거나 로그아웃하면 지운다. 온보딩 중에는 앱 화면에 들어가지 않고(Stack.Protected), 가입 전에 연 공유 링크는 온보딩이 끝난 뒤 연다 | 22항 "가입 중 앱 종료"와 같은 방식 |
| 새 것 | `features/onboarding`(IntroScreen · RunnerInfoScreen · PermissionsScreen · RunnerForm · OnboardingHeader · onboardingState · permissions · runnerOptions), 설정 `RunnerProfileScreen`, 아이콘 `notification`. 새 색 · 글자 크기 토큰은 없다 | |
| 확인한 것 | 서버: MySQL · MariaDB 러너 정보 API(처음 null · 저장 · 통째로 바꿈 · 모르는 값 400 · 로그인 없이 401), 코스 목록 추천 시간 · 난이도, API 문서 다시 만듦. 앱: `tsc` · `expo lint`. 웹(mock) 390×844 · 320×568: 소개 3장 → 가입 → 러너 정보 → 권한 안내(위치 허용 → 허용됨) → 탐색(거리 칩 "5~10km", 추천 "처음 달리기 좋은 쉬운 코스예요") → 새로 고침해도 온보딩 다시 안 나옴 → 설정 > 러너 정보에 저장값 → 로그아웃하면 로그인 화면. 건너뛰기 · 나중에 할게요 경로 | 실기기(권한 창 · Apple 건강 · Dynamic Type)는 개발이 끝난 뒤 사용자가 확인 |

## 65. 워치 심박 저장

사용자 결정: 워치 심박을 저장한다. 48항에서는 심박을 워치 · 휴대폰 화면에만 보여 주고 서버에 보내지 않았다. 심박은 개인정보 보호법의 건강정보(민감정보, 23조)라 따로 동의를 받는다.

| 항목 | 판단 | 근거 |
| --- | --- | --- |
| 동의 | 설정 > Apple Watch > "심박을 기록에 저장"(기본 끔). 켜면 동의 sheet(저장하는 정보 · 쓰는 곳 · 보관 기간 · 거부해도 다른 기능은 그대로)를 보여 주고 "동의하고 켜기"를 눌러야 켜진다. 동의는 사람마다라 로그아웃하면 이 기기에서 끈다 | 민감정보 별도 동의 |
| 철회 | 끄면 "끄고 지우기" 확인 뒤 서버(`DELETE /users/me/heart-rates`)와 기기에 남은 심박을 모두 지운다. 지우지 못하면 꺼지지 않고 다시 시도하게 한다. 탈퇴해도 서버에서 바로 지운다 | 동의 철회 · 파기 |
| 기록 | 워치가 5초마다 보내는 심박을 기기로 기록 중인 러닝(달리는 중, 일시정지 아님)에만 SQLite `local_run_heart`(v3)에 남긴다. 30~250bpm 밖은 버린다 | 48항 워치 메시지 그대로 |
| 보내기 | 러닝을 끝낼 때 finish `heartRate`로 한 번에 보낸다(최대 3600개, 넘으면 고르게 줄임). 서버는 러닝 앞뒤 1분 밖을 버리고 같은 시각은 한 번만 저장한다(V20 `tbl_run_heart_rate`) | 오프라인에서 끝내도 나중에 같이 올라간다 |
| 보여 주기 | 기록 상세: 평균 심박 · 최고 심박(bpm). 결과 화면: "심박 평균 · 최고" 한 줄. 내 기록에만 보이고 친구 · 랭킹 · 공유에는 없다 | |
| 확인한 것 | 서버: MySQL · MariaDB에서 finish 심박 저장 · 범위 밖 버림 · 300bpm 400 · 상세 평균/최고 · 심박 없는 러닝 null · 지우기 204 후 null, 스키마 V20, API 문서. 앱: `tsc` · `expo lint`, 웹(mock) 기록 상세 평균 148 · 최고 171 bpm | 워치 → 휴대폰 → 서버 전체 흐름은 실기기에서 사용자가 확인 |

## 66. 이용약관 · 위치기반서비스 이용약관 · 개인정보 처리방침 · 권한 안내 문구

사용자 결정: 이용약관과 개인정보 처리방침을 따로 만들고, 정식 법률 문서 형식(제n조 · ①항 · 1.호)으로 쓴다. 위치기반서비스 이용약관을 별도 문서로 뺀다. 개인정보 처리방침은 개인정보보호위원회 작성지침의 항목 순서와 표 형식을 따른다. 권한 안내 문구를 다듬는다. 명세 16장(OI-07)은 법적 검토 뒤 확정한다고만 한다.

| 항목 | 판단 | 근거 |
| --- | --- | --- |
| 본문 위치 | 앱 안 문서 3개(`features/settings/legal`의 `terms` · `location` · `privacy`)를 `LegalScreen`이 보여 준다. `/legal/[kind]`의 kind는 `terms` · `location` · `privacy`, 모르는 값은 이용약관. 가입 화면 · 설정 > 개인정보에서 세 문서를 모두 연다(로그인 전에도) | 22항 `/legal/[kind]` 그대로 |
| 문서 형식 | 조 제목은 "제n조 (제목)". 문단 앞머리로 모양을 정한다: "①"은 항(번호를 내어 씀), "1. "은 호(한 단 들여 씀), "가. "는 목(두 단). 표는 `{ head, rows }`로 쓰고 휴대폰 폭에 맞게 열은 3개까지. 표는 surface 채움 위에 줄 사이 선을 canvas 색으로 긋는다(새 색 토큰 없음). 스크린 리더는 머리글을 따로 읽지 않고 각 줄을 "머리글 값" 묶음으로 읽는다 | 국내 약관 · 처리방침 통상 형식, 22항 회색 블록 |
| 서비스 이용약관 | 22개 조와 부칙. 목적, 정의, 게시와 개정(7일 · 불리하면 30일, 거부 의사 없으면 동의 간주를 함께 알림), 약관 외 준칙, 이용계약 성립(만 14세 이상), 승낙과 제한, 회원정보 변경, 계정 관리, 서비스 제공(무료 · 통신 요금 별도), 변경과 중단, 기록 검증과 랭킹(이의 시 재검토 요청), 통지, 운영자 의무, 회원 의무(기록 조작 등 금지), 게시물 권리와 신고 3건 자동 숨김(53항), 외부 데이터 출처(OSM ODbL · 두루누비), 이용 제한(단계 · 이의 신청), 해지, 안전, 손해배상, 책임 제한, 분쟁 해결 | 「약관의 규제에 관한 법률」, 통상적인 국내 앱 약관 구성. 위치 조항은 별도 약관으로 옮겼다 |
| 위치기반서비스 이용약관 | 13개 조와 부칙. 목적, 약관 외 준칙, 서비스 내용(러닝 기록 · 완주 검증 · 주변 코스 · 코스 등록 · 함께 달리기)과 요금(무료), 수집 때(기록 중 · 러닝 준비 · 주변 코스 화면)와 항목, 보유와 파기(경로는 탈퇴까지 · 주변 코스 검색 위치는 보유하지 않음 · 확인자료 6개월), 개인위치정보주체 권리와 행사 방법, 제3자 제공 없음(함께 달리기는 좌표가 아니라 거리 · 페이스만 보냄), 8세 이하 아동 등 보호의무자, 위치정보관리책임자, 손해배상, 면책, 분쟁 조정(방송통신위원회 재정 · 개인정보분쟁조정위원회), 사업자 정보 | 위치정보법 제16 · 18 · 19 · 24 · 26 · 28조, 방송통신위원회 표준약관 구성. 함께 달리기 상태 메시지(`LiveRaceService.StateMessage`)에 좌표가 없음을 확인 |
| 개인정보 처리방침 | 17개 조. 작성지침 순서: 처리 목적, 처리 항목(표: 구분 · 항목 · 처리 근거), 보유 기간(표), 파기 절차와 방법, 제3자 제공(없음)과 다른 회원에게 보이는 정보(표), 위탁(gamjabox), 국외 이전(표: Cloudflare · Expo · Apple · Google, 지도 표시 포함), 안전성 확보 조치, 위치정보(위치 약관으로 안내), 민감정보(심박 별도 동의, 65항), 자동 수집 장치(쿠키 · 광고 식별자 없음), 자동화된 결정(기록 검증 · 신고 3건 숨김, 설명 · 재검토 요구), 만 14세 미만, 정보주체 권리(표), 보호책임자, 권익침해 구제(표), 변경 | 개인정보 보호법 제30조 · 작성지침. 처리 근거는 계약 이행(제15조 제1항 제4호) · 동의(제1호) · 별도 동의(제23조). 국외 이전은 제28조의8 제1항 제3호. 탈퇴 처리는 `User.withdraw` · `AuthService.withdraw`와 맞췄다(코스 평가 · 즐겨찾기 · 인터벌 운동 등은 식별 정보 없이 남음). 지도는 react-native-maps(iOS Apple · Android Google) |
| 가입 동의 문구 | "가입하면 서비스 이용약관, 위치기반서비스 이용약관에 동의하고 개인정보 처리방침을 확인한 것으로 봐요." 각 이름이 링크 | 처리 근거가 계약 이행이라 처리방침은 "동의"가 아니라 "확인" |
| 자리 표시 | (67항에서 문의 이메일 한 값으로 줄였다) 운영자 이름 · 개인정보 보호책임자 이름 · 문의 이메일 · 사업장 주소는 `legal/types.ts` `LEGAL_CONTACT` 한 곳. 지금은 `[ ]` 자리 표시라 출시 전에 바꾼다. 적용일은 2026년 10월 1일 | 사용자에게 받을 값. 주소는 위치기반서비스사업자 신고 주소와 같게 |
| 권한 안내(온보딩) | 무엇에 쓰는지 먼저, 그다음 줄에 켜지 않으면 무엇을 못 하는지(위치: 달리기 기록 불가 · 알림: 초대를 놓칠 수 있음 · Apple 건강: 달리모 기록은 그대로). 거절한 권한은 "전에 허용하지 않아 여기서는 다시 물을 수 없어요. 휴대폰 설정에서 켜 주세요". 제목 "달리기 전에 켜 둘 권한" | 64항 권한 안내 |
| 시스템 권한 창(iOS) | 위치: 기록 · 주변 코스에 쓴다, 백그라운드는 "화면을 끄거나 다른 앱을 써도 기록이 이어지도록 · 달리지 않을 때는 모으지 않아요". 건강(휴대폰): 다른 기기 기록 가져오기 · 달리모 기록을 운동으로 저장. 건강(워치): 심박을 화면에 보여 줌 · 운동 저장 | App Store 심사: 목적을 구체적으로 |
| 확인한 것 | `tsc` · `expo lint` · `app.json` 형식. 웹 375×812: 세 문서 화면(항 · 호 들여쓰기, 표), 가입 화면 링크 3개와 위치기반서비스 이용약관으로 이동, 온보딩 권한 안내 새 문구 | 법적 검토는 하지 않았다. 출시 전에 전문가 검토와 위치기반서비스사업자 신고(방송통신위원회)가 필요하다 |

## 67. 운영 주체 "달리모 운영팀" · 간결한 개인정보 처리방침

사용자 결정: 사업자 없이 개인이 개발한다. 다만 문서에 개인 신상을 자세히 적지 않는다. 운영 주체는 "달리모 운영팀"으로 쓴다. 개인정보 처리방침은 사용자가 준 참고 양식(번호 제목 · 가. 소제목 · 목록)처럼 항목만 간단히 적는다.

| 항목 | 판단 | 근거 |
| --- | --- | --- |
| 운영 주체 | 세 문서 모두 "달리모 운영팀(이하 "운영팀")". 개인정보 보호책임자 · 위치정보관리책임자도 "달리모 운영팀"과 문의 이메일. 개인 이름 · 주소 · 사업자 여부는 적지 않는다 | 참고 양식. 개인 신상이 공개되지 않게 |
| 개인정보 처리방침 | 16개 항목: 수집 · 이용 목적, 수집 항목(필수 · 러닝 · 자동 생성 · 직접 입력 · 선택, 심박은 별도 동의), 보유 기간(탈퇴 시까지 · 접속 기록 3개월 · 위치 확인자료 6개월), 제3자 제공(다른 이용자에게 공개되는 정보 한 줄), 위탁(gamjabox), 국외 이전(알림 · 접속 보안과 지도), 권리, 탈퇴, 파기, 위치정보(위치 약관으로), 자동 수집 장치, 안전성 조치, 만 14세 미만, 보호책임자, 구제 기관, 변경. 표 없이 목록으로 쓴다 | 66항보다 조문 근거 · 처리 근거 · 내부 구현 설명을 줄였다. 수집 항목과 보관 · 삭제는 실제 코드와 같다 |
| 이용약관 · 위치기반서비스 이용약관 | 66항 형식 그대로 두고 "운영자"를 "운영팀"으로 바꾼다. 위치기반서비스 이용약관의 사업자 정보 조항은 뺀다(연락처는 제9조에 있다) | |
| 화면 | `LegalScreen`: "가. "는 진한 소제목, "· "는 점을 내어 쓰는 목록 | 참고 양식 모양 |
| 자리 표시 | `LEGAL_CONTACT`는 `operator`("달리모 운영팀") · `email`. 출시 전에 문의 이메일만 받으면 된다 | |
| 확인한 것 | `tsc` · `expo lint`. 웹 375×812: 개인정보 처리방침 소제목 · 목록, 이용약관 · 위치기반서비스 이용약관의 "운영팀" 표기 | 법적 검토는 하지 않았다 |

## 68. 소개 사이트 (랜딩 · 약관 · 문의)

사용자 결정: 출시용 랜딩을 만든다. 서버와 따로 정적 호스팅에 올린다. 스토어 주소가 생기기 전에는 "출시 준비 중"으로 보여 준다. 랜딩 · 약관 3개 · 문의를 한 번에 만든다. 단순한 HTML이 아니라 React와 라이브러리로 출시 수준으로 만들고, 실제 앱 화면을 기기 목업에 넣는다. 명세 20.2장은 "공유 Web Landing"을 Phase 2~3 오픈 이슈로만 두고, 117.2장에 랜딩 문구 후보가 있다.

| 항목 | 판단 | 근거 |
| --- | --- | --- |
| 스택 | `landing/`: React 19 · Vite · Tailwind CSS 4 · motion(LazyMotion) · lucide-react · simple-icons(스토어 로고). 페이지마다 HTML을 따로 만들고(멀티 페이지) 빌드 때 `scripts/prerender.mjs`가 화면을 미리 그려 넣는다(hydrate) | 사용자 결정(React · 라이브러리). 정적 호스팅에서 주소 그대로 열리고 검색 엔진이 읽는다 |
| 디자인 시스템 | `landing/design-system.md`. 앱 dark 토큰(ink · surface · elevated · signal)과 밝은 구간(paper · signal-ink). 대비는 모두 AA 이상으로 계산해 적었다. 글꼴은 앱과 같은 Pretendard | ui-design 스킬 INIT → BUILD. 새 색 토큰 없음 |
| 앱 화면 | 앱을 mock 모드 웹으로 iPhone 15 Pro(393×852pt, 3배)와 안전 영역(CDP `Emulation.setSafeAreaInsetsOverride`)으로 띄워 찍었다. 상태 표시줄(9:41 · 신호 · Wi-Fi · 배터리)과 홈 막대를 그려 780 · 480px webp로 저장. 탐색 · 코스 상세 · 랭킹 · 달리는 중(mock 러너 6배속) · 결과(검증 끝난 PB) · 함께 달리기 목록 · 대기실 · 레이스 · 친구 활동 | 실기기 테스트 전이라 mock 데이터. 다시 찍는 방법은 `landing/README.md` |
| 기기 목업 | `DeviceFrame`: CSS로 그린 iPhone(티타늄 테두리 · 옆 버튼 · Dynamic Island, container query 단위). 이미지 파일 목업을 쓰지 않아 어떤 크기에서도 선명하다 | |
| 랜딩 흐름 | 첫 화면(제목 "코스를 찾고, 같이 달리고, 기록을 깨다." · 휴대폰 세 대 · 경로 선 · 인증 · PB 칩) → 한 바퀴(발견 → 달리기 → 인증 → 순위) → 코스(밝은 구간, 데스크톱은 휴대폰이 멈춰 있고 글을 내리면 화면이 바뀐다) → 달리기(숫자 세 개 · 결과와 검증) → 함께 달리기(모드 · 위치 비공개) → 더 있어요(워치 · 인터벌 · 고스트 · Apple 건강 · 공유 카드 · 친구 활동) → 개인정보 → 자주 묻는 질문 → 출시 안내 | 제품 루프 DISCOVER → RUN → VERIFIED → RANK. 실제 있는 기능과 캡처 화면의 숫자만 쓴다. 가짜 사용자 수 · 후기는 넣지 않는다 |
| 고스트 · 공유 카드 그림 | 수성못 둘레길 실제 경로(OpenStreetMap)를 SVG로 그렸다 | |
| 약관 · 문의 | 약관 페이지는 앱 본문(`frontend/src/features/settings/legal`)을 빌드 때 그대로 읽는다(`@legal` 별칭). 앱 LegalScreen과 같은 규칙에 목차를 더했다. 문의 페이지는 운영팀 · 이메일과 자주 묻는 질문 | 본문은 앱 코드 한 곳에서만 고친다. 정적 HTML 내보내기 스크립트는 없앴다 |
| 성능 | Pretendard 나눠진 글꼴(92개)을 쓰면 파일이 올 때마다 다시 그려 모바일 Style & Layout이 3.8초였다. 빌드 때 사이트 글자(566자)만 남긴 글꼴 하나(133KB, `subset-font`)를 만들고 미리 받는다. 첫 화면 글은 애니메이션 없이 바로 보인다. 휴대폰 이미지는 srcset(480 · 780) | Lighthouse 모바일 성능 65 → 92 |
| SEO · 공유 | 페이지별 title · description · og, `og.png`(1200×630, 실제 달리는 중 화면), manifest. `SITE_URL`이 있으면 canonical · og:url · sitemap.xml, robots.txt는 늘 | |
| 접근성 | 본문 건너뛰기, 랜드마크, 이미지 대체 글(화면 속 숫자까지), 숫자 세기는 최종값을 aria-label로, 자주 묻는 질문은 details/summary, 터치 영역 44px 이상, 동작 줄이기 설정이면 움직임 끔 | |
| 스토어 칸 | `src/content.ts`의 `STORE`가 null이면 누를 수 없는 "출시 준비 중" 칸, 주소를 넣으면 내려받기 버튼 | 사용자 결정 |
| 확인한 것 | `tsc` · `npm run build`. Lighthouse(mobile) 성능 92 · 접근성 100 · 권장 사항 100 · SEO 100, (desktop) 100 · 100 · 100 · 100, CLS 0. 375 · 390 · 1440 폭: 가로 스크롤 없음, 콘솔 오류 · hydrate 오류 없음, 모든 페이지 글꼴 적용, 코스 구간 단계별 휴대폰 전환 | 호스팅 주소는 사용자가 정한다. 공유 링크 페이지(`/s/{code}`)에서 랜딩으로 가는 링크는 주소가 정해진 뒤 붙인다 |

## 69. 인스타그램 홍보 영상

사용자 결정: 인스타그램에 올릴 30초 홍보 영상을 출시 광고처럼 만든다. 명세에는 홍보 영상 항목이 없다.

| 항목 | 판단 | 근거 |
| --- | --- | --- |
| 도구 | `promo/`: Remotion 4(React로 영상), @remotion/transitions(밀기 · 흐리기), @remotion/paths(경로 선 그리기) | 랜딩과 같은 React 컴포넌트 방식. 코드로 고치고 다시 만들 수 있다 |
| 규격 | 1080×1920, 30fps, 900프레임(30초), H.264 High · yuv420p · bt709, AAC 스테레오 | 릴스 규격 |
| 음악 | 기본 `Promo`: "Rising Forest" Diego Nava (Mixkit). Mixkit Stock Music Free License: 소셜 미디어 영상 · 온라인 광고에 상업 이용 무료, 저작권 표시 필요 없음(CD · DVD · 방송 · 게임 · 곡만 리믹스는 안 됨). 처음 쓴 "Shiny Tech" Kevin MacLeod (incompetech.com, CC BY 4.0)는 `PromoShinyTech`로 남기고 끝 장면에 저작권 표시를 단다. `scripts/fetch-music.mjs`가 두 곡을 받고 커밋하지 않는다 | 사용자 요청(실제 서비스 홍보 영상 같은 배경 음악). 직접 합성한 곡 → Shiny Tech → Hitman(어두운 트레일러라 서비스와 따로 놂) → Laserpack을 거쳤고, incompetech 곡은 오래된 느낌이라 요즘 광고 음악이 많은 Mixkit으로 옮겼다. Mixkit 음악 라이선스 원문(mixkit.co/license, Stock Music Free License)을 확인했다. 스포츠 · 운동 · 동기부여 · 광고 태그 190곡에서 밝고 힘 있는 12곡을 받아 에너지 곡선을 보고, 브레이크다운 뒤 드롭이 있는 후보 6곡을 10초씩 들려 사용자가 골랐다 |
| 박자 맞추기 | `src/timeline.ts`의 `TRACKS`에 곡마다 실제 빠르기 · 드롭 시각 · 전환 마디를 두고 `timeline()`이 곡을 자를 위치(프레임 단위로 반올림한 값으로 드롭을 다시 계산)와 장면 길이 · 박 격자를 계산한다. Rising Forest: 킥으로 잰 123.99BPM, 드롭 46.447초(그 뒤 16마디 31초 동안 큰 소리)를 영상 2.5초에, 두 마디마다 전환, 다음 프레이즈가 시작되는 8번째 마디에 결과 → 랭킹, 12번째 마디 셋째 박에 출시 안내(끝 장면이 4.3초라 마디 첫 박보다 앞당김). Shiny Tech: 137.69BPM, 드롭 6.957초를 영상 2.5초에, 두 마디마다 전환, 14번째 마디에 출시 안내. 장면 안 칩 · PB 칩은 `useOnBeat`로 가장 가까운 박에 튀어나오고, 두 곡 모두 한 장면 안 칩이 서로 다른 박에 나오도록 칩 delay를 정했다 | 전환과 킥이 어긋나 보이지 않게. 음악과 화면이 따로 놀지 않게. 곡을 바꿔도 시간표를 손으로 다시 계산하지 않게 |
| 구성 | 시작 질문(오늘 저녁, 어디 달리지?) → 탐색 → 코스 상세 → 달리는 중 → 결과(인증 · PB) → 랭킹 → 함께 달리기 → 끝(달리모 · 문구 · 곧 출시). 장면마다 위에 두 줄 제목, 휴대폰이 들어오고 칩이 튀어나온다 | 제품 루프 순서. 숫자는 캡처 화면과 같은 값(0.50km · 10:12 → 10:08 · 18위 → 14위) |
| 전환 · 등장 | 컷마다 다른 전환(펀치 줌 · 원형 열기 · 휙 넘기기 · 스톱워치 지우기 · 카드 뒤집기 · 비스듬히 쓸기 · 페이드)과 장면마다 다른 휴대폰 등장(올라오기 · 확대 · 3D 기울기 · 떨어져 튕기기 · 옆에서). 전환이 끝나는 순간은 그대로 마디 첫 박. WebGL 전환은 쓰지 않는다 | 사용자 요청(넘어가는 게 똑같고 단조롭다). 장면 뜻에 맞춰 골랐다(달리기 시작은 휙, 기록이 멈추는 순간은 스톱워치). WebGL 전환은 렌더 환경(headless)에 따라 깨질 수 있다 |
| 재료 | 랜딩과 같은 실제 앱 캡처 · iPhone 틀 · 민트 경로 선 · 앱 dark 색 · Pretendard. `npm run assets`가 `landing/public/screens` · `frontend/assets`에서 복사한다(`public/`은 커밋하지 않는다) | 원본은 한 곳. 앱 화면을 다시 찍으면 영상도 다시 만든다 |
| 안전 영역 | 위 220px · 아래 420px에는 중요한 글을 두지 않는다 | 릴스 버튼 · 설명 자리 |
| 커버 | `Cover` 장면(첫 화면 구성: 제목 세 줄 + 휴대폰 세 대)을 PNG로 | 릴스 커버 |
| 결과물 | 영상 · 커버는 `out/`에 만들고 커밋하지 않는다 | 바이너리를 저장소에 두지 않는다 |
| 확인한 것 | `tsc`, 렌더 1분 30초, ffprobe로 규격(영상 · AAC 48kHz 스테레오) 확인, 장면 · 전환 프레임 확인. Rising Forest 최종 mp4: 장면 전환 7곳 · 출시 안내가 킥과 ±20ms 안(한 프레임 33ms보다 작다), 장면 안 칩이 한 장면 안에서 겹치지 않음. 도입 -21dB → 본문 -12dB, 최대 -1dB, 마지막 2초에 줄어듦. Shiny Tech 버전도 `PromoShinyTech`로 다시 만들어 규격을 확인했다 | 랜딩 PR(#73) 화면을 쓰므로 그 브랜치에서 갈라졌다. #73을 먼저 머지한다 |

## 70. 서버 성능 측정 · 개선

사용자 결정: 이용률 같은 제품 지표 말고 서버 성능을 실제로 재서 개선 전후 비율을 남긴다. 명세 31장(성능 테스트 계획) · 54장(벤치마크 양식)을 따른다. 결과 정리는 `docs/perf/README.md`.

| 항목 | 판단 | 근거 |
| --- | --- | --- |
| 측정 도구 | `backend/dallimo-server/perf/`: 시드(`seed.mjs`, 사용자 2만 · 코스 1만 · 공식 기록 30만 건, 고정 시드 난수), 조회 측정(`bench-read.mjs`, 예열 100번 뒤 동시 10명 × 500번), GPS 측정(`bench-gps.mjs`, 러너 20명 × 60점 × 120묶음). 의존성 없는 Node 스크립트. Access Token은 개발 키로 직접 만든다 | 같은 데이터 · 같은 부하로 전후를 비교하려고. 로그인 요청 제한에 걸리지 않게 |
| 측정 DB | `dallimo_perf` (개발 DB `dallimo`와 따로) | 개발 데이터를 건드리지 않는다 |
| 원인 찾기 | `EXPLAIN ANALYZE`와 performance_schema 쿼리별 누적 시간 | 느린 쿼리 로그는 이미 열린 풀 연결에 새 기준이 적용되지 않았다 |
| GPS 업로드 | V21 `tbl_run.contiguous_seq`: 이어진 seq를 저장한 곳부터 센다. MySQL 드라이버 `rewriteBatchedStatements=true`(dev · prod 주소) | Batch마다 point 전체 자기 조인(7,200점에서 24.6ms). 러너 1명 p50 47.5 → 20.6ms, 20명 처리량 3,902 → 6,082 point/s |
| 랭킹 · 코스 통계 | V22 `tbl_course_user_best`(명세 23.1장 projection): 공식 기록을 넣는 트랜잭션에서 그 사용자 한 줄만 원본에서 다시 계산(`CourseBestProjection.REFRESH`). 전체 기간 랭킹 · 인원 · 내 순위 · 코스 1등 기록 · 완주자 수가 이 표를 읽는다. 기간 랭킹은 그대로 원본에서 센다. V23 `idx_run_course_status_started` | 기록 10만 건 GROUP BY가 병목(목록 423ms · 인원 329ms, 이번 주 달린 사람 수 414ms). 랭킹 p95 1,540 → 106ms, 내 순위 4,183 → 336ms, 코스 상세 1,477 → 206ms |
| projection 갱신 방식 | DB 트리거 대신 애플리케이션에서 같은 트랜잭션으로. 기록을 직접 넣는 테스트 도우미도 같은 SQL을 부른다 | 바이너리 로그가 켜진 MySQL 8은 일반 계정으로 트리거를 만들 때 권한 오류(1419)가 날 수 있다 |
| 주변 코스 | 후보는 id · 출발점만 읽고 거리순으로 자른 한 페이지만 엔티티로 불러온다. V24 `idx_course_start_box`(출발점 · 공개 조건 열)로 `idx_course_start_coordinate`를 대신한다 | 후보 약 4,800개를 매 요청 엔티티로 만들었다. 3km p95 495 → 246ms, 10km 720 → 279ms |
| 기록 목록 썸네일 | 러닝마다 첫 · 마지막 seq를 인덱스로 구하고 그 사이를 고르게 나눈 seq 41개만 `(run_id, seq)` 인덱스로 읽는다 | 머지 전에 쟀을 때 창 함수가 GPS 점 표 전체를 읽고 정렬해 2시간 러닝 20개에 1,315ms(예열 뒤 622ms). 바꾼 뒤 약 8ms |
| 결과 적는 기준 | 같은 서버로 다시 재도 p95가 ±10~15% 움직였다. 그보다 작은 차이는 개선으로 적지 않는다(주간 랭킹은 변화 없음) | 측정 편차를 개선으로 쓰지 않게 |
| 확인한 것 | 전체 테스트(MySQL 8.4 · MariaDB 11.4 Testcontainers) 통과. projection = 원본 GROUP BY 테스트, 첫 Batch가 늦게 와도 1부터 세는 테스트 추가. 개선 전후 서버를 번갈아 다시 재서 재현 확인 | 운영 서버가 아닌 4 vCPU 컨테이너에서 쟀다. 절대값보다 비율을 본다 |

## 71. 문의 양식 · App Store만 출시 · 소개 사이트 주소

사용자 결정: 문의 이메일은 공개하지 않는다. App Store에만 낸다. 소개 사이트 주소는 `https://dallimo-landing.kro.kr`.

| 항목 | 판단 | 근거 |
| --- | --- | --- |
| 연락 수단 | 이메일 대신 소개 사이트 문의 페이지(`/support/`)의 Netlify Forms 문의 양식. 약관 · 처리방침의 연락처 · 이의 신청 창구는 `LEGAL_CONTACT.support`(문의 페이지 주소)로 바꿨다. 문의는 Netlify 알림 메일로 받는다 | 개인정보 처리방침에는 보호책임자 연락처가 있어야 하고(개인정보 보호법 제30조), App Store 지원 URL에는 연락 수단이 있어야 한다(심사 지침 1.5). 이메일을 지우기만 하면 둘 다 빈다 |
| 문의 양식 칸 | 문의 종류 · 답변 받을 이메일 · 내용 · 수집 동의(필수). 스팸 거름 칸(`bot-field`) | 답장하려면 이메일이 필요하다. 받는 순간 개인정보 수집이라 목적 · 항목 · 보관 기간을 보이고 동의를 받는다 |
| 개인정보 처리방침 | 1항 목적에 "문의 및 불만 처리", 2항 "바. 문의 시 수집 항목", 3항 보관 "문의 처리 완료 후 1년", 6항 국외 이전 "다. 문의 접수(Netlify, Inc., 미국)" | 문의 양식으로 새로 받는 정보를 그대로 적는다. 1년은 법정 기간이 없어 정한 값이다(분쟁 대응에 필요한 만큼) |
| App Store만 | 소개 사이트 Google Play 칸 · "Android" 문구를 뺐다. 자주 묻는 질문에 "Android 휴대폰은 아직 지원하지 않아요". 홍보 영상 끝 장면 "곧 App Store 출시". 처리방침 국외 이전에서 Google LLC(Android 알림 · 지도)를 뺐다. `APP-RELEASE-SETUP`의 Google Play · Firebase · FCM은 하지 않음으로 표시 | 낼 곳만 적는다. 앱 코드의 Android 설정은 나중에 낼 때를 위해 둔다 |
| 소개 사이트 주소 | `netlify.toml`에 `SITE_URL = "https://dallimo-landing.kro.kr"` | canonical · og:url · og:image · sitemap.xml이 들어간다 |
| 확인한 것 | 앱 `tsc`, 소개 사이트 `npm run build`(타입 확인 포함). 미리 그린 `support/index.html`에 `data-netlify` 양식 · `form-name` 칸, 모든 페이지 canonical, sitemap 확인. 390 · 1440px 문의 페이지 화면, 가로 넘침 · 콘솔 오류 없음. 홍보 영상 다시 렌더 | 실제 문의 접수는 Netlify에서 양식 감지를 켠 뒤 배포된 사이트에서 확인한다 |

## 72. App Store 등록 자료

사용자 결정: App Store에만 낸다(71항). 등록 자료는 `docs/store/APP-STORE.md`.

| 항목 | 판단 | 근거 |
| --- | --- | --- |
| 스크린샷 | 6.9형(1320×2868) 8장을 Remotion 정지 화면으로 만든다(`promo/src/Store.tsx`, `npm run store`). 1장은 서비스 소개(앱 아이콘 · "달리모" · 부제 · 기울인 휴대폰 두 대), 2~8장은 기능 하나씩: 위에 아이콘과 가운데 정렬 두 줄 문구, 바탕은 민트 · 밝은 회색 · 검정을 번갈아 쓰고, 화면의 핵심 부분(코스 카드 · PB · 순위 줄 등)을 잘라 크게 띄운다. 홍보 영상과 같은 휴대폰 틀 · 색 · 글꼴 · 문구. 화면은 원본 크기 실제 앱 캡처(mock 데이터)에 상태 표시줄을 그린 것(`promo/assets/store-screens`, `statusbar.py --full`) | 검색 결과에는 앞 3장만 보여서 1장에서 서비스 이름을 먼저 알린다(네이버 앱 스크린샷 구성을 참고). 휴대폰 화면 글씨가 작아 핵심 부분은 따로 키운다. 영상 · 랜딩 · 스토어가 같은 모습이어야 한다. 780px 랜딩용 화면을 키우면 흐려서 원본 크기를 따로 둔다 |
| iPad · Apple Watch | iPad 스크린샷은 없다(`supportsTablet` 없음). Apple Watch 스크린샷 5장(410×502)은 워치 앱 SwiftUI 화면(`RunViews.swift`)의 배치 · 글자 크기 · 색 · 문구를 그대로 옮겨 Remotion으로 그린다(`promo/src/WatchStore.tsx`, 사용자 요청). 실제 워치 캡처가 생기면 바꾼다 | 워치 앱이 들어 있어 워치 스크린샷이 필요하다. 시뮬레이터 · 실기기 캡처를 기다리지 않고 올릴 수 있게 한다 |
| 글 | 이름 "달리모", 부제 "코스를 찾고, 같이 달리고, 기록을 깨다.", 키워드 68자. 설명은 실제 있는 기능만(음성 안내 거리 · 크라운 · 레전드 기준 · 건강 앱 읽기 · 워치 저장을 코드로 확인) | 없는 기능을 적으면 심사 거절 사유(2.3) |
| 앱 개인정보 | 이메일 · 정확한 위치 · 건강(심박, 동의 시) · 피트니스 · 사용자 콘텐츠 · 사용자 ID · 기기 ID(설치마다 만드는 값) · 진단, 모두 앱 기능 · 사용자와 연결. 추적 없음 | 개인정보 처리방침과 같게. 광고 · 분석 SDK가 없다 |
| 심사 메모 | 데모 계정(운영 서버에 직접 만든다), 백그라운드 위치 쓰는 이유, 건강 앱 · 워치 · 공식 기록 확인 방법 | 백그라운드 위치와 HealthKit은 심사에서 이유를 묻는다 |
| 데모 계정 · 코스 안내 | 운영 서버에 `appreview@dallimo-landing.kro.kr`로 가입해 두었다. 비밀번호는 저장소에 두지 않는다. 운영 서버 코스가 한국(외부 공공 코스)에만 있어 심사 메모에 "해파랑길" 검색으로 코스를 보는 방법을 적었다 | 심사자는 보통 한국 밖에 있어 주변 코스가 비어 보이면 기능을 확인하지 못한다 |
| 수출 규정 | `app.json` `ios.infoPlist`에 `ITSAppUsesNonExemptEncryption: false` | 표준 HTTPS만 쓴다. 빌드마다 App Store Connect가 암호화 질문을 다시 묻지 않게 한다 |

## 73. 추천 코스 범위 10km

사용자 결정: 추천 코스(CRS-005)는 10km 안에서 고른다. 운영 서버에 코스가 아직 적어 주변 3km 목록이 비면 추천도 사라졌다.

| 항목 | 판단 | 근거 |
| --- | --- | --- |
| 추천 후보 | 목록과 같은 중심(내 위치, 지도를 옮겨 찾았으면 그곳)에서 반경 10km 코스. 목록 범위(기본 3km)와 따로 조회한다. 목록이 이미 10km면 같은 조회를 함께 쓴다 | 사용자 결정. 목록은 가까운 코스만 보여 주고 추천은 조금 멀어도 맞는 코스를 고른다 |
| 목록이 빌 때 | "3km 안에 등록된 코스가 없어요" 안내 위에 추천 한 줄을 그대로 보여 준다 | 주변에 코스가 없을 때 추천이 가장 쓸모 있다 |
| 추천을 눌렀을 때 | 목록에 있는 코스면 지금처럼 지도 · 목록에서 고른다. 목록 범위 밖이면 코스 상세로 바로 간다 | 목록에 없는 코스는 지도에서 고를 수 없다 |
| 점수 | 그대로 둔다(41항). "가깝다" 점수는 3km 안에서만 붙는다 | 범위만 바꾸는 결정이다 |
| 확인한 것 | 앱 `tsc` · `expo lint` 통과 | 실기기 확인은 개발이 끝난 뒤 한다(사용자 결정) |

## 74. EAS 빌드 `npm ci` 실패 (npm 버전 차이)

EAS 개발 빌드가 `npm ci`에서 `Missing: typescript@5.9.3 from lock file`로 멈췄다.

| 항목 | 판단 | 근거 |
| --- | --- | --- |
| 원인 | `@bacons/apple-targets` 안쪽 `@expo/require-utils`가 typescript 5를 선택 peer로 둔다. npm 10은 lock에 중첩 typescript 5.9.3을 넣고, npm 11은 `npm install` 때 이 줄을 뺀다. npm 11로 바뀐 lock을 EAS(npm 10)가 `npm ci`하면 실패한다 | npm 9 · 10 · 11로 lock을 만들고 `npm ci`를 엇갈려 돌려 같은 오류를 재현했다 |
| 해결 | `frontend/package.json` `overrides`로 `@bacons/apple-targets` 아래 typescript를 앱 typescript(`$typescript`)로 맞춘다 | lock을 npm 10 · 11 어느 쪽으로 만들어도 npm 9 · 10 · 11 `npm ci`가 모두 통과한다. typescript는 선택 peer라 동작은 같다 |
| 확인한 것 | 새로 `npm ci`, `npx expo config --type introspect`(워치 플러그인 포함), `tsc` 통과 | |

## 75. iOS `NSMotionUsageDescription` (App Store 업로드 거절 90683)

App Store Connect가 빌드를 받지 않았다: "Missing purpose string in Info.plist … NSMotionUsageDescription".

| 항목 | 판단 | 근거 |
| --- | --- | --- |
| 원인 | `expo-location`에 동작 감지 코드(`CMMotionActivityManager`)가 들어 있다. 앱은 이 권한을 요청하지 않지만 Apple은 코드에 API가 있으면 설명 문구를 요구한다. `app.json`의 `motionUsagePermission: false`가 문구를 지우고 있었다 | 거절 메일 "While your app might not use these APIs, a purpose string is still required" |
| 해결 | `motionUsagePermission`에 문구를 넣는다: "달리는 중과 멈춘 때를 구분해 기록을 정확하게 남기는 데 동작 정보를 사용해요. 지금은 이 권한을 요청하지 않아요." | 실제로 묻지 않는 권한이라 그 사실을 함께 적는다 |
| 다른 문구 | 사진 보관함(`expo-file-system` · `expo-image`)은 권한 상태만 읽고 요청하지 않는다. 거절 메일에도 동작 하나만 나와 더 넣지 않는다 | Apple은 빠진 문구를 한 번에 모두 알려 준다 |
| 확인한 것 | `npx expo config --type introspect`의 `ios.infoPlist`에 `NSMotionUsageDescription`이 들어간다 | |

## 76. 15초 인스타 광고 영상

사용자 요청: 30초 영상은 서비스 소개라 길다. 인스타그램에 올릴 15초 광고를 핵심만 담아 따로 만든다. 첫 안(기능 네 개를 차례로)은 "기능 소개 같다 · 워치가 없다"는 의견으로 바꿨고, 둘째 안(워치가 화면 가운데)은 "워치가 메인이면 안 된다"는 의견으로 휴대폰을 주인공으로 바꿨다.

| 항목 | 판단 | 근거 |
| --- | --- | --- |
| 구성 | 이야기 하나: 친구가 내 기록을 넘었다는 알림 → "다시, 수성못으로."(달리는 중) → "9:51 되찾았다." → "이번엔 민수 차례."(같은 알림이 친구에게) → "다음엔 같이 붙자."(함께 달리기) → 아이콘 · 달리모 · 부제 · "곧 App Store 출시" | 기능을 나열하지 않고 코스 기록 경쟁이 주는 감정(빼앗김 → 되찾음 → 주고받음)으로 보여 준다 |
| 휴대폰 · 워치 | 휴대폰 앱 화면이 주인공. 워치는 달리는 장면 두 곳에서 손목에 작게, 옆 휴대폰과 같은 숫자 | 사용자 결정 |
| 문구 · 숫자 | 알림은 서버 `RecordBeatenNotifier` 문구 그대로. 이름 · 코스 · 기록은 스크린샷 mock(수성못 둘레길 · 민수 · 수성러너) | 없는 기능이나 다른 문구를 만들지 않는다 |
| 박자 | Rising Forest 드롭을 2.5초에 두고 한 마디(1.936초)마다 컷 | 30초 영상과 같은 곡 · 같은 방식(69항). 렌더한 소리에서 2.5초에 세기가 1,845 → 11,769로 뛰는 것을 확인 |
| 위치 | `promo/src/Promo15.tsx`, 컴포지션 `Promo15`, `npm run render:15s` | 30초 영상(`Promo`)은 그대로 둔다 |
