# UI Foundation Decision Log

DESIGN-SYSTEM-PLAYGROUND-SPEC.md 116장 "Decision Log | 아직 미확정인 visual 값 목록 기록"에 따라 작성한다.
명세서 원문 문서(`DESIGN-SYSTEM.md` 등)는 수정하지 않았다. 명세서에 없는 값과 판단은 이 문서에만 기록한다.

## 0. v0.1 시각 개선 (사용자 피드백 반영)

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
