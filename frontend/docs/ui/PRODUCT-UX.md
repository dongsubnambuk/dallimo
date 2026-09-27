# PRODUCT-UX

> 출처: `docs/spec/dallimo_master_spec_v1.8_feedback_features.docx` (달리모 통합 개발 명세서 v1.8)
> 옮긴 장: 1.1, 1.2, 1.3, 1.4, 1.5, 3.2, 64, 64.1, 65, 125
> 명세서 원문을 그대로 옮겼다. 내용 수정은 명세서를 먼저 고친 뒤 반영한다.

### 1.1 서비스 정의

주변 러너들이 공유한 좋은 러닝 코스를 발견하고, 동일 코스에서 자신의 기록·친구·다른 러너와 경쟁하며, 서로 다른 장소에서도 친구와 실시간으로 함께 달릴 수 있는 달리모 (DALLIMO)이다.

### 1.2 핵심 가치

| 축 | 사용자 가치 | 핵심 기능 |
|---|---|---|
| COURSE | 오늘 어디서 뛸지 빠르게 결정 | 주변 코스, 지역 검색, 코스 상세, 사용자 코스 등록 |
| COMPETE | 달릴 이유와 재도전 동기 제공 | PB, 코스 랭킹, 친구 기록 Challenge |
| TOGETHER | 장소가 달라도 함께 달리는 경험 | 예약 러닝, 동시 시작, 실시간 진행률·순위 |
| SHARE | 러닝 결과가 다음 행동으로 연결 | 기록·코스·대결 카드, Deep Link, 재도전 |

### 1.3 핵심 순환

```text
DISCOVER → RUN → COMPETE → SHARE → CHALLENGE → RE-RUN
```

### 1.4 주요 사용자

- 주 1~3회 러닝하는 취미 러너
- 같은 코스 반복이 지루하거나 새로운 지역의 코스를 찾고 싶은 사용자
- 친구와 러닝하고 싶지만 장소·일정이 다른 사용자
- 러닝 결과를 SNS·메신저로 공유하고 기록 경쟁을 즐기는 사용자

### 1.5 제품 원칙

- 기록 정확성이 기능 수보다 우선한다.
- 코스를 서비스의 중심 콘텐츠이자 경쟁 단위로 취급한다.
- 개인 러닝 기록은 네트워크·실시간 연결 장애와 분리한다.
- 공식 랭킹에는 검증된 코스 기록만 반영한다.
- SNS는 피드 소비보다 새로운 러닝·도전을 발생시키는 방향으로 설계한다.

### 3.2 핵심 사용자 플로우

| 플로우 | 경로 |
|---|---|
| 일반 러닝 | Run → GPS 확인 → START → 기록 → STOP → 결과 → 저장/공유 |
| 코스 러닝 | Explore → 코스 상세 → 이 코스 달리기 → 기록 → 완주 검증 → PB/랭킹 → 공유/재도전 |
| Challenge | 친구 기록 → 기록에 도전 → 목표 비교 러닝 → 결과 → 상대 알림 → 재도전 |
| Together | 방 생성 → 초대 → Ready → 동시 시작 → 실시간 진행 → Finish → 결과/공유 |
| 코스 생성 | 자유 러닝 완료 → 코스로 공유 → 정보 입력 → 경로 확인 → 등록 |

## 64. 최종 제품 UX 컨셉

레퍼런스 통합 결과, 본 서비스는 '피드형 러닝 SNS', '훈련 코치', '지도 코스 앱', '랭킹 앱' 중 하나로 보이면 안 된다. UI의 중심은 코스를 발견하고 그 코스를 플레이하는 경험이어야 한다.

```text
DISCOVER
  ↓
COURSE DETAIL
  ↓
PICK A PLAY MODE
  ├─ SOLO
  ├─ PB ATTACK
  ├─ RIVAL / CHALLENGE
  └─ LIVE / TOGETHER
  ↓
RUN
  ↓
VERIFIED RESULT
  ↓
RANK / SHARE / REMATCH
  ↓
NEXT RUN
```

### 64.1 UX 성격

| 속성 | 정의 | 피해야 할 형태 |
|---|---|---|
| Sport-first | 운동 데이터가 장식보다 먼저 읽힘 | SNS 카드가 메인인 피드 앱 |
| Map-aware | 코스 탐색 시 지도가 중요한 작업 공간 | 지도 위에 과도한 카드/버튼 중첩 |
| Competition-aware | 경쟁 상태는 숫자/gap/progress로 즉시 이해 | 게임 HUD처럼 과도한 이펙트 |
| Korean-local | 짧고 직접적인 한국어, 지역/거리 문맥 | 영문 러닝 용어 남발 |
| Outdoor-readable | 밝은 야외/이동 중에도 읽힘 | 저대비 회색/작은 폰트 |
| Calm when idle, focused when running | 탐색은 정보 중심, 러닝 중은 단순/강한 계층 | 모든 화면에 동일한 카드 밀도 |

## 65. 정보 구조 최종안

```text
BOTTOM TAB
1. Explore
   - Nearby
   - Search
   - Map
   - Saved
2. Run
   - Quick Run
   - Recent Course
   - Recent Challenge
3. Together
   - Upcoming
   - Create Room
   - Invites
   - History
4. My
   - Profile
   - Runs
   - Records
   - Courses
   - Friends
   - Settings

Global:
- Notifications
- Search
- Share/deep link
```

Activity는 독립 탭이 아니라 알림/프로필/관련 도메인에서 진입한다. 내부 피드를 중심 IA로 만들지 않는다.

## 125. 러닝 시작 IA 개편

기존 내부 Play Mode는 유지하되 사용자에게는 목적 중심 4개 진입점으로 단순화한다. 내부 enum과 사용자 노출 IA를 분리하여 기능 확장 시 홈 화면이 복잡해지는 것을 방지한다.

| 사용자 진입점 | 내부 Mode | 주요 사용 목적 |
|---|---|---|
| FREE | SOLO_FREE | 그냥 지금 달리기 |
| COURSE | COURSE_NORMAL / PB_ATTACK / RIVAL | 코스 완주, PB, 라이벌 |
| TRAINING | INTERVAL / STRUCTURED_WORKOUT | 직접 만든 훈련 실행 |
| TOGETHER | TOGETHER / LIVE_RACE | 친구/그룹과 동시 시작 |

Explore에서 코스를 선택한 경우 COURSE로 바로 진입하고, Run 탭에서 시작한 경우 위 4개 진입점을 보여준다. 사용자의 직전 실행 모드는 Quick Start로 제공할 수 있다.
