# DALLIMO Backend

달리모 서버. `dallimo-server/`가 Spring Boot 프로젝트입니다.

## 기술 기준

| 항목 | 값 | 근거 |
| --- | --- | --- |
| 언어 · 빌드 | Java 21, Gradle(Groovy) wrapper 9.7.1 | 사용자 결정 |
| 프레임워크 | Spring Boot 4.1.1 (Web MVC, Validation, Data JPA, JDBC, Flyway, Actuator, WebSocket, Data Redis) | 명세 40.3장 |
| 실시간 상태 | Redis 7.4 | 명세 8장, ADR-005 |
| DB | MySQL 8.4(로컬 · 개발) / MariaDB(운영) | 명세 15.2장, ADR-004 |
| 마이그레이션 | Flyway `src/main/resources/db/migration` (V1~V3 = 명세 22.4장 DDL 그대로, V4부터 추가분) | 명세 22.4장 |
| 테스트 | JUnit 5 + Testcontainers (MySQL 8.4 · MariaDB 11.4 · Redis 7.4) | 명세 13.1장, 40.3장 |

## 로컬 실행

```bash
cd backend/dallimo-server
docker compose up -d          # MySQL 8.4 (utf8mb4, UTC) + Redis 7.4
./gradlew bootRun             # 기본 프로필 local → Flyway가 스키마를 만든다
curl localhost:8080/actuator/health
```

Docker만 있으면 DB 없이도 `TestDallimoServerApplication`(테스트 소스)을 실행해 Testcontainers MySQL로 띄울 수 있습니다.

## 테스트

```bash
./gradlew test    # Docker 필요. MySQL · MariaDB · Redis 컨테이너를 띄워 migration · 스키마 계약 · 오류 응답 · 실시간 경쟁을 확인
```

CI: `.github/workflows/backend.yml` (backend 변경 PR · main push에서 `./gradlew build`).

## 프로필 (명세 15.3장)

| 프로필 | DB | 접속 정보 |
| --- | --- | --- |
| local (기본) | docker compose MySQL · Redis | `application-local.yaml` (로컬 전용 값, `DB_USERNAME` · `DB_PASSWORD`로 덮어쓰기 가능) |
| dev | MySQL | 환경변수 `DB_URL` · `DB_USERNAME` · `DB_PASSWORD`, Redis `REDIS_HOST` · `REDIS_PORT` · `REDIS_PASSWORD`, Push `EXPO_ACCESS_TOKEN`(선택) |
| test | Testcontainers | 테스트가 넣는다 |
| prod | MariaDB | 환경변수 `DB_URL` · `DB_USERNAME` · `DB_PASSWORD`, Redis `REDIS_HOST` · `REDIS_PORT` · `REDIS_PASSWORD`, Push `EXPO_ACCESS_TOKEN`(선택) |

비밀 값(DB · OAuth · Push · S3)은 저장소에 넣지 않습니다.

## 인증 (사용자 결정: 이메일 · 비밀번호 · 닉네임, 소셜 로그인 없음)

| API | 설명 |
| --- | --- |
| `POST /api/v1/auth/signup` | `{ email, password, nickname, deviceId }` → 201 토큰 + 사용자. 가입하면 바로 로그인 |
| `POST /api/v1/auth/login` | `{ email, password, deviceId }` |
| `POST /api/v1/auth/refresh` | `{ refreshToken, deviceId }` → 새 Access · Refresh Token (회전) |
| `POST /api/v1/auth/logout` | Bearer. 이 기기 세션을 끊는다 (204) |
| `GET · PATCH · DELETE /api/v1/users/me` | 내 정보 · 닉네임 변경 · 탈퇴(모든 기기 세션 끊음). PATCH는 JSON `{ nickname }` 또는 multipart `nickname?, profileImage?`(41장) |
| `DELETE /api/v1/users/me/profile-image` | 프로필 사진 빼기 (명세 없음) |
| `GET /files/{key}` | 올린 프로필 사진 (로그인 없이, 1년 캐시) |
| `GET /api/v1/users/nickname-availability?nickname=` | 로그인 없이. `{ available }` |

- **Access Token**: JWT(HS256) 30분. `sub` = 사용자 id, `sid` = 세션 id. 요청마다 세션이 살아 있는지 확인해서 로그아웃 · 같은 기기 재로그인 · 탈퇴하면 남은 Access Token도 바로 막힌다.
- **Refresh Token**: `{세션 id}.{256비트 무작위}` 30일. 서버에는 SHA-256 해시만(`tbl_refresh_token`, 기기마다 한 줄). refresh할 때마다 새 토큰으로 바뀌고, 바로 전 토큰은 60초 동안만 다시 받아 준다(응답 유실 재시도). 그 뒤 옛 토큰이나 다른 기기에서 온 토큰은 탈취로 보고 세션을 끊는다.
- **오류**: 만료 `401 TOKEN_EXPIRED`(앱이 refresh 후 재시도), 그 밖 `401 AUTH_REQUIRED`(다시 로그인), 로그인 실패 `401 INVALID_CREDENTIALS`, 중복 `409 EMAIL_ALREADY_EXISTS` · `NICKNAME_ALREADY_EXISTS`.
- **비밀번호**: 8~64자, 영문과 숫자 함께, 공백 없음. BCrypt(`{bcrypt}` 접두어)로 저장.
- **프로필 사진**: JPG · PNG 5MB까지(넘으면 413). 서버가 가운데를 정사각형으로 잘라 512px JPEG로 다시 만든다(`ProfileImages`). EXIF(촬영 위치 등)는 남지 않고 휴대폰 사진 회전 정보는 반영한다. 사진이 틀리면 닉네임도 바꾸지 않는다. 파일은 DB 커밋 뒤 정리(바꾸면 옛 사진, 실패하면 새 사진, 빼기 · 탈퇴면 그 사진을 지운다). 저장은 `ImageStorage` 경계 뒤 서버 디스크(`LocalDiskImageStorage`, `dallimo.storage.local-dir` · `public-base-url`, 운영은 `STORAGE_LOCAL_DIR` · `STORAGE_PUBLIC_BASE_URL`). 사진을 바꾸거나 닉네임을 바꾸는 PATCH는 사람마다 분당 10번.
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
| `POST /api/v1/runs` | `{ clientRunUuid, mode, courseId?, challengeId?, liveRoomId?, startedAt, workout? }`. `workout { templateId?, version?, name }`은 인터벌 달리기(`mode: INTERVAL`)에만. 새로 만들면 201, 같은 `clientRunUuid`면 200과 같은 Run. 다른 사용자의 `clientRunUuid`면 409 `IDEMPOTENCY_CONFLICT` |
| `POST /api/v1/runs/{id}/points` | `{ batchUuid, fromSeq, toSeq, points[] }` (최대 500개). `Idempotency-Key` 헤더를 보내면 batchUuid와 같아야 한다 |
| `POST /api/v1/runs/{id}/pause` · `resume` | RUNNING ↔ PAUSED. 상태가 맞지 않으면 409 `RUN_INVALID_STATE` |
| `POST /api/v1/runs/{id}/finish` | `{ endedAt, lastSeq, activeSeconds?, workoutSteps? }`. `workoutSteps`는 인터벌 달리기의 구간별 결과(끝낼 때 한 번 저장). 빠진 seq가 있으면 200 + `status: FINISHING`, 다 있으면 FINISHED와 거리 · 시간 · 페이스. 이미 끝났으면 같은 결과 |
| `GET /api/v1/runs?cursor=&size=&mode=` | 내 FINISHED 기록, `startedAt` 최신순. size 1~50(기본 20). `mode`를 주면 그 모드만(최근 인터벌 달리기). 항목에 `workoutName` |
| `GET /api/v1/runs/{id}` | `{ summary, splits, path, verification, challenge, workout }`. path는 표시용으로 400개 이하. `workout { templateId, version, name, steps[] }`은 인터벌 달리기일 때 |

- **멱등** (25.2장): Run은 `clientRunUuid` UNIQUE. Batch는 `tbl_run_sync_batch`에 `batchUuid`를 남긴다. 같은 Batch를 다시 보내면 성공(내용이 다르면 409). point는 `(run_id, seq)` UNIQUE + `ON DUPLICATE KEY UPDATE`로 겹쳐 와도 한 번만 저장. 같은 Run 요청은 Run 행을 잠가(`PESSIMISTIC_WRITE`) 차례로 처리한다.
- **거리 · 시간** (42.3장): 앱이 보낸 누적 거리는 받지 않는다. 서버가 point로 다시 계산한다(`RunMetrics`). 기준은 앱 엔진과 같다: accuracy 20m 초과 제외, 12m/s 초과는 튄 point(3번 연속이면 새 기준점), 제외한 point 다음은 잇지 않음, 15초 넘게 비면 일시정지로 보고 잇지 않음. 달린 시간은 앱이 보낸 `activeSeconds`를 받되 시작~종료 시간을 넘지 않게 자른다. 없으면 시작~종료 시간. 평균 페이스는 50m 이상일 때만.
- **FINISHING 판정**: seq 1부터 빈틈없이 이어진 마지막 seq(`lastContiguousSeq`)가 `lastSeq`보다 작으면 FINISHING.
- **검증 상태**: 코스를 쓰는 모드(COURSE · PB · CHALLENGE)이고 `courseId`가 있으면 PENDING, 아니면 NONE. 검증 엔진(26장)은 아직 없다.
- **테스트**: `RunApiContractTest`를 MySQL · MariaDB에서 모두 돌린다(RUN-IT-001~007 + 상태 · 검증 · 목록). `RunMetricsTest`는 거리 계산.

## Course API (명세 43장)

| API | 설명 |
| --- | --- |
| `GET /api/v1/courses/nearby?lat=&lng=&radius=&cursor=&size=` | 로그인 없이도. 출발점이 반경(m, 100~20000, 기본 5000) 안인 코스를 가까운 순으로 |
| `GET /api/v1/courses/search?query=&cursor=&size=` | 로그인 없이도. 이름 · 지역 · 태그로 찾기, 최근 등록순 (CRS-003) |
| `GET /api/v1/courses/{id}` | 로그인 없이도. 상세 + 줄인 경로(1000점 이하) + 고도 그래프. 로그인하면 내 기록 · 저장 여부 |
| `GET /api/v1/courses/{id}/route` | 로그인 없이도. 정규화한 경로 전체 |
| `POST /api/v1/courses` | `{ sourceRunId, name, description?, tags?, region?, recommendedTime? }` → 201 상세 |
| `POST /api/v1/courses/{id}/reviews` | 평가 쓰기(REV-001) `{ runId?, rating 1~5, signalScore · nightScore · crowdScore · surfaceScore 1~3?, hasToilet?, hasWater?, content? }`. 이 코스를 인증 완주한 사람만(아니면 403). 한 사람 한 평가, 다시 쓰면 바뀐다 |
| `GET /api/v1/courses/{id}/reviews?cursor=&size=` | 로그인 없이도. 최근 먼저 `{ id, nickname, isMine, rating, …, content, createdAt }` |
| `DELETE /api/v1/courses/{id}/reviews/me` | 내 평가 지우기 (204) |
| `POST /api/v1/courses/{id}/reports` | 신고(CREG-005) `{ reason: DANGER\|PRIVATE_PROPERTY\|WRONG_INFO\|OTHER, content? }` → 204. 한 사람 한 번, 다시 하면 사유가 바뀐다 |
| `POST · DELETE /api/v1/courses/{id}/bookmarks` | 204. 여러 번 보내도 같다 |
| `GET /api/v1/users/me/courses?kind=CREATED\|SAVED\|FINISHED` | 내 코스(MY-005): 등록 · 저장 · 완주 |

- **코스 등록** (43.1장): 내 FINISHED Run만 된다(남의 것 403, 끝나지 않음 409 `RUN_INVALID_STATE`, 없음 404 `RUN_NOT_FOUND`). Run point 중 거리 계산과 같은 판정(`RunMetrics`)을 통과한 point만 이어서 10m 간격으로 다시 찍는다(`CourseRoute`). 정상 point가 10개 미만이거나 500m 미만이면 422 `RUN_POINT_INVALID`. 경로는 이때 한 번 만들고 바꾸지 않는다(route snapshot 불변). 새 코스는 `NEW` · `PUBLIC`.
- **보이는 코스**: 삭제 · `HIDDEN` · `BLOCKED`는 목록에서 빠지고 상세는 403 `RESOURCE_FORBIDDEN`. `PRIVATE`은 만든 사람만 본다.
- **주변 조회** (23.2장): 위 · 경도 bounding box로 후보를 줄인 뒤 애플리케이션에서 출발점까지 실제 거리를 계산한다. 공간 인덱스는 쓰지 않는다.
- **숫자**: 코스 1위 · 완주자 수 · 내 기록은 공식 기록(`tbl_course_record`)만 센다. 검증(WBS 5) 전이라 지금은 비어 있다. 주간 러너 수는 최근 7일 이 코스를 끝까지 달린(FINISHED) 사람 수. 예상 시간은 6'00"/km.
- **평가 · 러닝 환경** (REV-001 · CRS-102): ERD `course_review` 그대로 V10 + `has_toilet` · `has_water` · `updated_at`. 상세 `rating { avg, count, canReview, mine }`, `environment { signals · nightLight · crowd: LOW\|MEDIUM\|HIGH, surface: ROUGH\|NORMAL\|SMOOTH, toilet, water }`는 평가 평균(1~3을 1.67 · 2.34로 세 단계, 화장실 · 급수대는 "있다"가 절반 이상). 목록 한 줄에도 `ratingAvg` · `reviewCount` · `region`.
- **신고** (CREG-005): `tbl_course_report`에 쌓기만 한다. 신고가 쌓였을 때 숨길지(자동 · 운영 검토)는 20.2장 "코스 공개 정책"과 함께 정한다.
- **지역 · 추천 시간**: 앱이 출발점을 휴대폰 지오코더로 바꾼 지역 이름("대구 수성구")과 추천 시간대를 등록할 때 보낸다(V10 컬럼). 검색이 지역도 찾는다.
- **로컬 코스 데이터**: local 프로필에서만 `db/seed/local/R__local_seed_courses.sql`(수성못 둘레길 · 신천 강변 왕복 · 들안로 왕복, 만든 사람 "달리모")을 넣는다. 앱 mock 코스와 같은 OpenStreetMap 경로를 10m 간격으로 찍었다. 다시 만들 때: `node --experimental-strip-types scripts/gen-local-seed.mts`.
- **테스트**: `CourseApiContractTest`를 MySQL · MariaDB에서 모두 돌린다(등록 · 거부 · 주변 · 숨김 · 검색 · 지역 · 태그 검색 · 저장 · 내 코스 · 기록 숫자 · 평가 권한 · 다시 쓰기 · 환경 모으기 · 평가 목록 · 신고). `CourseRouteTest`는 경로 정규화.

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
- **항목**: `rank, userId, name, timeSec, paceSecPerKm(코스 거리 기준), relation(self · friend · normal), isPB(내 줄에서 이 기간 기록이 내 전체 최고인가)`.
- **친구 랭킹** (RNK-004): 나와 친구의 기록만으로 같은 방식으로 센다. 친구가 없으면 나 혼자, 비회원이면 빈 목록. 어느 랭킹이든 친구 줄은 `relation: friend`.
- **다른 곳에 붙는 값**: 코스 상세 `competition { leaderSec(전체 기간 1위), myWeeklyRank, weeklyTop(이번 주 1~3위), myEntry, friendBest }`, 러닝 상세 `verification { weeklyRankBefore, weeklyRankAfter, friendBest }`(기록한 주에서 이 기록을 뺀 순위 → 넣은 순위, RST-003). `friendBest { userId, name, timeSec, recordId }`는 친구 중 이 코스 최고 기록(전체 기간, CRS-104 · RST-004), 없으면 null. `recordId`는 도전 목표.
- **cursor**: 순위 위치의 base64url (23.1장 LIMIT · OFFSET). 기록이 많아져 느려지면 사용자별 최고 기록 projection이나 Redis를 검토한다(23.1장, 측정 뒤).
- **테스트**: `RankingApiContractTest`를 MySQL · MariaDB에서(RNK-IT-001, 한국 시간 주 · 월 경계, cursor, 내 주변, 친구 랭킹 · 친구 최고 기록, 숨김 코스, 코스 상세 미리보기, 실제 검증을 거친 주간 순위 변화).

## 공유 링크 · 함께 달리기 초대 (SHR-001~004, 45장 대기실)

| API | 설명 |
| --- | --- |
| `POST /api/v1/shares` | `{ type: RUN\|COURSE\|CHALLENGE\|LIVE_ROOM, referenceId }` → 201 `{ code, url }`. 같은 사람이 같은 대상을 다시 공유하면 같은 링크. 도전은 보낸 사람 · 받은 사람만, 취소한 도전은 409 |
| `GET /api/v1/shares/{code}` | 로그인 없이. `{ type, referenceId, courseId, preview }` |
| `GET /s/{code}` | 로그인 없이. 공유 페이지(HTML): 미리보기 태그, "달리모 앱에서 열기"(dallimo://share/{code}), 휴대폰이면 바로 앱을 연다 |
| `POST /api/v1/live-runs` | 방 만들기(45.1장 invariant). 방장은 JOINED |
| `GET /api/v1/live-runs` | 내가 참가한 예정 · 진행 중 방 |
| `GET /api/v1/live-runs/recent?size=` | 내가 참가한 끝난 방, 최근 끝난 순(기본 10, 최대 30). `[{ roomId, mode, targetDistanceM, targetSeconds, finishedAt, myRank, memberCount, myFinished }]` (SCR-T01 최근 결과) |
| `GET /api/v1/live-runs/{id}?inviteCode=` | 참가자이거나 초대 코드가 있어야 본다. 아직 참가 전이면 내 줄이 INVITED |
| `POST /api/v1/live-runs/{id}/invite` | `{ userIds }` (TGT-002). 참가자가 자기 친구만. 초대받은 친구는 INVITED 줄로 들어가 목록에 방이 보인다 |
| `POST /api/v1/live-runs/{id}/join` | 초대받은 친구는 본문 없이, 링크로 온 사람은 `{ inviteCode }`. 시작 · 취소 · 가득 찬 방은 409 |
| `POST /api/v1/live-runs/{id}/ready` · `leave` · `cancel` | 준비(취소 포함) · 나가기(달리는 중이면 DNF) · 방장 취소 |
| `GET /api/v1/live-runs/{id}/result` | 끝난 방 결과(참가자만). 아래 함께 달리기 실시간 경쟁 |

- **공유 코드** (16장): 헷갈리는 글자를 뺀 31글자 × 10자리 무작위(SecureRandom, 약 2^50). 내부 id를 URL에 쓰지 않는다. 만료는 없다(`expires_at` null).
- **링크 주소**: `url`은 `dallimo.share.public-base-url`, 없으면 요청이 들어온 서버 주소 + `/s/{code}`. 메신저가 `dallimo://`를 링크로 보여주지 않는 경우가 많아 http(s) 공유 페이지를 거친다(사용자 요청: 링크를 누르면 열려야 한다). 앱 설치 안내 · 스토어 링크 · 도메인 · Universal Link는 배포 단계.
- **받은 사람이 보는 것** (사용자 결정): 공유한 사람 이름, 기록 숫자(거리 · 시간 · 페이스 · 인증된 코스 기록), 코스 이름, 방 목표 · 예약 시각 · 인원. 자유 달리기 경로는 내보내지 않는다.
- **도전 공유** (SHR-003): 미리보기에 `challengeStatus`(OPEN · RUNNING · SUCCESS · FAILED) · `challengerName` · `challengedName` · `challengeTargetSec`, 판정이 나면 `recordSeconds`(도전한 공식 기록). 공유 페이지 제목은 "○○님이 △△님의 기록을 넘었어요" · "△△님이 도전을 막아냈어요" · "○○님이 △△님의 기록에 도전해요". 링크를 만든 뒤 도전이 취소되면 404.
- **방 초대** (사용자 요청: 초대가 실제로 되어야 한다): 방 id만으로는 방을 볼 수 없고, 방 초대 링크(type LIVE_ROOM)의 코드가 있어야 보고 참가한다. 참가자 · 방장만 초대 링크를 만든다.
- **방 상태 전이** (45.1장 서버가 정한다): 참가자(방장 포함) 2명 이상이 모두 준비되고 예약 시각이 지나면 5초 뒤 출발 시각(`startsAt`)을 잡고 READY, 그 시각이 지나면 RUNNING(준비한 참가자도 RUNNING). 출발 전 누가 준비를 풀면 다시 WAITING. 읽거나 바꿀 때마다 방 행을 잠그고 다시 정한다.
- **친구 초대** (TGT-002): 참가한 사람이 출발 전에 자기 친구를 부른다(친구가 아니면 403, 초대받기만 한 사람은 409). 초대받은 자리도 인원(10명)에 든다. 초대받은 친구는 코드 없이 방을 보고 참가 · 거절(leave)한다. 준비 판정에는 들어가지 않고, 출발할 때까지 참가하지 않으면 방에서 빠진다(결과에 들어가지 않게).
- **테스트**: `ShareAndRoomApiContractTest`를 MySQL · MariaDB에서(같은 링크 재사용, 경로 없는 미리보기, 공유 페이지 escape, 권한, 초대 코드 없이 404, 초대 링크로 참가 → 준비 → 5초 뒤 RUNNING, 시작 뒤 참가 불가, 준비 취소, 나가기 · 취소, 45.1장 invariant, 예약 시각 전 출발 안 함).

## 함께 달리기 실시간 경쟁 (명세 8장 · 30장 · 46장 · 47장, WBS 11)

| 경로 | 설명 |
| --- | --- |
| `/ws` | STOMP over WebSocket (SockJS 없음). CONNECT 헤더 `Authorization: Bearer <Access Token>`. heartbeat 5초 |
| `SUBSCRIBE /topic/live-runs/{roomId}` | 참가자만. 구독하면 내 queue로 `SYNC_STATE`(방 상태 · 참가자 최신 상태, 끝난 방이면 결과) |
| `SUBSCRIBE /user/queue/live-runs` | 내게만 오는 `SYNC_STATE` · `ERROR { code, message, recoverable }` |
| `SEND /app/live-runs/{roomId}/state` | `{ seq, distanceM, elapsedSeconds, currentPaceSecPerKm, status: RUNNING\|FINISHED\|DNF, sentAt }` |
| `SEND /app/live-runs/{roomId}/heartbeat` | 연결 유지 (본문 없음) |
| `SEND /app/live-runs/{roomId}/cheer` | 응원 `{ toUserId? }` (없으면 모두에게). 함께 달리기(TOGETHER) 달리는 중에만, 한 사람이 10초에 한 번 (넘치면 조용히 버림) |
| 방 topic으로 오는 것 | `ROOM_STARTED`, `MEMBER_STATE { members[] }`, `MEMBER_CONNECTION { userId, connected }`, `MEMBER_FINISHED { userId, finishSec }`, `MEMBER_DNF { userId }`, `ROOM_FINISHED { result }`, `CHEER { fromUserId, fromName, toUserId }` |
| `GET /api/v1/live-runs/{id}/result` | `{ roomId, mode, targetDistanceM, targetSeconds, finishedAt, entries[{ userId, name, isMe, rank, status, timeSec, distanceM }], myRunId }` |

- **상태 저장** (47장): 달리는 중 최신 상태는 Redis `live:room:{id}:meta` · `live:room:{id}:member:{userId}` · `live:room:{id}:members`. 결과가 확정되면 DB(`tbl_live_run_member`)에 쓰고 Redis 키는 1시간 뒤 사라진다. 참가자 상태 갱신은 Lua 스크립트 하나로 seq를 비교해 늦게 온 값과 끝난 사람의 값을 버린다(30.3장).
- **서버가 확인하는 것**: 참가자 · 달리는 중인 방만 받는다. 경과 시간은 출발 뒤 흐른 시간 + 60초를 넘지 않게 자른다. 평균 초속 12m를 넘으면 받지 않는다. 완주(FINISHED)는 목표에 닿았을 때만(거리 20m · 시간 5초 여유), 거리 목표 완주는 목표 거리로 맞춘다.
- **연결** (32장): 15초 동안 상태 · heartbeat가 없으면 `DISCONNECTED`로 알리고, 다시 오면 `connected: true`. 끊긴 동안에도 개인 Run 기록은 앱이 계속한다.
- **방이 끝나는 때** (사용자 결정): 모두 완주 · 포기하면 바로. 레이스 · 거리 함께 달리기는 첫 완주 + 30분(남은 사람 DNF), 타임 어택 · 시간 함께 달리기는 목표 시간 + 5분(마지막으로 받은 거리로 순위). 어떤 방이든 출발 + 6시간이면 끝낸다(안전장치).
- **순위**: 레이스 = 완주 시간, 타임 어택 = 거리, 함께 = 순위 없음. DNF는 순위 없음. 같으면 user_id 순.
- **개인 Run 연결** (45.1장): `POST /runs`의 `liveRoomId`가 내가 참가한 방이면 `tbl_live_run_member.run_id`에 잇는다. 결과의 `myRunId`.
- **응원** (SCREEN-SPECS Together "연결 상태, 응원"): 간격은 Redis `live:room:{id}:cheer:{userId}`(10초 NX)로 서버가 여러 대여도 같다. 레이스 · 타임 어택은 `ERROR RUN_INVALID_STATE`, 방에 없는 사람에게는 `VALIDATION_ERROR`.
- **최근 결과**: `tbl_live_run_member` × `tbl_live_run_room`(FINISHED)을 `ended_at` 최신순으로. 끝난 방의 참가자는 모두 FINISHED · DNF라 `memberCount`는 방 인원 그대로.
- **테스트**: `LiveRaceContractTest`를 MySQL · MariaDB(+ Redis)에서(레이스 상태 · 늦은 seq · 완주 · 마감 DNF + 최근 결과 · 레이스 응원 거부, 끊김 → 다시 연결 + 응원 · 간격 · 잘못된 대상 + 함께 달리기 모두 끝나면 바로 종료, 타임 어택 순위 + Run 연결, 참가자만 연결 · 구독).

## 친구 (명세 44장, FND-001~005, WBS 8)

| API | 설명 |
| --- | --- |
| `GET /api/v1/users/search?q=&cursor=&size=` | 닉네임 일부(대소문자 무시) 또는 친구 코드 정확히(`RUN-` 없이 · 소문자도). 코드가 맞는 사람이 맨 앞, 나머지는 닉네임 순. 나 · 탈퇴한 사람은 빠진다. 항목 `{ userId, nickname, profileImageUrl, relation: NONE\|FRIEND\|SENT\|RECEIVED, requestId }` |
| `POST /api/v1/friends/requests` | `{ userId }` → 요청 뒤 관계. 상대가 먼저 요청했으면 바로 FRIEND. 같은 요청을 다시 보내도 결과가 같다 |
| `GET /api/v1/friends/requests` | `{ received[], sent[] }` (`requestId, userId, nickname, profileImageUrl, requestedAt`) |
| `POST /api/v1/friends/requests/{id}/accept` · `reject` | 받은 사람만(아니면 404). 다시 해도 결과가 같고, 이미 다른 쪽으로 처리했으면 409 |
| `DELETE /api/v1/friends/{userId}` | 친구 끊기. 요청 중이면 보낸 요청 취소 · 받은 요청 거절. 관계가 없어도 204 |
| `GET /api/v1/friends` | 친구 목록(닉네임 순) `{ userId, nickname, profileImageUrl, since }` |
| `GET /api/v1/users/{userId}` | 프로필 `{ user(검색 항목과 같은 모양), lastRunAt, records[{ recordId, courseId, courseName, bestSec, recordedAt }] }`. 기록 · 마지막 러닝은 친구(와 나)에게만. `recordId`는 도전 목표 |

- **저장** (44.1장): `tbl_friendship` 한 줄이 두 사람 사이 관계(`user_low_id, user_high_id` 쌍, `requester_id`가 방향). 거절 · 취소 · 끊은 관계는 새 요청으로 다시 쓴다.
- **동시 요청** (FRD-IT-001): A→B · B→A가 같은 때 와도 한 줄이다. 먼저 넣은 쪽이 요청, 늦은 쪽은 중복 키를 받고 그 줄을 잠가 승인한다. 없는 줄을 `FOR UPDATE`로 읽으면 gap lock 때문에 서로 막혀(deadlock) 먼저 잠그지 않고 넣는다.
- **알리지 않는 것**: 거절 · 친구 끊기는 상대에게 알리지 않는다. 요청 알림(Push)은 WBS 10.
- **탈퇴**: 탈퇴하면 그 사람의 친구 · 요청을 모두 끝낸다(`CANCELED`). 목록 · 검색 · 프로필에서 빠진다.
- **프로필** (사용자 결정): 닉네임, 인증된 코스 기록(코스마다 최고 기록, 최근 순 5개, 볼 수 있는 코스만), 마지막으로 끝낸 러닝 시각. 자유 달리기 경로 · 위치는 없다.
- **테스트**: `FriendApiContractTest`를 MySQL · MariaDB에서(요청 → 승인 → 목록 → 삭제 → 다시 요청, 거절 · 잘못된 요청, 서로 요청하면 친구, 동시 요청 5번 한 줄, 닉네임 · 친구 코드 검색 · escape · 탈퇴 제외, 프로필 공개 범위 · 비공개 코스, 친구 초대 → 코드 없이 참가 → 참가하지 않은 초대는 출발 때 빠짐, 초대 거절).

## 도전 (명세 44장, CHL-001~004, WBS 9)

| API | 설명 |
| --- | --- |
| `POST /api/v1/challenges` | `{ targetCourseRecordId }` → 201. 친구의 인증 기록만(아니면 403), 내 기록 400, 없는 기록 404, 볼 수 없는 코스 403 |
| `GET /api/v1/challenges/{id}` | 보낸 사람 · 받은 사람만(아니면 404) |
| `POST /api/v1/challenges/{id}/cancel` | 보낸 사람만, 아직 달리지 않은(OPEN) 도전만. 달린 뒤면 409 |
| `GET /api/v1/challenges?userId=` | 보낸 · 받은 도전 최근 30개(취소 제외). `userId`가 있으면 그 친구와 주고받은 것만 |
| `POST /api/v1/runs` `challengeId` | 내 OPEN 도전이고 같은 코스면 Run을 잇고 RUNNING |
| `GET /api/v1/runs/{id}` `challenge` | 이 Run으로 한 도전 (결과 화면 판정) |

- **응답**: `{ id, status: OPEN|RUNNING|SUCCESS|FAILED|CANCELED, role: SENT|RECEIVED, challenger, target{ userId, nickname }, course{ id, name, distanceM }, targetRecordId, targetSec, resultSec, runId(보낸 사람에게만), createdAt, finishedAt, targetBest{ recordId, timeSec } }`.
- **판정** (사용자 결정, CHL-003): 이어진 Run의 코스 검증이 끝날 때 같은 트랜잭션에서 판정한다. 인증되고 공식 기록이 목표와 같거나 빠르면 SUCCESS, 느리거나 미인증 · 거부면 FAILED.
- **목표 기록** (사용자 결정): 도전을 만든 때의 친구 기록으로 고정(`target_record_id`). 친구가 기록을 줄이면 `targetBest`가 새 기록을 가리키고, 재도전(CHL-004)은 그 기록으로 새 도전을 만든다.
- **상대 알림**: Push는 WBS 10. 그 전에는 받은 사람이 도전 목록(`role: RECEIVED`)으로 결과를 본다.
- **테스트**: `ChallengeApiContractTest`를 MySQL · MariaDB에서(친구 기록만 · 내 기록 · 없는 기록 · 숨긴 코스, 받은 사람 · 남 보기, 실제 코스 검증으로 성공 · 느려서 실패 · 이탈 실패, 취소 규칙, 다른 코스 · 취소된 도전에는 Run이 이어지지 않음, 친구가 기록을 줄이면 재도전 목표, 친구를 끊으면 새 도전 불가).

## 알림 · Push (명세 14.2장, NTF, WBS 10)

| API | 설명 |
| --- | --- |
| `GET /api/v1/notifications?cursor=&size=` | 알림함 (최근 먼저) `{ id, type, title, body, link, read, createdAt }`. `link`는 앱 안 경로 |
| `POST /api/v1/notifications/{id}/read` | 읽음 (내 알림만, 아니면 404) |
| `POST /api/v1/notifications/read-all` · `GET /api/v1/notifications/unread-count` | 모두 읽음 · 안 읽은 수 |
| `PUT /api/v1/users/me/push-token` | `{ token, platform: ios\|android }`. 이 기기(로그인 세션의 deviceId) Expo Push 토큰 |
| `DELETE /api/v1/users/me/push-token` | 알림 권한을 껐을 때 |
| `GET · PUT /api/v1/users/me/notification-settings` | `{ friend, live, record }` 종류별 Push. 꺼도 알림함에는 남는다 |

- **알림 종류** (사용자 결정): 꼭 필요한 것만.
  - Push로 보내는 것:
    - `FRIEND_REQUEST`: 친구 요청. 새 요청일 때만.
    - `LIVE_INVITE`: 함께 달리기 초대.
    - `LIVE_CANCELED`: 예약한 방을 방장이 취소. 참가 · 초대된 사람에게 보낸다.
    - `RECORD_BEATEN`: 친구의 새 공식 기록이 내 이 코스 최고 기록을 처음 넘었을 때.
  - 알림함에만 남기는 것: `CHALLENGE_DEFENDED`(친구의 도전을 막아냄).
  - 명세의 `LIVE_START`는 뺐다. 모두 대기실에서 준비해야 출발하므로 이미 화면을 보고 있다.
  - 명세의 `CHALLENGE`(도전을 받음)도 뺐다. 도전은 상대가 출발할 때 만들어져 받는 순간 할 일이 없고, 넘었으면 `RECORD_BEATEN`으로 알린다.
  - `LIVE_REMINDER`(10분 전)는 앱이 휴대폰에 예약하는 로컬 알림이다.
- **보내지 않는 때**: 그 종류를 설정에서 껐을 때, 밤 10시~아침 8시(한국 시간), 등록한 기기가 없을 때. 알림함에는 그대로 남는다.
- **발송**: 알림을 저장한 트랜잭션이 커밋된 뒤 비동기로 보낸다. 요청 응답을 늦추지 않고, 롤백된 알림은 보내지 않는다.
  - Expo Push API(`https://exp.host/--/api/v2/push/send`)로 100개씩 묶어 보낸다(`PushSender` 경계).
  - ticket이 `DeviceNotRegistered`면 토큰을 지운다(886행 invalid token).
  - 로컬 · 테스트는 `dallimo.push.provider: log`로 보내지 않고 로그만 남긴다.
- **토큰**: 기기마다 하나, 한 토큰은 한 사용자에게만 있다. 같은 휴대폰에서 다른 계정으로 로그인하면 토큰이 옮겨 간다. 로그아웃하면 그 기기 토큰, 탈퇴하면 모든 토큰을 지운다.
- **실제 Push를 받으려면 (코드로 할 수 없는 준비)**
  1. Expo 계정으로 `cd frontend && npx eas init`을 실행한다. `app.json`에 `extra.eas.projectId`가 생기고, 앱이 이 값으로 Push 토큰을 받는다. 없으면 토큰을 받지 않는다.
  2. Android: Firebase 프로젝트를 만들고 FCM V1 서비스 계정 키를 `npx eas credentials`로 EAS에 올린다.
  3. iOS: Apple Developer 유료 계정이 필요하다. `npx eas build`가 APNs 키를 만들어 준다.
  4. 개발 빌드(`npx eas build --profile development`)로 실기기에 설치한다. Expo Go에서는 원격 Push를 받을 수 없다.
  5. 서버: 로컬에서 실제로 보내 보려면 `application-local.yaml`의 `dallimo.push.provider`를 `expo`로 바꾼다. Expo "Enhanced push security"를 켰으면 `EXPO_ACCESS_TOKEN` 환경변수를 넣는다.
- **테스트**:
  - `NotificationApiContractTest`를 MySQL · MariaDB에서 돌린다. 가짜 발송기로 누구에게 무엇이 가는지 본다.
    - 친구 요청 · 알림함 · Push · 읽음 권한
    - 설정을 꺼도 알림함에는 남음
    - cursor · 모두 읽음
    - 초대 · 예약 방 취소 · 예약 없는 방 취소
    - 기록을 처음 넘을 때 한 번 · 막아낸 도전은 알림함에만
    - 토큰 옮김 · 없어진 기기 · 로그아웃 · 탈퇴
  - 밤 시간 규칙은 `QuietHoursTest`에서 따로 본다.

## 친구 활동 (명세 ACT-001~002, SCR-M06)

| API | 설명 |
| --- | --- |
| `GET /api/v1/activities?cursor=&size=` | 친구와 나의 활동, 최근 먼저. `{ id, type, userId, nickname, isMine, createdAt, courseId, courseName, courseDistanceM, timeSec, previousSec, rank, targetNickname, targetSec, targetIsMe }` |

- **활동 종류** (SCR-M06 "PB, 코스등록, Challenge, 랭킹 이벤트"): `PB`(코스 첫 공식 기록 · PB 갱신, `previousSec` 이전 최고), `COURSE_CREATED`, `CHALLENGE_WON`(도전 성공), `WEEKLY_TOP`(이번 주 코스 3위 안으로 올라섬, `rank`).
- **만드는 곳** (12장 ActivityService "행동 이벤트 생성"): 코스 검증이 공식 기록을 만들 때(PB · 랭킹), 코스 등록, 도전 판정. 같은 트랜잭션 안에서 `tbl_activity`에 쓴다(`Propagation.MANDATORY`).
- **보이는 것**: 친구와 나의 활동만. 숨김 · 차단 · 삭제 · 남의 비공개 코스에 딸린 활동은 뺀다(한 쪽을 채우도록 몇 번 더 읽는다). 좋아요 · 댓글은 없다(피드를 중심 IA로 만들지 않는다, 65장).
- **테스트**: `ActivityApiContractTest`를 MySQL · MariaDB에서(코스 등록 · 첫 기록 · 느린 기록은 없음 · PB 갱신 · 주간 1위 · 도전 성공 · 친구 아닌 사람 · cursor · 숨긴 코스 · 로그인 · 5위에서 3위로 올라섬).

## 요청 제한 · App Link · 누적 통계 (Hardening)

| 항목 | 내용 |
| --- | --- |
| 요청 제한 (27장 `RATE_LIMITED` 429) | 로그인 · 가입 IP마다 분당 10번, 사용자 · 코스 검색 사람마다 60번, 친구 요청 사람마다 20번, 공유 링크 해석 · 공유 페이지 IP마다 60번, 실시간 연결(STOMP CONNECT) 사람마다 20번, 프로필 바꾸기(PATCH /users/me, 사진 포함) 사람마다 10번. 넘으면 `Retry-After`와 함께 429 |
| `GET /.well-known/apple-app-site-association` · `/.well-known/assetlinks.json` | App Link · Universal Link 확인 파일(로그인 없이). 공유 페이지 `/s/*`만 앱으로. 값이 없으면 404 |
| `GET /api/v1/users/me` | `stats { runCount, totalDistanceM, totalActiveSec }` (MY-002, 끝난 러닝만) |

- **요청 제한 구현**: Redis 고정 창(INCR + 첫 번째에만 만료, Lua 하나)이라 서버가 여러 대여도 같은 값. 인증 필터 뒤에서 돌아 로그인한 사람은 사람마다 센다. Redis에 닿지 못하면 막지 않는다. 값은 `dallimo.rate-limit.*`(`enabled`, `window`, `login`, `search`, `friend-request`, `share-resolve`, `ws-connect`, `profile-update`), 테스트 프로필은 끈다.
- **App Link 설정**: `dallimo.share.app-links.ios-app-ids`(팀ID.번들ID), `android-package`, `android-sha256`. 운영은 `APP_LINK_IOS_APP_IDS` · `APP_LINK_ANDROID_PACKAGE` · `APP_LINK_ANDROID_SHA256` · `SHARE_PUBLIC_BASE_URL`. 앱은 `APP_LINK_DOMAIN` · `IOS_BUNDLE_ID` · `ANDROID_PACKAGE`로 빌드한다(frontend `app.config.ts`).
- **테스트**: `RateLimitApiTest`(로그인 · 검색 사람마다 · 공유 해석), `AppLinksTest`, 확인 파일 없음은 `ShareAndRoomApiContractTest`, 누적 통계는 `CourseApiContractTest`.

## 인터벌 달리기 (명세 123장 Training, 126장 Workout API)

| API | 설명 |
| --- | --- |
| `GET /api/v1/workouts` | 내 인터벌, 최근에 고치거나 만든 것 먼저. `{ id, name, description, version, blocks[], createdAt, updatedAt, lastRunAt, runCount }` |
| `POST /api/v1/workouts` | `{ name, description?, blocks[{ type: STEP · REPEAT, repeatCount, steps[{ stepType, endConditionType, endConditionValue, targetType, targetMin, targetMax }] }] }` → 201 (버전 1) |
| `GET · PUT · DELETE /api/v1/workouts/{id}` | 내 것만(남의 것 403, 없거나 지운 것 404). PUT은 버전을 올리고 옛 버전 구간은 남긴다. DELETE는 지운 표시만(달린 기록은 남는다) 204 |
| `POST /api/v1/workouts/{id}/duplicate` | 같은 구성으로 새 인터벌 "이름 복사본" (버전 1) 201 |

- **모델** (123.2 · 123.3장): `tbl_workout_template`(버전) → `tbl_workout_block`(`template_version`, STEP · REPEAT + 반복 횟수) → `tbl_workout_step`. 단위는 DISTANCE m, TIME 초, MANUAL 값 없음, TARGET_TIME 초(거리 구간에서만), TARGET_PACE 1km당 초. 목표는 `targetMin = targetMax`면 목표 값, `targetMax`만 있으면 최대.
- **달린 기록** (123.3장 "Run은 workout_template_id와 workout_version"): `tbl_run.workout_template_id · workout_version · workout_name`(만들 때), `tbl_run_workout_step`(끝낼 때, 그때 구간 정의 + 반복 몇 번째 + 실제 거리 · 시간 · 조건대로 마쳤는지). 인터벌을 고치거나 지워도 지난 기록은 그대로 다시 볼 수 있다. 추천 인터벌처럼 저장하지 않고 달리면 이름만 남는다.
- **확인**: 인터벌 달리기(INTERVAL)는 인터벌이 있어야 하고 코스가 없어야 한다. 다른 모드에 인터벌 · 구간 결과가 오면 400. 저장한 인터벌이면 내 것(지운 것 포함, 달리는 동안 지웠을 수 있다)이고 그 버전이 있어야 한다(아니면 404).
- **테스트**: `WorkoutApiContractTest`를 MySQL · MariaDB에서(저장 · 고치기 버전 · 복제 · 지우기 · 남의 것 · 잘못된 구성 11가지 · 50개 제한 · 인터벌 달리기 구간 결과 · 지난 버전 유지 · 추천 인터벌 · mode 목록 · 잘못된 연결).

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
| Run `courseId` | 있으면 `tbl_course`에 있어야 한다(없으면 404 `COURSE_NOT_FOUND`). `challengeId`는 내 OPEN 도전이고 같은 코스일 때만 잇고, 아니면 Run만 만든다. `liveRoomId`는 내가 참가한 방이면 방 결과에 잇는다 | 도전 · 방 연결 실패로 기록을 잃지 않게 |
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
| 친구 랭킹 | 나 + 친구 안에서 순위. 친구가 없으면 나 혼자 | RNK-004. 친구와 겨루는 화면이라 내 자리가 보여야 한다 |
| 친구 테이블 | 44.1장 DDL 그대로 V7에 추가 + `idx_friend_high_status(user_high_id, status)` | 친구 목록 · 친구 랭킹이 user_high_id 쪽으로도 찾는다 |
| 친구 검색 | 닉네임 일부 + 친구 코드 정확히, 1~40자, 한 페이지 20명(최대 50) | 사용자 결정. 41장에 `q, cursor, size`만 있다 |
| 인터벌 범위 | 이름 40자 · 설명 200자, 묶음 20개, 반복 묶음 안 구간 10개, 반복 2~30회, 반복을 풀어 200구간까지. 거리 50m~50km, 시간 10초~3시간, 목표 시간 10초~10시간, 목표 페이스 2'00"~20'00"/km. 한 사람 50개까지 | 명세에 값 없음 (123.2장 "2~N회") |
| 인터벌 버전 | `tbl_workout_block.template_version`을 더해 버전마다 구간을 따로 남긴다 | 123.3장 "템플릿 수정 이후에도 과거 러닝 결과를 재현". 초안 모델에는 버전별 구간을 둘 곳이 없다 |
| 인터벌 구간 결과 | 앱이 달리며 잰 구간별 거리 · 시간을 finish에 받는다. 서버는 범위만 본다 | 공식 기록이 아닌 개인 훈련 기록. 직접 넘긴 구간 시점은 앱만 안다 |
| 프로필 사진 저장 | 저장 방식을 `ImageStorage`로 나누고 지금은 서버 디스크. 주소는 `{public-base-url 또는 요청 서버 주소}/files/profile/{userId}/{uuid}.jpg` | 사용자 결정. 명세 13장 운영 구성은 S3. S3 · R2로 바꿀 때 구현 하나만 더한다. 서버를 여러 대로 늘리기 전에 바꿔야 한다(디스크는 서버마다 따로) |
| 프로필 사진 범위 | JPG · PNG, 5MB, 가로 · 세로 8000px까지, 512px 정사각형 JPEG(품질 0.85)로 다시 만든다 | 명세에 값 없음. 다시 만들어 위치 정보(EXIF GPS)가 퍼지지 않게 |
| 인터벌 지우기 | 지운 표시(`deleted_at`)만. 달린 기록의 연결은 남긴다 | 지난 기록을 다시 볼 수 있게 |
| 친구 프로필 API | `GET /users/{userId}` | FND-005 프로필인데 41 · 44장 표에 경로가 없다 |
| 친구 요청 응답 | 200 + 요청 뒤 관계, 상대가 먼저 요청했으면 바로 친구 | 44장에 응답이 없다. 다시 보내도 결과가 같게 |
| 친구 요청 오류 | 나에게 400, 없는 사용자 404, 남의 요청 승인 404, 이미 반대로 처리한 요청 409 | 27.1장에 친구 코드가 없어 기존 코드를 쓴다 |
| 친구 초대 | 참가자가 자기 친구만, 출발 전, 인원 10명 안. 참가하지 않은 초대는 출발 때 빠진다 | 45장에 규칙이 없다. 결과에 달리지 않은 사람이 DNF로 남지 않게 |
| 친구 최고 기록 | 코스 상세 · 러닝 상세에 친구 중 이 코스 최고 기록(전체 기간) | CRS-104 · RST-004. 앱에 자리가 있고 서버 값이 없었다 |
| 도전 테이블 | ERD `challenge` 컬럼대로 V8에 추가 + `finished_at`(판정 시각), `uk_challenge_run(challenger_run_id)` | 22.4장 최종 DDL에 빠져 있음. 한 Run은 도전 하나 |
| 도전 대상 | 친구의 인증 기록만 | 사용자 결정. 명세 "친구 기록 도전", 상대 알림 "친구가 기록 도전을 보냈습니다" |
| 도전 판정 | 인증 + 공식 기록 ≤ 목표면 성공, 그 외 실패. 코스 검증과 같은 트랜잭션 | 사용자 결정. 검증된 기록만 쓴다(980행) |
| 도전 목록 API | `GET /challenges?userId=` 최근 30개, 취소 제외 | 44장 표에 목록 경로가 없다. 달리기 탭 최근 도전(65장) · 친구 프로필 |
| 재도전 목표 | 응답 `targetBest`(상대의 지금 최고 기록) | CHL-004. 도전의 목표는 고정이라 새 기록은 새 도전으로 |
| 달린 뒤 앱에서 버린 도전 | RUNNING으로 남는다 | 앱이 버린 러닝은 서버에 알리지 않는다(Run 취소 API 없음). 앱 목록은 판정 중으로 보여준다 |
| 내 주변 순위 API | `GET /courses/{id}/rankings/me` | RNK-005인데 43장 표에 경로 없음 |
| 랭킹 동점 | 같은 기록이면 user_id 순 | 23.1장 쿼리 그대로 |
| 코스 평가 테이블 | ERD `course_review` + `has_toilet` · `has_water` · `updated_at`, `uk(course_id, user_id)`. 점수는 rating 1~5, 환경 1~3 | CRS-102 화장실 · 급수를 완주자에게 묻는다. 한 사람이 평균을 여러 번 끌어올리지 않게 |
| 평가 자격 | 그 코스의 공식 기록(`tbl_course_record`)이 있는 사람. runId를 주면 그 기록, 없으면 최근 기록 | REV-001 "완주자 기반". 명세 요청의 runId는 받되 코스 상세에서 바로 쓸 수 있게 생략 가능 |
| 평가 목록 · 지우기 API | `GET /courses/{id}/reviews`, `DELETE /courses/{id}/reviews/me` | 43장 표에는 쓰기만 있다. 코스 상세에 평가를 보여줘야 한다 |
| 환경 단계 | 1~3 평균을 1.67 · 2.34로 나눠 세 단계 | 명세에 값 없음 |
| 신고 테이블 | `tbl_course_report(reason, content)`, `uk(course_id, user_id)`. 쌓기만 | CREG-005인데 ERD에 없다. 숨김 기준은 코스 공개 정책(20.2장)과 함께 |
| 코스 지역 · 추천 시간 | `tbl_course.region`(50자) · `recommended_time`(30자), 등록 요청에 받는다 | ERD에 없다. 지역은 앱이 휴대폰 지오코더로(외부 지도 API 없이) |
| 요청 제한 값 | 위 표. 1분 고정 창 | 명세는 대상 후보만 있다(27장). 공유 코드 추측 · 로그인 대입을 막을 만큼만 |
| 요청 제한 실패 시 | Redis 오류면 통과 | 요청 제한 때문에 로그인이 막히지 않게 |
| 누적 통계 위치 | `GET /users/me`의 `stats` | 명세 41장 UserProfileResponse. 앱이 기록 전체를 받아 더하던 것을 없앴다 |
| App Link 경로 | 공유 페이지 `/s/*`만 | 서버 주소의 다른 경로(API)는 브라우저로 남긴다 |
| 활동 테이블 | ERD `activity` + `value_int`(PB 이전 기록 · 주간 순위, 만든 때의 값) | 나중 기록으로 문구가 바뀌지 않게. ERD에는 대상만 있다 |
| 랭킹 활동 기준 | 이번 주 코스 3위 안으로 들어오거나 3위 안에서 순위를 올렸을 때 | 명세에 값 없음. 순위가 그대로면 남기지 않는다(같은 소식 반복 방지) |
| 활동 공개 범위 | 친구와 나. visibility는 FRIENDS만 쓴다 | 16장 "공개 범위는 정책화". 전체 공개 피드는 만들지 않는다 |
| 공유 테이블 | `tbl_share_link`를 ERD 그대로 V6에 추가 + `uk_share_target(creator_id, type, reference_id)` | 22.4장 최종 DDL에 빠져 있음. 같은 대상 같은 링크 |
| 공유 type | `LIVE_ROOM` 추가 (함께 달리기 초대) | 14.3장은 코스 · 기록 · Challenge만 |
| 도전 공유 | 보낸 사람 · 받은 사람만 만든다. 받은 사람은 로그인 없이 판정 · 목표 · 도전 기록 · 두 사람 닉네임을 본다. 취소한 도전은 만들지 못하고 이미 만든 링크도 404 | SHR-003. 도전은 두 사람 사이 일이라 둘만 공유를 시작한다 |
| 최근 결과 API | `GET /live-runs/recent` (끝난 방, 최근 10개 기본) | 45장 표에 경로 없음. 함께 달리기 홈 최근 결과(SCR-T01) |
| 응원 | STOMP `/app/live-runs/{id}/cheer`, 방 topic `CHEER`. 함께 달리기만, 한 사람 10초에 한 번 | SCREEN-SPECS Together 보조 정보 "응원". 메시지 · 간격은 명세에 없다. 승부 모드에서는 방해가 된다 |
| 공유 URL | 서버 공유 페이지 `/s/{code}`(http(s)) → 앱 `dallimo://share/{code}` | 사용자 요청: 링크를 누르면 열려야 한다 |
| 방 테이블 | `tbl_live_run_room` · `tbl_live_run_member`를 ERD대로 V6에 추가 + room `course_id` · `starts_at` · `updated_at` | 방 만들기 화면의 코스 선택, 서버가 정한 출발 시각(대기실 카운트다운) |
| 방 참가 | 초대 링크 코드가 있어야 방을 보고 참가(없으면 404). 최대 10명 | 방 id 추측으로 남의 방에 들어오지 않게. 인원은 명세에 값 없음 |
| 출발 규칙 | 2명 이상 모두 준비 + 예약 시각 → 5초 뒤 출발 | 명세에 값 없음(앱 mock과 같은 값) |
| 방 목록 API | `GET /live-runs` (내 예정 · 진행 중 방, 시작 뒤 3시간까지) | 45장 표에 경로 없음 |
| 실시간 경로 · 메시지 | STOMP `/ws`, `/topic/live-runs/{id}`, `/app/live-runs/{id}/state` · `heartbeat`, `/user/queue/live-runs`. 메시지 필드는 위 표 | 8.1장 경로 이름을 따르고 46장 필드를 서버 단위(초)로 맞췄다 |
| 방 종료 규칙 | 모두 끝나면 바로, 거리 목표 첫 완주 + 30분, 시간 목표 + 5분, 출발 + 6시간 | 사용자 결정(6시간은 안전장치로 더함) |
| 연결 끊김 기준 | 15초 동안 상태 · heartbeat 없음 | 명세에 값 없음. Run 끊김 기준과 같은 값 |
| 앱 상태 검증 | 경과 ≤ 출발 뒤 시간 + 60초, 평균 초속 ≤ 12m, 완주는 목표 도달(거리 20m · 시간 5초 여유) | 명세에 값 없음. 거짓 완주 · 순간 이동 값을 막는다 |
| STOMP heartbeat | 서버 · 앱 5초 | 휴대폰 망에서 소리 없이 끊긴 연결을 10초 안에 알아채고 다시 붙는다 |
| 실시간 broker | Spring 메모리 broker(서버 한 대) | 30.5장. 여러 대가 되면 외부 broker |
| 알림 테이블 | ERD `notification` 그대로 V9 + `tbl_push_token`(기기별 Expo 토큰) · `tbl_notification_setting`(종류별 Push) | ERD에 토큰 · 설정을 둘 곳이 없다 |
| Push 종류 | 친구 요청 · 함께 달리기 초대 · 예약 방 취소 · 친구가 내 기록을 넘음. 막아낸 도전은 알림함만 | 사용자 결정: 꼭 필요한 것만 (명세 LIVE_START · CHALLENGE는 우리 흐름에서 할 일이 없어 뺐다, LIVE_REMINDER는 앱 로컬 알림) |
| 밤 시간 | 한국 시간 22시~8시는 Push 없이 알림함만 | 사용자 결정 |
| 알림 API 추가분 | 모두 읽음 · 안 읽은 수 · Push 토큰 · 알림 설정 | 7장 표에는 목록 · 읽음만 있다 |
| Push 발송 경계 | `PushSender`(Expo · 로그 · 테스트용), 커밋 뒤 비동기 | 40장: Push 같은 외부 경계만 Port로 |
| receipt | ticket 단계의 DeviceNotRegistered만 처리. 나중에 오는 receipt 확인은 발송량이 늘면 붙인다 | 초기 규모 |
