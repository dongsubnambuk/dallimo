# DALLIMO Backend

달리모 서버. `dallimo-server/`가 Spring Boot 프로젝트입니다.

## 기술 기준

| 항목 | 값 | 근거 |
| --- | --- | --- |
| 언어 · 빌드 | Java 21, Gradle(Groovy) wrapper 9.7.1 | 사용자 결정 |
| 프레임워크 | Spring Boot 4.1.1 (Web MVC, Validation, Data JPA, JDBC, Flyway, Actuator) | 명세 40.3장 |
| DB | MySQL 8.4(로컬 · 개발) / MariaDB(운영) | 명세 15.2장, ADR-004 |
| 마이그레이션 | Flyway `src/main/resources/db/migration` (V1~V3 = 명세 22.4장 DDL 그대로, V4부터 추가분) | 명세 22.4장 |
| 테스트 | JUnit 5 + Testcontainers (MySQL 8.4 · MariaDB 11.4) | 명세 13.1장, 40.3장 |

## 로컬 실행

```bash
cd backend/dallimo-server
docker compose up -d          # MySQL 8.4 (utf8mb4, UTC)
./gradlew bootRun             # 기본 프로필 local → Flyway가 스키마를 만든다
curl localhost:8080/actuator/health
```

Docker만 있으면 DB 없이도 `TestDallimoServerApplication`(테스트 소스)을 실행해 Testcontainers MySQL로 띄울 수 있습니다.

## 테스트

```bash
./gradlew test    # Docker 필요. MySQL · MariaDB 컨테이너를 띄워 migration · 스키마 계약 · 오류 응답을 확인
```

CI: `.github/workflows/backend.yml` (backend 변경 PR · main push에서 `./gradlew build`).

## 프로필 (명세 15.3장)

| 프로필 | DB | 접속 정보 |
| --- | --- | --- |
| local (기본) | docker compose MySQL | `application-local.yaml` (로컬 전용 값, `DB_USERNAME` · `DB_PASSWORD`로 덮어쓰기 가능) |
| dev | MySQL | 환경변수 `DB_URL` · `DB_USERNAME` · `DB_PASSWORD` |
| test | Testcontainers | 테스트가 넣는다 |
| prod | MariaDB | 환경변수 `DB_URL` · `DB_USERNAME` · `DB_PASSWORD` |

비밀 값(DB · OAuth · Push · S3)은 저장소에 넣지 않습니다.

## 인증 (사용자 결정: 이메일 · 비밀번호 · 닉네임, 소셜 로그인 없음)

| API | 설명 |
| --- | --- |
| `POST /api/v1/auth/signup` | `{ email, password, nickname, deviceId }` → 201 토큰 + 사용자. 가입하면 바로 로그인 |
| `POST /api/v1/auth/login` | `{ email, password, deviceId }` |
| `POST /api/v1/auth/refresh` | `{ refreshToken, deviceId }` → 새 Access · Refresh Token (회전) |
| `POST /api/v1/auth/logout` | Bearer. 이 기기 세션을 끊는다 (204) |
| `GET · PATCH · DELETE /api/v1/users/me` | 내 정보 · 닉네임 변경 · 탈퇴(모든 기기 세션 끊음) |
| `GET /api/v1/users/nickname-availability?nickname=` | 로그인 없이. `{ available }` |

- **Access Token**: JWT(HS256) 30분. `sub` = 사용자 id, `sid` = 세션 id. 요청마다 세션이 살아 있는지 확인해서 로그아웃 · 같은 기기 재로그인 · 탈퇴하면 남은 Access Token도 바로 막힌다.
- **Refresh Token**: `{세션 id}.{256비트 무작위}` 30일. 서버에는 SHA-256 해시만(`tbl_refresh_token`, 기기마다 한 줄). refresh할 때마다 새 토큰으로 바뀌고, 바로 전 토큰은 60초 동안만 다시 받아 준다(응답 유실 재시도). 그 뒤 옛 토큰이나 다른 기기에서 온 토큰은 탈취로 보고 세션을 끊는다.
- **오류**: 만료 `401 TOKEN_EXPIRED`(앱이 refresh 후 재시도), 그 밖 `401 AUTH_REQUIRED`(다시 로그인), 로그인 실패 `401 INVALID_CREDENTIALS`, 중복 `409 EMAIL_ALREADY_EXISTS` · `NICKNAME_ALREADY_EXISTS`.
- **비밀번호**: 8~64자, 영문과 숫자 함께, 공백 없음. BCrypt(`{bcrypt}` 접두어)로 저장.
- **설정**: `dallimo.auth.*` (application.yaml). 키는 환경변수 `JWT_SECRET`(Base64 32바이트 이상). local 프로필은 개발 전용 키가 들어 있다.
- **스키마**: `V4__email_auth.sql` — 이메일 가입자는 `provider = 'EMAIL'`, `provider_user_id = 소문자 이메일`, `password_hash` 추가, Refresh Token 회전용 `previous_token_hash` · `rotated_at`.

### 앱과 연결

```bash
cd backend/dallimo-server && docker compose up -d && ./gradlew bootRun
cd frontend && EXPO_PUBLIC_API_URL=http://localhost:8080 npx expo start   # 아이폰은 노트북 IP
```

`EXPO_PUBLIC_API_URL`이 없으면 앱은 서버 없이 mock으로 동작합니다(`frontend/.env.example`).

## Run API (명세 42장)

| API | 설명 |
| --- | --- |
| `POST /api/v1/runs` | `{ clientRunUuid, mode, courseId?, challengeId?, liveRoomId?, startedAt }`. 새로 만들면 201, 같은 `clientRunUuid`면 200과 같은 Run. 다른 사용자의 `clientRunUuid`면 409 `IDEMPOTENCY_CONFLICT` |
| `POST /api/v1/runs/{id}/points` | `{ batchUuid, fromSeq, toSeq, points[] }` (최대 500개). `Idempotency-Key` 헤더를 보내면 batchUuid와 같아야 한다 |
| `POST /api/v1/runs/{id}/pause` · `resume` | RUNNING ↔ PAUSED. 상태가 맞지 않으면 409 `RUN_INVALID_STATE` |
| `POST /api/v1/runs/{id}/finish` | `{ endedAt, lastSeq, activeSeconds? }`. 빠진 seq가 있으면 200 + `status: FINISHING`, 다 있으면 FINISHED와 거리 · 시간 · 페이스. 이미 끝났으면 같은 결과 |
| `GET /api/v1/runs?cursor=&size=` | 내 FINISHED 기록, `startedAt` 최신순. size 1~50(기본 20) |
| `GET /api/v1/runs/{id}` | `{ summary, splits, path }`. path는 표시용으로 400개 이하 |

- **멱등** (25.2장): Run은 `clientRunUuid` UNIQUE. Batch는 `tbl_run_sync_batch`에 `batchUuid`를 남긴다. 같은 Batch를 다시 보내면 성공(내용이 다르면 409). point는 `(run_id, seq)` UNIQUE + `ON DUPLICATE KEY UPDATE`로 겹쳐 와도 한 번만 저장. 같은 Run 요청은 Run 행을 잠가(`PESSIMISTIC_WRITE`) 차례로 처리한다.
- **거리 · 시간** (42.3장): 앱이 보낸 누적 거리는 받지 않는다. 서버가 point로 다시 계산한다(`RunMetrics`). 기준은 앱 엔진과 같다: accuracy 20m 초과 제외, 12m/s 초과는 튄 point(3번 연속이면 새 기준점), 제외한 point 다음은 잇지 않음, 15초 넘게 비면 일시정지로 보고 잇지 않음. 달린 시간은 앱이 보낸 `activeSeconds`를 받되 시작~종료 시간을 넘지 않게 자른다. 없으면 시작~종료 시간. 평균 페이스는 50m 이상일 때만.
- **FINISHING 판정**: seq 1부터 빈틈없이 이어진 마지막 seq(`lastContiguousSeq`)가 `lastSeq`보다 작으면 FINISHING.
- **검증 상태**: 코스를 쓰는 모드(COURSE · PB · CHALLENGE)이고 `courseId`가 있으면 PENDING, 아니면 NONE. 검증 엔진(26장)은 아직 없다.
- **테스트**: `RunApiContractTest`를 MySQL · MariaDB에서 모두 돌린다(RUN-IT-001~007 + 상태 · 검증 · 목록). `RunMetricsTest`는 거리 계산.

## Course API (명세 43장)

| API | 설명 |
| --- | --- |
| `GET /api/v1/courses/nearby?lat=&lng=&radius=&cursor=&size=` | 로그인 없이도. 출발점이 반경(m, 100~20000, 기본 5000) 안인 코스를 가까운 순으로 |
| `GET /api/v1/courses/search?query=&cursor=&size=` | 로그인 없이도. 이름으로 찾기, 최근 등록순 |
| `GET /api/v1/courses/{id}` | 로그인 없이도. 상세 + 줄인 경로(1000점 이하) + 고도 그래프. 로그인하면 내 기록 · 저장 여부 |
| `GET /api/v1/courses/{id}/route` | 로그인 없이도. 정규화한 경로 전체 |
| `POST /api/v1/courses` | `{ sourceRunId, name, description?, tags? }` → 201 상세 |
| `POST · DELETE /api/v1/courses/{id}/bookmarks` | 204. 여러 번 보내도 같다 |
| `GET /api/v1/users/me/courses?kind=CREATED\|SAVED\|FINISHED` | 내 코스(MY-005): 등록 · 저장 · 완주 |

- **코스 등록** (43.1장): 내 FINISHED Run만 된다(남의 것 403, 끝나지 않음 409 `RUN_INVALID_STATE`, 없음 404 `RUN_NOT_FOUND`). Run point 중 거리 계산과 같은 판정(`RunMetrics`)을 통과한 point만 이어서 10m 간격으로 다시 찍는다(`CourseRoute`). 정상 point가 10개 미만이거나 500m 미만이면 422 `RUN_POINT_INVALID`. 경로는 이때 한 번 만들고 바꾸지 않는다(route snapshot 불변). 새 코스는 `NEW` · `PUBLIC`.
- **보이는 코스**: 삭제 · `HIDDEN` · `BLOCKED`는 목록에서 빠지고 상세는 403 `RESOURCE_FORBIDDEN`. `PRIVATE`은 만든 사람만 본다.
- **주변 조회** (23.2장): 위 · 경도 bounding box로 후보를 줄인 뒤 애플리케이션에서 출발점까지 실제 거리를 계산한다. 공간 인덱스는 쓰지 않는다.
- **숫자**: 코스 1위 · 완주자 수 · 내 기록은 공식 기록(`tbl_course_record`)만 센다. 검증(WBS 5) 전이라 지금은 비어 있다. 주간 러너 수는 최근 7일 이 코스를 끝까지 달린(FINISHED) 사람 수. 예상 시간은 6'00"/km.
- **아직 없는 것**: 랭킹(WBS 6), 코스 평가 · 신고(WBS 14), 코스 지역 · 러닝 환경 · 추천 시간(저장할 곳이 ERD에 없다).
- **로컬 코스 데이터**: local 프로필에서만 `db/seed/local/R__local_seed_courses.sql`(수성못 둘레길 · 신천 강변 왕복 · 들안로 왕복, 만든 사람 "달리모")을 넣는다. 앱 mock 코스와 같은 OpenStreetMap 경로를 10m 간격으로 찍었다. 다시 만들 때: `node --experimental-strip-types scripts/gen-local-seed.mts`.
- **테스트**: `CourseApiContractTest`를 MySQL · MariaDB에서 모두 돌린다(등록 · 거부 · 주변 · 숨김 · 검색 · 저장 · 내 코스 · 기록 숫자). `CourseRouteTest`는 경로 정규화.

## 코스 완주 검증 (명세 26장, WBS 5)

- **언제**: 코스 러닝(COURSE · PB · CHALLENGE + courseId)을 finish하면 검증 대기(PENDING). 커밋 뒤 비동기로 판정한다(`VerificationTrigger`, 12.4장). 서버가 그 사이 꺼져 1분 넘게 PENDING으로 남은 Run은 1분마다 다시 찾는다(`dallimo.verification.sweep-interval`).
- **한 번만**: Run 행을 잠그고 PENDING일 때만 판정한다. `tbl_course_record.run_id` UNIQUE.
- **파이프라인** (`CourseVerifier`, 26.1장): 거리 계산과 같은 GPS 품질 판정 → 출발점 반경 → 도착점 반경 → 거리 → 경로 일치율 → 이어진 속도 → 판정.
  - 출발: 처음 출발점 반경에 들어온 구간에서 출발점에 가장 가까운 point
  - 도착: 출발 뒤 코스 거리의 50% 이상 달린 다음 처음 도착점 반경에 들어온 구간에서 도착점에 가장 가까운 point (루프 · 왕복 코스에서 출발하자마자 도착으로 보지 않고, 두 바퀴 달리면 첫 바퀴)
  - 경로 일치율: 코스 점(10m 간격) 중 달린 선분에서 허용 폭 안인 비율. 달린 선분을 격자에 넣고 코스 점마다 주변 칸만 본다(26.3장, O(N×M) 전체 비교 없음)
  - 속도: 움직인 시간 30초 이상 구간의 평균 속도
- **판정**: 속도 초과 → REJECTED(`SPEED_ANOMALY`). 출발 · 도착 · 거리 · 일치율 중 하나라도 실패 → UNVERIFIED(`START_NOT_NEAR` · `END_NOT_REACHED` · `DISTANCE_SHORT` · `ROUTE_MISMATCH`, GPS 부족 `GPS_INSUFFICIENT`, 코스 경로 없음 `COURSE_UNAVAILABLE`). 모두 통과 → VERIFIED + 공식 기록.
- **공식 기록** (사용자 결정): 출발점에 가장 가까운 point부터 도착점에 가장 가까운 point까지 달린 시간, 일시정지(point 사이 15초 넘게 빔) 제외. 페이스는 코스 거리 기준.
- **근거** (26.4장): `tbl_run_verification`에 검사별 PASS · FAIL · SKIPPED, 일치율, 실패 사유, 정책 버전(`2026-09-v1`)을 남긴다. 원본 point는 바꾸지 않는다.
- **API**: `GET /runs/{id}`의 `verification { status, failureReason, matchRate, recordSeconds, previousBestSec, personalBest, policyVersion }`(코스 러닝이 아니면 null). 목록 · 상세 요약에 `courseName`.
- **테스트**: `CourseVerifierTest`(직선 · 루프 두 바퀴 · 일시정지 · 대각선 지름길 · 우회 · 차량 속도 · 짧은 전력 질주 · 출발 · 도착 · 정확도 나쁜 point · 재현성), `VerificationApiContractTest`를 MySQL · MariaDB에서(CRS-IT-001~003, PB, 한 번만 판정, 주기 재검사).

## 코스 랭킹 (명세 43장, WBS 6)

| API | 설명 |
| --- | --- |
| `GET /api/v1/courses/{id}/rankings?scope=ALL\|FRIENDS&period=ALL\|WEEKLY\|MONTHLY&cursor=&size=` | 로그인 없이도. 사용자별 최고 공식 기록 순위(RNK-001~004) |
| `GET /api/v1/courses/{id}/rankings/me?scope=&period=` | 내 순위 · 전체 인원 · 내 위아래 두 명(RNK-005). 기록이 없거나 비회원이면 `entry` null |

- **순위** (23.1장): `tbl_course_record`(검증을 통과한 기록만 있다)를 사용자별 최고 기록으로 모아 빠른 순, 같은 기록이면 user_id 순. 한 사람은 한 줄(RNK-IT-001).
- **기간** (사용자 결정): 한국 시간 기준 주간은 월요일 0시, 월간은 1일 0시부터. 기록이 만들어진 시각(`created_at`)으로 거른다(`idx_course_record_period`).
- **항목**: `rank, userId, name, timeSec, paceSecPerKm(코스 거리 기준), relation(self · normal), isPB(내 줄에서 이 기간 기록이 내 전체 최고인가)`.
- **친구 랭킹** (사용자 결정): 친구 기능(WBS 8) 전이라 빈 목록.
- **다른 곳에 붙는 값**: 코스 상세 `competition { leaderSec(전체 기간 1위), myWeeklyRank, weeklyTop(이번 주 1~3위), myEntry }`, 러닝 상세 `verification { weeklyRankBefore, weeklyRankAfter }`(기록한 주에서 이 기록을 뺀 순위 → 넣은 순위, RST-003).
- **cursor**: 순위 위치의 base64url (23.1장 LIMIT · OFFSET). 기록이 많아져 느려지면 사용자별 최고 기록 projection이나 Redis를 검토한다(23.1장, 측정 뒤).
- **테스트**: `RankingApiContractTest`를 MySQL · MariaDB에서(RNK-IT-001, 한국 시간 주 · 월 경계, cursor, 내 주변, 친구 빈 목록, 숨김 코스, 코스 상세 미리보기, 실제 검증을 거친 주간 순위 변화).

## 공유 링크 · 함께 달리기 초대 (SHR-001~004, 45장 대기실)

| API | 설명 |
| --- | --- |
| `POST /api/v1/shares` | `{ type: RUN\|COURSE\|LIVE_ROOM, referenceId }` → 201 `{ code, url }`. 같은 사람이 같은 대상을 다시 공유하면 같은 링크 |
| `GET /api/v1/shares/{code}` | 로그인 없이. `{ type, referenceId, courseId, preview }` |
| `GET /s/{code}` | 로그인 없이. 공유 페이지(HTML): 미리보기 태그, "달리모 앱에서 열기"(dallimo://share/{code}), 휴대폰이면 바로 앱을 연다 |
| `POST /api/v1/live-runs` | 방 만들기(45.1장 invariant). 방장은 JOINED |
| `GET /api/v1/live-runs` | 내가 참가한 예정 · 진행 중 방 |
| `GET /api/v1/live-runs/{id}?inviteCode=` | 참가자이거나 초대 코드가 있어야 본다. 아직 참가 전이면 내 줄이 INVITED |
| `POST /api/v1/live-runs/{id}/join` | `{ inviteCode }`. 시작 · 취소 · 가득 찬 방은 409 |
| `POST /api/v1/live-runs/{id}/ready` · `leave` · `cancel` | 준비(취소 포함) · 나가기(달리는 중이면 DNF) · 방장 취소 |

- **공유 코드** (16장): 헷갈리는 글자를 뺀 31글자 × 10자리 무작위(SecureRandom, 약 2^50). 내부 id를 URL에 쓰지 않는다. 만료는 없다(`expires_at` null).
- **링크 주소**: `url`은 `dallimo.share.public-base-url`, 없으면 요청이 들어온 서버 주소 + `/s/{code}`. 메신저가 `dallimo://`를 링크로 보여주지 않는 경우가 많아 http(s) 공유 페이지를 거친다(사용자 요청: 링크를 누르면 열려야 한다). 앱 설치 안내 · 스토어 링크 · 도메인 · Universal Link는 배포 단계.
- **받은 사람이 보는 것** (사용자 결정): 공유한 사람 이름, 기록 숫자(거리 · 시간 · 페이스 · 인증된 코스 기록), 코스 이름, 방 목표 · 예약 시각 · 인원. 자유 달리기 경로는 내보내지 않는다.
- **방 초대** (사용자 요청: 초대가 실제로 되어야 한다): 방 id만으로는 방을 볼 수 없고, 방 초대 링크(type LIVE_ROOM)의 코드가 있어야 보고 참가한다. 참가자 · 방장만 초대 링크를 만든다.
- **방 상태 전이** (45.1장 서버가 정한다): 참가자(방장 포함) 2명 이상이 모두 준비되고 예약 시각이 지나면 5초 뒤 출발 시각(`startsAt`)을 잡고 READY, 그 시각이 지나면 RUNNING(준비한 참가자도 RUNNING). 출발 전 누가 준비를 풀면 다시 WAITING. 읽거나 바꿀 때마다 방 행을 잠그고 다시 정한다.
- **아직 없는 것**: 친구 초대(POST /invite, WBS 8), 달리는 중 실시간 상태 · 결과 확정(46장 WebSocket, WBS 11). 달리기 · 결과 화면은 지금까지의 흐름(mock 채널)을 그대로 쓴다.
- **테스트**: `ShareAndRoomApiContractTest`를 MySQL · MariaDB에서(같은 링크 재사용, 경로 없는 미리보기, 공유 페이지 escape, 권한, 초대 코드 없이 404, 초대 링크로 참가 → 준비 → 5초 뒤 RUNNING, 시작 뒤 참가 불가, 준비 취소, 나가기 · 취소, 45.1장 invariant, 예약 시각 전 출발 안 함).

## 공통 규칙

- **응답** (명세 7.1장): `{ success, data, error, timestamp }`. `common/web/ApiResponse`
- **오류** (명세 27.1장): `common/error/ErrorCode` · `ApiException`을 던지면 `GlobalExceptionHandler`가 HTTP 상태와 코드로 바꿉니다. 요청 검증 실패는 `details`에 `[{ field, reason }]`. 예상하지 못한 오류는 내부 메시지를 내보내지 않습니다.
- **시간** (명세 40.4장): 서버 · JDBC · JSON 모두 UTC. 도메인은 `Instant`, 현재 시각은 `Clock` 빈으로.
- **스키마**: Flyway만 바꿉니다(JPA `ddl-auto: validate`). 이미 적용된 migration은 고치지 않고 새 버전을 추가합니다.
- **패키지** (명세 40.1장): `com.dallimo.dallimoserver.<도메인>/{api, application, domain, infrastructure}`, 공통은 `common/{config, error, security, time, web}`.

## 결정 사항 (명세에 없어 정한 것)

| 항목 | 결정 | 이유 |
| --- | --- | --- |
| `RESOURCE_NOT_FOUND` (404) | 27.1장 표에 없는 코드를 하나 더했다. 없는 주소처럼 도메인 코드(RUN_NOT_FOUND 등)가 없는 404에 쓴다 | 모든 오류를 같은 모양으로 돌려주기 위해 |
| Spring MVC 기본 오류 | 원래 HTTP 상태(400 · 405 · 415 …)는 유지하고 코드는 `VALIDATION_ERROR` | 27.1장에 해당 코드가 없음 |
| 문자셋 | DB 서버 기본값을 utf8mb4로(compose · 테스트). 22.4장 DDL은 그대로 | 한글 · 이모지 닉네임 |
| MariaDB 테스트 버전 | 11.4(LTS). 운영 버전이 정해지면 `MariaDbTestcontainersConfiguration`을 같은 버전으로 | 13.1장 "운영과 동일 MariaDB 버전" |
| MySQL 이미지 | `mysql:latest` 대신 `mysql:8.4`로 고정 | 테스트 결과가 이미지 업데이트로 바뀌지 않게 |
| 토큰 유효 시간 | Access 30분, Refresh 30일(회전할 때마다 연장), 재시도 허용 60초 | 명세에 값 없음 |
| 이메일 로그인 오류 코드 | `INVALID_CREDENTIALS` · `EMAIL_ALREADY_EXISTS` · `NICKNAME_ALREADY_EXISTS` 추가 | 27.1장 표에 없음 |
| 탈퇴 | 행은 남기고(22.3장) 이메일 · 비밀번호 · 닉네임 · 친구 코드를 지워 같은 이메일로 다시 가입 가능 | 개인정보 최소화. 보존 기간은 법적 검토 뒤 |
| 무차별 대입 제한 | 아직 없음. 로그인 시도 제한(RATE_LIMITED)은 운영 전에 붙인다 | |
| Run `activeSeconds` | finish 요청에 앱이 잰 달린 시간을 더했다. 서버는 시작~종료 시간을 넘지 않는지만 본다 | 사용자 결정. pause · resume 요청에 시각이 없어 오프라인 일시정지를 서버가 알 수 없음 |
| Run 끊김 기준 | point 사이가 15초 넘게 비면 일시정지로 보고 거리를 잇지 않는다 | 앱 엔진과 같은 값. 명세에 값 없음 |
| Run `courseId` | 있으면 `tbl_course`에 있어야 한다(없으면 404 `COURSE_NOT_FOUND`). `challengeId` · `liveRoomId`는 받기만 한다 | 도전 · Together 서버 전 |
| Batch 크기 | 한 번에 point 500개까지(넘으면 400) | 명세에 값 없음. 앱은 60개씩 |
| 끝난 뒤 Batch | 이미 받은 Batch를 다시 보내면 성공, 새 Batch는 409 `RUN_INVALID_STATE` | 응답을 못 받은 재전송이 끝난 뒤 와도 앱이 실패로 보지 않게 |
| 히스토리 cursor | `"startedAt 밀리초:id"`의 base64url | 6.4장 정렬 기준(started_at), 같은 시각은 id로 |
| 코스 저장 테이블 | `tbl_course_bookmark`를 ERD(20장 course_bookmark) 그대로 V5에 추가 | 22.4장 최종 DDL에 빠져 있음 |
| 코스 태그 테이블 | `tbl_course_tag(course_id, tag, seq)` 추가. 태그 6개 · 20자까지 | 43장 POST 요청에 tags가 있는데 ERD에 저장할 곳이 없음 |
| 코스 경로 정규화 | 정상 point를 10m 간격으로 다시 찍는다. 10개 미만 · 500m 미만이면 거부 | 명세에 값 없음(26장 "일정 간격으로 정규화/샘플링") |
| 코스 등록 거부 코드 | 경로가 모자라면 422 `RUN_POINT_INVALID` | 27.1장 "의미상 처리 불가한 GPS"와 가장 가깝다 |
| 숨김 · 비공개 코스 | 403 `RESOURCE_FORBIDDEN` | 앱이 "볼 수 없는 코스"로 구분 |
| 코스 설명 길이 | 1000자 | 명세에 규칙 없음 |
| 예상 시간 · 주간 러너 | 6'00"/km, 최근 7일 | 명세에 값 없음(앱 mock과 같은 기준) |
| 내 코스 API | `GET /users/me/courses?kind=` | MY-005인데 41~43장 표에 경로 없음 |
| 코스 cursor | 주변: 거리순 위치, 검색: 마지막 id (둘 다 base64url) | 27.3장 opaque cursor |
| 쿼리 파라미터 검증 | 컨트롤러에 `@Validated`를 붙이지 않는다. Spring MVC 기본 검증이 400으로 바뀐다 | 붙이면 AOP 검증 예외가 500이 됐다(`/runs?size=51`, `nickname-availability?nickname=` 포함, 이번에 고침) |
| 검증 기준값 (`VerificationPolicy` 2026-09-v1) | 출발 · 도착 반경 100m, 경로 허용 폭 50m, 최소 일치율 85% | 사용자 결정: 명세 10.5장 후보값. 실기기 테스트 뒤 조정하고 버전을 올린다 |
| 검증 거리 · 도착 판정 | 출발~도착 거리 ≥ 코스의 90%, 코스의 50% 이상 달린 뒤부터 도착 판정 | 명세에 값 없음 |
| 비정상 속도 | 움직인 시간 30초 이상 평균 초속 7m 초과면 거부 | 명세에 값 없음. 1km 세계 기록 평균(약 7.6m/s)에 가깝고 짧은 전력 질주는 걸리지 않게 |
| 검증 시점 | finish 커밋 뒤 비동기 + 1분마다 남은 PENDING 재검사 | 12.4장 비동기 후보. 응답을 늦추지 않고 서버 재시작에도 빠지지 않게 |
| 랭킹 기간 경계 | 한국 시간 월요일 0시(주간), 1일 0시(월간) | 사용자 결정. 저장은 UTC |
| 친구 랭킹 | 빈 목록 | 사용자 결정. 친구 기능(WBS 8) 뒤에 채운다 |
| 내 주변 순위 API | `GET /courses/{id}/rankings/me` | RNK-005인데 43장 표에 경로 없음 |
| 랭킹 동점 | 같은 기록이면 user_id 순 | 23.1장 쿼리 그대로 |
| 공유 테이블 | `tbl_share_link`를 ERD 그대로 V6에 추가 + `uk_share_target(creator_id, type, reference_id)` | 22.4장 최종 DDL에 빠져 있음. 같은 대상 같은 링크 |
| 공유 type | `LIVE_ROOM` 추가 (함께 달리기 초대) | 14.3장은 코스 · 기록 · Challenge만 |
| 공유 URL | 서버 공유 페이지 `/s/{code}`(http(s)) → 앱 `dallimo://share/{code}` | 사용자 요청: 링크를 누르면 열려야 한다 |
| 방 테이블 | `tbl_live_run_room` · `tbl_live_run_member`를 ERD대로 V6에 추가 + room `course_id` · `starts_at` · `updated_at` | 방 만들기 화면의 코스 선택, 서버가 정한 출발 시각(대기실 카운트다운) |
| 방 참가 | 초대 링크 코드가 있어야 방을 보고 참가(없으면 404). 최대 10명 | 방 id 추측으로 남의 방에 들어오지 않게. 인원은 명세에 값 없음 |
| 출발 규칙 | 2명 이상 모두 준비 + 예약 시각 → 5초 뒤 출발 | 명세에 값 없음(앱 mock과 같은 값) |
| 방 목록 API | `GET /live-runs` (내 예정 · 진행 중 방, 시작 뒤 3시간까지) | 45장 표에 경로 없음. 결과 확정 전이라 진행 중 방이 끝나지 않는다 |
