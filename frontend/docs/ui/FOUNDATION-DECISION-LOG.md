# UI Foundation Decision Log

DESIGN-SYSTEM-PLAYGROUND-SPEC.md 116장 "Decision Log | 아직 미확정인 visual 값 목록 기록"에 따라 작성한다.
명세서 원문 문서(`DESIGN-SYSTEM.md` 등)는 수정하지 않았다. 명세서에 없는 값과 판단은 이 문서에만 기록한다.

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
| 추가 색 역할 `action.primaryPressed` | palette.signalPressed | 88장 palette에 이미 있는 값에 역할 이름만 붙였다 |
| 추가 색 역할 `action.onPrimary` | canvasDark `#101312` | signal 위 흰 글자는 대비 2.33으로 실패, near-black은 8.01 |
| 추가 색 역할 `border.subtle` | text.secondary + alpha 0x33 | divider, skeleton, 비활성 버튼용. palette에서 파생 |
| `action.secondary` | text.primary | 보조 action은 accent 대신 기본 글자색 |
| `bg.elevated` | surface와 같은 색 + `elevation.mapOverlay` 그림자 | 88.2장: elevation은 sheet/map overlay에만 |
| `gps.good/fair/poor`, `ranking.up/down` | success / warning / danger | 별도 색을 늘리지 않고 status 색을 재사용 |
| metricLarge 36/40 700, screenTitle 24/30 700, sectionTitle 17/22 600, body 15/22 400, label 13/18 600, caption 12/16 400 | | 시스템 폰트 기준 |
| maxFontSizeMultiplier | metricHero/metricLarge 1.3, screenTitle/label 1.5, 나머지 제한 없음 | 큰 숫자·컨트롤만 제한하고 본문은 제한하지 않는다 |
| radius | control 8 / card 12 / sheet 20 / pill 999 | 88.2장 3단계 + 114장 pill |
| stroke | signal 3 / control 1.5 | signal line(선택, 본인, 진행률, emphasized metric) 두께 통일 |
| touchTarget | min 48 / primary 56 | 68장 "충분한 크기" |
| elevation | sheet, mapOverlay (boxShadow) | |
| motion | pressFeedback 120 / gapEmphasis 250 / rankReorder 250 / routeWarning 250 / finishReveal 400 / countdownStep 1000 ms | 69장 상황별 역할. 아직 애니메이션은 구현하지 않았다 |
| pressed / disabled opacity | 0.7 / 0.4 | |

### 2.3 폰트

115.1장 "새 font family 임의 결정 금지"에 따라 시스템 폰트를 쓴다. Pretendard 등은 88.1장대로 라이선스·번들 크기 확인 후 결정한다.

## 3. 컴포넌트 판단

| 컴포넌트 | 판단 |
| --- | --- |
| AppText | 112.1장 API의 `role`이 RN의 ARIA `role` prop과 겹쳐 RN 쪽을 제외했다. 접근성 역할은 `accessibilityRole`을 쓴다 |
| AppIcon | expo-symbols 하나만 사용. iOS SF Symbols, Android/web Material Symbols. 옆에 텍스트가 있으면 스크린 리더에서 숨긴다 |
| MetricBlock | emphasized는 accent 글자색 대신 signal line을 쓴다. light canvas에서 accent 글자 대비가 2.19로 실패하기 때문이다. 값이 길면 native에서 한 줄에 맞게 줄인다 |
| PrimaryRunButton | 시작할 수 없으면 이유 문구를 버튼 아래에 표시한다 (73장) |
| GapIndicator | 부호: 시간은 앞서면 `−`, 거리는 앞서면 `+` (94장 "+72m"). 방향 아이콘·부호·문구를 함께 표시 |
| RankingRow | relation은 normal/self/friend. podium은 순위로 판단, nearby는 목록 배치로 표현한다. 순위 없음은 `--` |
| ParticipantChip | 상태 문구가 이름보다 앞에 온다 (113장 state first). 위치 대신 진행률만 표시 |
| 문구 | "GPS 찾는 중/보통/약함/사용 불가", "기록 검증 중/공식 기록 미인증/인증 거부", "초대됨/준비 완료/달리는 중/연결 끊김/완주/중도 포기" 등은 v0 문구다. "GPS 양호", "공식 기록 인증됨"은 92·93장 문구다 |

## 4. 대비 검증 (WCAG)

| 조합 | 대비 | 결과 |
| --- | --- | --- |
| text.primary / canvas light | 17.27 | AA |
| text.secondary / canvas light | 4.72 | AA |
| text.primary / canvas dark | 17.49 | AA |
| text.secondary / canvas dark | 8.51 | AA |
| action.onPrimary / action.primary | 8.01 | AA |
| action.onPrimary / action.primaryPressed | 5.63 | AA |
| action.primary / canvas dark | 8.01 | AA |
| status.success / canvas dark | 5.17 | AA |
| status.warning / canvas dark | 7.34 | AA |
| status.danger / canvas dark | 4.45 | 3:1 이상 (큰 글자·UI) |
| status.success / canvas light | 3.39 | 3:1 이상 (큰 글자·UI) |
| status.danger / canvas light | 3.94 | 3:1 이상 (큰 글자·UI) |
| **action.primary / canvas light** | **2.19** | 실패 |
| **status.warning / canvas light** | **2.39** | 실패 |
| **route.target / canvas light** | **1.37** | 실패 |

- 현재 컴포넌트는 status 색을 글자에 쓰지 않고 아이콘과 signal line에만 쓴다. 의미는 항상 옆 글자로도 전달한다.
- 실패한 세 조합은 light 화면에서 아이콘·선·지도 경로로 쓰일 때 문제가 된다. 98장 "Accent contrast"와 "Map legibility" 검증 전에 palette를 확정하지 않는다.

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

- 브랜드 accent와 status 색 (4장 대비 실패 항목 포함)
- 폰트 family
- 2.2장의 모든 v0 값
- 지도 위 route 색 구분 (지도 SDK 결정 후)
- OS dark mode 대응 방식. 현재는 화면 컨텍스트(light 탐색 / dark 러닝)만 쓰고 OS 설정은 따르지 않는다 (110.1장)
