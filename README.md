# 달리모 (DALLIMO)

내 주변 러닝 코스를 찾고, 코스마다 공식 기록으로 순위를 겨루고, 장소가 달라도 친구와 같은 시간에 함께 달리는 iOS 러닝 앱입니다.

> 코스를 찾고, 같이 달리고, 기록을 깨다.

- 소개 사이트: https://dallimo-landing.kro.kr/
- API 문서(Swagger): https://dallimo.gamjabox.cloud/swagger-ui.html
- 출시: App Store만 냅니다 (결정 로그 71항)

## 주요 기능

| 기능 | 내용 |
| --- | --- |
| 코스 탐색 | 지도에서 주변 코스와 출발점까지 거리를 봅니다. 이름 · 지역 · 특징으로 검색하고 거리 · 평점으로 거릅니다. 평소 달리는 거리에 맞춰 10km 안 코스 하나를 추천합니다 |
| 코스 등록 | 달린 기록으로 코스를 만듭니다. 두루누비 · OpenStreetMap 공공 코스도 서버가 가져옵니다 |
| 달리기 기록 | 거리 · 시간 · 페이스를 크게 보여 줍니다. 화면을 꺼도 백그라운드에서 기록하고, 정한 거리마다 음성으로 안내합니다. 인터벌 달리기를 지원합니다 |
| 공식 기록 | 코스를 끝까지 달리면 경로를 확인해 공식 기록으로 인증합니다. 내 최고 기록(PB)과 순위 변화를 바로 보여 줍니다 |
| 랭킹 | 코스마다 이번 주 · 이번 달 · 전체 기간 · 친구 순위가 있습니다. 코스 크라운(90일 최고 기록)과 로컬 레전드(최다 완주)가 있습니다 |
| 고스트 러너 · 구간 도전 | 내 최고 기록이 지도 위에서 같이 달립니다. 코스 안 구간 기록에 도전합니다 |
| 함께 달리기 | 친구와 같은 시간에 출발해 레이스나 타임 어택을 합니다. 위치는 보내지 않고 거리 · 페이스만 주고받습니다 |
| 친구 · 알림 | 친구가 내 기록을 넘거나 크라운을 차지하면 활동 피드와 푸시로 알려 줍니다 |
| Apple Watch · 건강 | 워치에서 거리 · 시간 · 페이스를 보고 일시정지 · 종료합니다. 동의하면 심박을 남깁니다. Apple 건강의 다른 앱 운동 기록을 가져옵니다 |

## 기술 스택

| 영역 | 기술 |
| --- | --- |
| 앱 | React Native 0.86 · Expo SDK 57 · Expo Router · TypeScript · TanStack Query · react-native-maps · expo-location / task-manager(백그라운드 GPS) · expo-sqlite(오프라인 저장) · STOMP |
| 워치 | SwiftUI watchOS 앱(`@bacons/apple-targets`) · WatchConnectivity · HealthKit |
| 서버 | Java 21 · Spring Boot 4.1 (Web MVC · Data JPA · JDBC · WebSocket(STOMP) · Flyway · Actuator) · springdoc OpenAPI |
| 데이터 | MySQL 8.4 · Redis 7(실시간 레이스 상태) |
| 테스트 | JUnit 5 · Testcontainers(MySQL 8.4 · MariaDB 11.4 · Redis) · OpenAPI 계약 테스트 |
| 소개 사이트 | React · Vite · Tailwind CSS · motion. 빌드 때 HTML로 미리 그려 Netlify에 올립니다 |
| 홍보 영상 · 스토어 이미지 | Remotion |
| 배포 | 서버: Docker Compose(gamjabox) · 앱: EAS Build · 소개 사이트: Netlify |

## 서버 성능 개선

같은 데이터(사용자 2만 명 · 코스 1만 개 · 공식 기록 30만 건)와 같은 부하로 개선 전후를 쟀습니다. 자세한 원인 분석과 방법은 [`docs/perf/README.md`](docs/perf/README.md)에 있습니다.

| 대상 | 개선 전 p95 | 개선 후 p95 | 처리량 |
| --- | --- | --- | --- |
| 코스 랭킹 (전체 기간) | 1,540ms | 106ms | 17.7배 |
| 내 순위 | 4,183ms | 336ms | 21.0배 |
| 코스 상세 | 1,477ms | 206ms | 8.9배 |
| 주변 코스 (반경 10km) | 720ms | 279ms | 2.8배 |
| GPS 업로드 (러너 20명 동시) | 묶음당 p50 286ms | 173ms | 1.56배 |

- 랭킹 · 내 순위: 요청마다 기록 10만 건을 묶던 쿼리를 사용자별 최고 기록 projection 표로 바꿨습니다.
- 코스 상세: "이번 주 달린 사람 수" 쿼리에 맞는 인덱스를 추가해 414ms를 3.3ms로 줄였습니다.
- 주변 코스: 후보 약 4,800개를 모두 엔티티로 만들던 것을 id · 출발점만 읽고, 거리순으로 자른 20개만 불러오게 바꿨습니다.
- GPS 업로드: 묶음마다 러닝의 점 전체를 다시 세던 연속 seq 확인을 저장한 값 뒤부터만 세게 바꿨습니다. 점 60개를 한 문장씩 보내던 INSERT는 묶어서 보냅니다.

## 저장소 구조

```text
dallimo/
├─ frontend/   # iOS 앱 (Expo). targets/watch에 워치 앱
├─ backend/    # Spring Boot 서버 (backend/dallimo-server)
├─ landing/    # 소개 사이트 · 약관 · 문의 페이지
├─ promo/      # 홍보 영상 · App Store 스크린샷 (Remotion)
├─ docs/       # 명세, API 계약(openapi.yaml), 성능 측정, 스토어 등록 자료
├─ CLAUDE.md   # 저장소 공통 작업 규칙
└─ netlify.toml
```

## 실행

### 앱

Node.js 20 이상이 필요합니다.

```bash
cd frontend
npm install
npm start            # expo start. 기본으로 배포 서버에 붙습니다 (.env.development)
npm run typecheck
npm run lint
```

- 다른 서버로 띄우려면 `frontend/.env.local`의 `EXPO_PUBLIC_API_URL`을 바꿉니다. 비워 두면 서버 없이 mock 데이터로 동작합니다(`.env.example` 참고).
- 패키지는 `npx expo install <package>`로 추가합니다. SDK와 맞는 버전이 설치됩니다.

### 서버

JDK 21과 MySQL · Redis가 필요합니다. 자세한 설정은 [`backend/README.md`](backend/README.md)에 있습니다.

```bash
cd backend/dallimo-server
DB_USERNAME=... DB_PASSWORD=... ./gradlew bootRun   # dev 프로필. Flyway가 테이블을 만듭니다
./gradlew test                                       # Docker 필요 (Testcontainers)
```

### 소개 사이트 · 홍보 영상

```bash
cd landing && npm install && npm run dev      # 자세한 내용은 landing/README.md
cd promo && npm install && npm run studio     # 자세한 내용은 promo/README.md
```

## 앱 식별자

| 항목 | 값 |
| --- | --- |
| 홈 화면 이름 | 달리모 |
| iOS 번들 ID | `com.dongseopseo.dallimo` |
| 워치 앱 번들 ID | `com.dongseopseo.dallimo.watchkitapp` |
| URL scheme | `dallimo` |
| 공유 링크 | `https://dallimo.gamjabox.cloud/s/{code}` (Universal Link) |

## 문서

| 문서 | 내용 |
| --- | --- |
| `docs/spec/` | 마스터 스펙 v1.8 (원본 docx와 Markdown 추출본) |
| `docs/api/openapi.yaml` | REST API 계약. 서버 테스트가 코드와 같은지 확인합니다 |
| `docs/perf/README.md` | 서버 성능 측정 · 개선 결과 |
| `docs/store/APP-STORE.md` | App Store 등록 자료 (설명 · 키워드 · 스크린샷 · 심사 메모 · 앱 개인정보) |
| `frontend/docs/ui/FOUNDATION-DECISION-LOG.md` | 설계 결정 기록 |
| `frontend/docs/deploy/APP-RELEASE-SETUP.md` | 앱 빌드 · 출시 설정 |
| `frontend/CLAUDE.md`, `frontend/docs/ui/` | 앱 UI/UX 구현 규칙 |

## 작업 규칙

- 브랜치는 `main`에서 기능별로 만들고 `feat/` · `fix/` · `refactor/` · `design/` · `docs/`로 시작합니다.
- PR 제목과 본문은 한국어로 씁니다.
- 비밀 값(DB · JWT · 인증 키)은 저장소에 넣지 않습니다.
