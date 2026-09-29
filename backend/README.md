# DALLIMO Backend

달리모 서버. `dallimo-server/`가 Spring Boot 프로젝트입니다.

## 기술 기준

| 항목 | 값 | 근거 |
| --- | --- | --- |
| 언어 · 빌드 | Java 21, Gradle(Groovy) wrapper 9.7.1 | 사용자 결정 |
| 프레임워크 | Spring Boot 4.1.1 (Web MVC, Validation, Data JPA, JDBC, Flyway, Actuator) | 명세 40.3장 |
| DB | MySQL 8.4(로컬 · 개발) / MariaDB(운영) | 명세 15.2장, ADR-004 |
| 마이그레이션 | Flyway `src/main/resources/db/migration` (V1~V3 = 명세 22.4장 DDL 그대로) | 명세 22.4장 |
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
