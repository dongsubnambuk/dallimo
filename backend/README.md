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
