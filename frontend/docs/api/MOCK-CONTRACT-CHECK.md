# Mock · API 계약 대조 (119장 9번)

프론트엔드 mock repository가 명세 API 계약과 맞는지 하나씩 대조한 결과다.
기준은 명세서 7장(REST 목록 · 공통 응답 · 정책), 8장(WebSocket), 27장(오류 · Run 계약 · Pagination), 41~46장(OpenAPI 계약), 49장(엔진 경계)이다.
백엔드를 만들 때 이 문서를 API 명세 초안으로 쓴다.

## 표기

| 표기 | 뜻 |
| --- | --- |
| 일치 | 요청 · 응답 모양이 명세와 같다 |
| 변환 | 뜻은 같고 이름 · 단위 · 대소문자만 다르다. API 클라이언트가 바꾼다 |
| 명세 없음 | 앱이 쓰는데 명세에 경로나 필드가 없다. 백엔드에 추가하거나 결정이 필요하다 |
| 미구현 | 명세에 있지만 아직 화면이 없다 |
| 이번에 고침 | 이 대조에서 프론트를 명세에 맞췄다 |

## 1. 공통

| 명세 | 프론트 | 상태 | 메모 |
| --- | --- | --- | --- |
| 7.1 공통 응답 `{ success, data, error, timestamp }` | repository는 `data`만 돌려준다 | 이번에 고침 | `shared/api/contract.ts`에 `ApiResponse` · `ApiError` 타입 추가. API 클라이언트가 봉투를 풀고 repository 오류로 바꾼다 |
| 27장 오류 코드 | repository마다 오류 종류(`network` · `notFound` · `hidden` · `invalid` · `unauthorized`) | 변환 | 아래 1.1 표대로 바꾼다 |
| 27.3 cursor `{ items, nextCursor, hasNext }` | 히스토리 `{ items, nextCursor }`, 랭킹 `{ entries, nextCursor }` | 변환 | `hasNext`는 `nextCursor != null`과 같다. `CursorPage` 타입 추가 |
| 7.4 시간 ISO-8601 offset 포함 | 앱 안에서는 epoch ms | 변환 | `toIso` · `fromIso` 추가 |
| 7.4 페이스 sec/km 정수 | 엔진 결과가 소수였다 | 이번에 고침 | 엔진 결과 · mock 모두 정수로 반올림 |
| 7.4 거리 m 정수 | 기기 계산 거리는 소수 | 변환 | 공식 거리는 서버가 RunPoint로 다시 계산한다(42.3장). 서버 값은 정수로 받는다 |
| 6.3장 enum 대문자(`PENDING`, `VERIFIED` …) | 검증 상태는 소문자(`pending` …) | 변환 | RunVerification · RecordVerification. 다른 enum(RunMode, LiveRoomStatus 등)은 명세와 같다 |

### 1.1 오류 코드 → 앱 오류

| HTTP · 코드 | 앱에서 |
| --- | --- |
| 401 `AUTH_REQUIRED` · `TOKEN_EXPIRED` | Refresh Token으로 한 번 재발급 후 재시도. 실패하면 `AuthError('unauthorized')` → 로그인 화면 |
| 403 `RESOURCE_FORBIDDEN` | 코스: `CourseRepositoryError('hidden')` |
| 404 `RUN_NOT_FOUND` · `COURSE_NOT_FOUND` | `RunResultNotFoundError`, `CourseRepositoryError('notFound')`, `LiveRoomError('notFound')`, `ShareNotFoundError` |
| 409 `RUN_INVALID_STATE` | 엔진이 서버 상태를 다시 읽어 맞춘다 |
| 409 `IDEMPOTENCY_CONFLICT` | 같은 멱등 키로 다른 내용을 보냈다. 재시도하지 않고 기록 오류로 남긴다 |
| 422 `RUN_POINT_INVALID` | Batch를 FAILED로 두고 재시도하지 않는다(50.3장) |
| 400 `VALIDATION_ERROR` | 코스 등록은 `CourseRepositoryError('invalid')`에 서버 메시지 |
| 429 · 500 · 연결 실패 | `network`. 화면은 "연결을 확인하고 다시 시도" |

## 2. 인증 · 사용자 (41장 → 이메일 로그인으로 변경)

**사용자 결정으로 소셜 로그인을 빼고 이메일 · 비밀번호 · 닉네임 가입으로 바꿨다** (FOUNDATION-DECISION-LOG 30항). 서버에 구현되어 있다.

| API | 프론트 | 상태 | 메모 |
| --- | --- | --- | --- |
| POST /auth/signup `email, password, nickname, deviceId` → 201 | `AuthRepository.signup` | 구현 | 명세 41장 POST /auth/social 대신. 409 `EMAIL_ALREADY_EXISTS` · `NICKNAME_ALREADY_EXISTS`, 400 비밀번호 규칙 |
| POST /auth/login `email, password, deviceId` | `login` | 구현 | 401 `INVALID_CREDENTIALS` (없는 이메일과 틀린 비밀번호를 구분하지 않음) |
| POST /auth/refresh `refreshToken, deviceId` | `refresh` | 구현 | 응답에 새 Refresh Token(회전). 401 `AUTH_REQUIRED`면 다시 로그인 |
| POST /auth/logout (Bearer) → 204 | `logout()` | 구현 | 요청 본문 없이 Access Token의 세션을 끊는다 |
| DELETE /users/me (Bearer) → 204 | `withdraw()` | 구현 | 명세 표에 없던 탈퇴 경로 |
| GET /users/me → `userId, email, nickname, profileImageUrl, friendCode` | `UserRepository.getMe()` | 구현 | provider 대신 email. 누적 통계(MY-002)는 아직 서버 집계가 없어 앱이 기기 기록으로 더한다 |
| PATCH /users/me `nickname` (JSON) · multipart `nickname?, profileImage?` | `updateMe` | 구현 | 새로 고른 사진이면 multipart로 닉네임과 한 번에 올린다(웹은 Blob, 앱은 `{ uri, name, type }`). 서버가 512px JPEG로 다시 만들어 `profileImageUrl`을 준다. JPG · PNG · 5MB가 아니면 400 · 413과 서버 문구를 그대로 보여준다 |
| DELETE /users/me/profile-image | `updateMe({ profileImageUri: null })` | 명세 없음 · 서버 구현 | 사진 빼기 |
| GET /users/nickname-availability?nickname= → `{ available }` | `checkNickname` | 구현 | 로그인 없이 부를 수 있다(가입 화면) |
| GET /users/search `q, cursor, size` | `FriendRepository.search(query, cursor)` → `httpFriendRepository` | 서버 구현 · 필드 추가 | 닉네임 일부 또는 친구 코드. 항목에 나와의 관계(`relation`, 요청 중이면 `requestId`)를 붙였다(UserSummary 필드가 명세에 없다) |
| GET /users/{userId} | `FriendRepository.profile(userId)` | 명세 없음 · 서버 구현 | 친구 프로필(FND-005). 코스 기록 · 마지막 러닝은 친구에게만 |

## 3. Run (42장, 27.2장)

| API | 프론트 | 상태 | 메모 |
| --- | --- | --- | --- |
| POST /runs `clientRunUuid, mode, courseId, challengeId, liveRoomId, startedAt` | 기록 동기화 `syncRun` → `httpRunApi` | 서버 구현 | 서버 id가 없으면 먼저 만든다(`clientRunUuid` 멱등, 새로 만들면 201 · 다시 보내면 200). 함께 달리기 러닝은 기기 계획(plan JSON)의 `liveRoomId`를, 도전 러닝은 `challengeId`를 보낸다. 서버 id는 숫자라 `httpRunApi`가 문자열로 바꾼다. 숫자가 아닌 mock 코스 id(`c-suseongmot` 등)는 `courseId: null`로 올린다(서버는 없는 코스면 404 COURSE_NOT_FOUND). 서버 주소가 없으면 `mockRunApi` |
| POST /runs/{id}/points `batchUuid, fromSeq, toSeq, points[]` | 기록 동기화 `syncRun` → `httpRunApi` | 서버 구현 | `Idempotency-Key` 헤더에 batchUuid를 함께 보낸다(7.3장). SQLite에 Batch UUID를 먼저 기록한 뒤 보낸다(50.2장). 연속 seq 60개씩, 실패하면 같은 batchUuid로 backoff 재전송. 422 · 409 IDEMPOTENCY_CONFLICT · 400 · 403은 FAILED. `toPointDto`로 이름 · 단위 변환, `qualityFlag`는 보내지 않는다 |
| POST /runs/{id}/pause · resume | 엔진 · SQLite 구간에만 | 서버 구현 · 앱은 부르지 않음 | 요청에 시각이 없어 오프라인에서 한 일시정지를 나중에 올릴 수 없다. 대신 finish에 `activeSeconds`를 보낸다(12항 13번) |
| POST /runs/{id}/finish `endedAt, lastSeq, activeSeconds` | 엔진 `finish()` → `syncRunNow` | 서버 구현 · 필드 추가 | `activeSeconds`(앱이 잰 달린 시간, 일시정지 제외)는 명세에 없는 필드다(사용자 결정). 서버는 거리만 point로 다시 계산하고 달린 시간은 이 값을 받되 시작~종료 시간을 넘지 않게 자른다. 남은 Batch를 보낸 뒤 요청. 응답 `status`가 FINISHING이면 빠진 Batch를 보내고 다시 요청. 오프라인이거나 20초 안에 못 끝내면 휴대폰에 저장한 결과로 보여주고 연결되면 이어서 올린다 |
| GET /runs/{id} → run detail | `RunResultRepository.get(id)` | 명세 없음 · 서버 구현 | 서버 응답: `{ summary(+courseName), splits[{ km, sec }], path[[위도, 경도]] (400개 이하), verification{ status, failureReason, matchRate, recordSeconds, previousBestSec, personalBest, policyVersion } }`. 앱 id는 `srv-{runId}`. 검증 결과 · 공식 기록 · PB · 주간 순위 변화(`weeklyRankBefore · After`)는 서버 값, 기기 기록도 서버에 올라간 뒤 서버 판정을 붙인다. 친구 최고 기록은 `verification.friendBest { userId, name, timeSec }`(인증된 코스 기록일 때). 앱이 쓰는 필드: `startedAt, finishedAt, distanceM, activeSec, avgPaceSec, splits, path(표시용으로 줄인 것), course{ id, name, timeSec }, target, verification, verificationReason, pb{ previousSec, improved }, weeklyRank{ before, after }, friendBest{ name, timeSec }` |
| POST /runs `workout`, POST /runs/{id}/finish `workoutSteps`, GET /runs `mode` · `workoutName`, GET /runs/{id} `workout` | 기록 동기화 `syncRun`(기기 계획의 인터벌 + 저장한 구간 경계 → 구간 결과), `RunResultRepository.list(cursor, size, mode)` · `get` | 명세 없음 · 서버 구현 | 인터벌 달리기(123장). 구간 결과 필드: `stepType, endConditionType, endConditionValue, targetType, targetMin, targetMax, repeatIndex, repeatCount, distanceM, elapsedSeconds, completed`. 숫자가 아닌 mock 인터벌 id는 이름만 보낸다 |
| GET /runs?cursor&size | `list(cursor, size)` | 서버 구현 | FINISHED만, `startedAt` 최신순(6.4장), size 1~50(기본 20), cursor는 `"startedAt 밀리초:id"`의 base64url. 항목: `runId, clientRunUuid, mode, status, courseId, startedAt, endedAt, distanceM, elapsedSeconds, avgPaceSecPerKm, verificationStatus`. 이번 실행에서 끝낸 기록(기기에만 있음 포함)은 첫 페이지에 기기 값으로 더하고 서버 쪽 같은 기록은 뺀다. 목록의 `pb`, 경로 미리보기(`preview`)는 명세 없음 → 서버 기록은 썸네일이 빈칸 |
| (기기 저장) | `saveFinished(input, synced)` | — | 서버 API가 아니라 기기 저장(11장 SQLite local_run). `clientRunUuid`와 `startedAt`을 함께 저장하도록 고침 |

### 3.1 인터벌 (126장 Workout)

| API | 프론트 | 상태 | 메모 |
| --- | --- | --- | --- |
| GET · POST /workouts, GET · PUT · DELETE /workouts/{id}, POST /workouts/{id}/duplicate | `WorkoutRepository.list · get · create · update · remove · duplicate` → `httpWorkoutRepository` (서버 주소가 없으면 `mockWorkoutRepository`) | 서버 구현 (DELETE는 명세 없음) | 구성은 `blocks[{ type, repeatCount, steps[] }]` 그대로 주고받는다. id는 숫자라 앱에서 문자열로. PUT은 버전을 올린다. 앱 검증(`entities/workout/validate.ts`)은 서버 범위와 같다. 추천 인터벌 3개는 앱에 둔다(`templates.ts`) |

## 4. 코스 · 랭킹 (43장)

| API | 프론트 | 상태 | 메모 |
| --- | --- | --- | --- |
| GET /courses/nearby `lat, lng, radius, cursor, size` | `getNearby({ center, radiusM })` → `httpCourseRepository` | 서버 구현 | 출발점까지 거리순. radius 100~20000m(기본 5000), size 1~50. 응답은 `{ items, nextCursor, hasNext }`. 앱은 첫 페이지(50개)만 받는다. 반경 안 코스가 많아지면 cursor를 붙인다. viewport는 아직 없다 |
| GET /courses/search `query, cursor, size` | 없음 | 서버 구현 · 앱 미사용 | 이름에 query가 들어간 코스, 최근 등록순. 지역 검색(SCR-E02) 화면은 아직 받은 목록을 이름 · 태그로 거른다 |
| GET /courses/{id} → CourseDetail | `getDetail(id)` | 명세 없음 · 서버 구현 | 서버 응답: `id, name, status, description, creatorName, distanceM, estimatedSec, difficulty, elevationGainM, tags, route[[위도, 경도]](1000점 이하), elevationProfile[[거리, 고도]], finisherCount, weeklyRunnerCount, myRecord{ bestSec, lastSec, finishCount }, competition{ leaderSec }, bookmarked, createdAt`. 지역 · 추천 시간 · 러닝 환경은 서버에 없어 앱이 비워 둔다(null · 빈 목록). `competition`에 `myWeeklyRank, weeklyTop(1~3위), myEntry, friendBest{ userId, name, timeSec }`. 숨김 · 비공개는 403 `RESOURCE_FORBIDDEN`, 없으면 404 `COURSE_NOT_FOUND`. 응답 필드가 정해지지 않았다. 앱이 쓰는 필드는 `entities/course/types.ts`의 `CourseDetail`(상태, 지역, 만든 사람, 거리, 예상 시간, 난이도, 오르막, 태그, 경로, 고도 프로필, 완주자 수, 이번 주 러너 수, 추천 시간, 환경, 내 기록, 경쟁 정보, 저장 여부) |
| GET /courses/{id}/route | 상세 안의 `route` | 서버 구현 · 앱 미사용 | 서버는 `[{ seq, latitude, longitude, altitudeM }]` 전체(10m 간격)를 준다. 앱은 상세의 줄인 경로로 충분하다 |
| POST /courses `sourceRunId, name, description, tags` | `CourseRegistrationRepository.create(input)` → `httpCourseRegistration` | 서버 구현 | 201 + 상세. 앱의 기록 id(`run-N` · `srv-N`)를 서버 Run id로 바꿔 보낸다(`serverRunId`). 이름 1~100자, 설명 1000자, 태그 6개 · 20자까지. 거부: 짧거나 정상 point가 모자라면 422 `RUN_POINT_INVALID`, 끝나지 않은 기록 409 `RUN_INVALID_STATE`, 남의 기록 403, 없는 기록 404. `recommendedTime`은 명세 요청 필드에 없어 보내지 않는다(SCR-E05 화면 요소에는 있다) |
| POST · DELETE /courses/{id}/bookmarks | `setBookmark(id, saved)` | 서버 구현 | 204. 여러 번 보내도 같다 |
| GET /courses/{id}/rankings `scope, period, cursor, size` | `RankingRepository.getPage(query)` → `httpRankingRepository` | 서버 구현 | scope `ALL · FRIENDS`, period `ALL · WEEKLY · MONTHLY`(한국 시간 월요일 · 1일 0시). 응답 항목: `rank, userId, name, timeSec, paceSecPerKm, relation(self · friend · normal), isPB`. 친구 랭킹은 나 + 친구 안에서 순위(친구가 없으면 나 혼자) |
| GET /courses/{id}/rankings/me `scope, period` | `getMyStanding(courseId, scope, period)` → `{ total, entry, around }` | 명세 없음 · 서버 구현 | RNK-005. 43장 표에 경로가 없어 정했다. 내 위아래 두 명 |
| GET /users/me/courses?kind=CREATED·SAVED·FINISHED | `getMine(kind)` | 명세 없음 · 서버 구현 | MY-005. 명세 표에 경로가 없어 정했다. 완주는 공식 기록(tbl_course_record)이 있는 코스 |
| POST /courses/{id}/reviews · reports | `writeReview()` · `getReviews()` · `deleteReview()` · `report()` | 서버 구현 | REV-001, CREG-005. 목록 · 지우기 경로는 명세 표에 없어 더했다 |

## 5. 친구 · 도전 (44장)

| API | 프론트 | 상태 | 메모 |
| --- | --- | --- | --- |
| GET /friends | `FriendRepository.list()`, `LiveRoomRepository.listFriends()` | 서버 구현 · 필드 추가 | `{ userId, nickname, profileImageUrl, since }`. 함께 달리기 친구 고르기도 이 목록 |
| POST /friends/requests `userId` | `FriendRepository.request(userId)` | 서버 구현 | 응답은 요청 뒤 관계(명세에 응답 없음). 상대가 먼저 요청했으면 바로 친구 |
| GET /friends/requests | `FriendRepository.requests()` | 서버 구현 | `{ received[], sent[] }` |
| POST /friends/requests/{id}/accept · reject | `accept(requestId)`, `reject(requestId)` | 서버 구현 | 받은 사람만. 거절은 보낸 사람에게 알리지 않는다 |
| DELETE /friends/{userId} | `remove(userId)` | 서버 구현 | 친구 끊기 · 보낸 요청 취소 · 받은 요청 거절 |
| POST /challenges `targetCourseRecordId` | `ChallengeRepository.create(recordId)` → `httpChallengeRepository` | 서버 구현 | 달리기 준비에서 "시작"을 누를 때 만든다(친구 프로필 코스 기록 "도전", 플레이 모드 라이벌 "친구 최고 · 도전", 결과 "다시 도전"). 서버에 닿지 못하면 목표만 두고 달린다. 코스 1위 · 이번 주 상위 기록은 서버 도전 없이 목표로만 |
| GET /challenges/{id} | `get(id)` | 서버 구현 | |
| POST /challenges/{id}/cancel | `cancel(id)` | 서버 구현 · 앱 미사용 | 달리기 전 도전은 목록에서 숨긴다(open) |
| GET /challenges `userId?` | `list(userId)` | 명세 없음 · 서버 구현 | 달리기 탭 "최근 도전"(65장), 친구 프로필 "주고받은 도전". 응답 `role · targetBest`는 명세에 없다 |
| GET /runs/{id} `challenge` | `RunResult.challenge` | 서버 구현 · 필드 추가 | 결과 화면 도전 판정(성공 · 실패 · 판정 중). 기록 목록에서 다시 열어도 도전 목표와 비교한다 |

## 6. Together (45장)

| API | 프론트 | 상태 | 메모 |
| --- | --- | --- | --- |
| POST /live-runs `mode, targetDistanceM, targetSeconds, courseId, scheduledAt` | `create(input)` → `httpLiveRoomRepository` | 서버 구현 | 45.1장 invariant 검사(레이스 = 거리, 타임 어택 = 시간). 방장은 JOINED로 들어간다. `inviteeIds`는 보내지 않고, 방을 만든 뒤 앱이 POST /invite로 부른다(초대가 실패해도 방은 남는다). `courseId` · `scheduledAt`은 명세 요청 필드에 없다 |
| GET /live-runs/{roomId}?inviteCode= | `get(roomId, inviteCode)` | 서버 구현 · 필드 추가 | 참가자(초대받은 친구 포함)이거나 방 초대 링크 코드가 있어야 본다(없으면 404). 아직 참가하지 않았으면 내 줄이 INVITED. 서버가 읽을 때마다 방 상태를 다시 정한다(모두 준비 → READY + `startsAt` → RUNNING). `serverTime`으로 앱 시계를 맞춘다. 대기실은 WebSocket ROOM_SNAPSHOT 전까지 1초마다 다시 읽는다 |
| POST /live-runs/{roomId}/invite `userIds` | `invite(roomId, userIds)`, `create(input)` 안 | 서버 구현 | 참가자가 자기 친구만, 출발 전. 대기실 "친구 초대" 시트 · 방 만들기 · 같은 멤버로 다시(친구인 사람만). 초대받은 친구는 함께 달리기 목록에 "초대 받음"으로 방이 뜬다 |
| POST /live-runs/{roomId}/join `inviteCode?` | `join(roomId, inviteCode)` | 서버 구현 · 필드 추가 | 초대받은 친구는 코드 없이, 링크로 온 사람은 코드가 맞아야 참가. 시작한 방 · 취소된 방 · 가득 찬 방(10명)은 409 |
| POST /live-runs/{roomId}/ready `ready` | `setReady(roomId, ready)` | 서버 구현 · 명세 없음 | 명세는 READY 전환만 있다. 준비 취소(`ready=false`)도 받는다 |
| POST /live-runs/{roomId}/leave | `leave(roomId)` | 서버 구현 | 시작 전이면 방에서 빠지고, 달리는 중이면 DNF. 방장은 409(취소를 쓴다) |
| POST /live-runs/{roomId}/cancel | `cancel(roomId)` | 서버 구현 | 방장만, 시작 전만 |
| GET /live-runs/{roomId}/result | `getResult(roomId)` | 서버 구현 | 참가자만, 끝난 방만(아니면 404). `myRunId`는 서버 Run id → 앱 `srv-{id}`. 결과 화면 · 결과 공유가 방 id로 서버 · mock 저장소를 고른다(`liveRoomRepositoryFor`) |
| GET /live-runs | `listUpcoming()` | 명세 없음 · 서버 구현 | 내가 참가한 예정 · 진행 중 방(SCR-T01). 45장 표에 경로가 없어 정했다 |
| (예정 방 · 최근 결과 목록) | `listUpcoming()`, `listRecent()` | 명세 없음 | 서버 `GET /live-runs` · `GET /live-runs/recent`로 구현. 명세 표에 넣어야 한다 |
| (같은 멤버로 다시) | `rematch(roomId)` | 명세 없음 | 앱에서 create + invite로 대신할 수 있다 |

## 7. WebSocket (46장)

실제 채널은 `httpLiveChannel`(STOMP, `@stomp/stompjs`). 서버 방(숫자 id)이면 이 채널과 기기 위치 기록, 개발용 mock 방(`r-*` · `demo`)이면 `mockLiveChannel`과 mock 러너.

| 메시지 | 프론트 | 상태 | 메모 |
| --- | --- | --- | --- |
| 연결 `/ws` + CONNECT `Authorization` | `createHttpLiveChannel(room)` | 서버 구현 | 서버 주소 http → ws. 연결할 때마다 Access Token을 새로 받는다(`currentAccessToken`). 끊기면 2초 뒤 다시 붙는다. STOMP heartbeat 5초 |
| C→S RUN_STATE `roomId, memberSeq, runId, distanceM, elapsedMs, currentPace, status, sentAt` | `sendState({ distanceM, elapsedSec, paceSec, status, runId? })` → SEND `/app/live-runs/{id}/state` `{ seq, distanceM, elapsedSeconds, currentPaceSecPerKm, status, sentAt }` | 변환 · 서버 구현 | roomId는 경로에. seq는 시각 기반으로 올린다(앱을 다시 켜도 줄지 않게). 서버 단위에 맞춰 초로 보낸다. runId는 보내지 않는다: 서버 Run이 `POST /runs`의 `liveRoomId`로 방에 이어진다. 끊긴 동안 보내지 못한 마지막 상태는 다시 연결되면 보낸다 |
| C→S HEARTBEAT | SEND `/app/live-runs/{id}/heartbeat` 5초마다 | 서버 구현 | 서버는 15초 동안 상태 · heartbeat가 없으면 DISCONNECTED |
| S→C ROOM_SNAPSHOT | `SYNC_STATE` → `MEMBER_STATE` | 변환 · 서버 구현 | 방 topic을 구독하면 내 queue(`/user/queue/live-runs`)로 온다. 끝난 방이면 결과도 같이 와서 결과 화면으로 간다. 대기실은 지금도 REST 재조회 |
| S→C MEMBER_STATE | `{ type: 'MEMBER_STATE', members }` | 서버 구현 | 서버가 전체 참가자 배열을 보낸다. `isMe`는 방 정보의 내 userId로 채널이 정한다 |
| S→C RANK_CHANGED | 쓰지 않음 | — | 러닝 중 순위는 앱이 거리로 계산(화면용, 내 거리는 기기 값). 최종 순위는 서버 결과(46.1장) |
| S→C MEMBER_CONNECTION | 멤버 status `DISCONNECTED` | 서버 구현 | 서버가 바로 뒤에 MEMBER_STATE를 보내 앱은 그 배열을 쓴다. 내 연결 상태(`CONNECTION`)는 채널이 WebSocket 연결로 정한다 |
| S→C MEMBER_FINISHED · MEMBER_DNF | 멤버 status `FINISHED` · `DNF` | 서버 구현 | 위와 같이 MEMBER_STATE로 반영 |
| S→C ROOM_FINISHED | `{ type: 'ROOM_FINISHED', result }` | 서버 구현 | 방 전체에 보내 `isMe`가 없다. 채널이 내 userId로 다시 정한다. 결과 화면은 GET /result를 읽는다. 내가 아직 달리는 중이었으면(서버 마감) 내 기록도 여기서 끝낸다 |
| S→C ERROR `code, message, recoverable` | 로그만 | 서버 구현 | 받는 경우: 달리는 중이 아닌 방, 잘못된 값, 비정상 속도 |

## 8. 공유 (SHR)

| API | 프론트 | 상태 | 메모 |
| --- | --- | --- | --- |
| POST /shares `type, referenceId` | `ShareRepository.create(type, referenceId, courseId)` → `httpShareRepository` | 명세 없음 · 서버 구현 | type `RUN · COURSE · LIVE_ROOM`(CHALLENGE는 도전 기능 뒤). 내 끝난 기록 · 볼 수 있는 코스 · 참가한 방만. 같은 대상은 같은 링크. 응답 `{ code, url }`의 url은 서버 공유 페이지 `/s/{code}`(http(s), 메신저에서 눌린다). 기록은 앱 기록 id를 서버 Run id로 바꿔 보낸다. `courseId`는 보내지 않는다(서버가 안다) |
| GET /shares/{code} | `resolve(code)` → `{ type, referenceId, courseId, preview }` | 명세 없음 · 서버 구현 | 로그인 없이. preview는 공유한 사람 이름과 기록 숫자(거리 · 시간 · 페이스 · 인증 기록) · 코스 이름 · 방 목표. 자유 달리기 경로는 없다 |
| GET /s/{code} (공유 페이지) | — | 명세 없음 · 서버 구현 | 14.3장 Web Landing의 첫 단계. 미리보기(og) 태그, "달리모 앱에서 열기"(dallimo://share/{code}), 휴대폰이면 바로 앱을 연다. 개발용 "웹에서 열기" |

## 9. 알림 · Activity

| API | 프론트 | 상태 |
| --- | --- | --- |
| GET /activities | `ActivityRepository.list` → `httpActivityRepository` | 서버 구현 (SCR-M06 마이 › 친구 활동). 응답 필드(`type · nickname · isMine · courseName · timeSec · previousSec · rank · targetNickname · targetIsMe`)는 명세에 없어 서버 · 앱이 정했다 |
| GET /notifications, POST /notifications/{id}/read | `NotificationRepository.list · read` → `httpNotificationRepository` | 서버 구현. 알림함(마이 › 알림), 누르면 `link`로 이동 |
| POST /notifications/read-all, GET /notifications/unread-count | `readAll`, `unreadCount` | 명세 없음 · 서버 구현. 마이 알림 배지 |
| PUT · DELETE /users/me/push-token | `registerToken`, `unregisterToken` | 명세 없음 · 서버 구현. 권한을 허락했을 때 Expo Push 토큰 등록 (EAS projectId가 있어야 토큰이 나온다) |
| GET · PUT /users/me/notification-settings | `settings`, `saveSettings` | 명세 없음 · 서버 구현. 설정 화면 알림 토글을 기기와 서버에 함께 저장 |

## 10. 엔진 경계 (49장)

| 명세 | 프론트 | 상태 | 메모 |
| --- | --- | --- | --- |
| RunningEngine `prepare, start, pause, resume, finish, recover` | 같음 + `subscribe, getSnapshot, now, dispose` | 일치 | 더한 것은 화면 구독용 |
| RunPointStore `append, getUnsyncedRange(runUuid, limit), markSynced(runUuid, fromSeq, toSeq)` | runUuid 없이 쓰고 있었다 | 이번에 고침 | 명세 서명으로 맞춤. `unsyncedCount`는 화면 표시용으로 더함 |
| LocationSource `requestPermissions, startForeground, startBackground, stop, getCurrentQuality` | `requestPermissions, getCurrentPosition, getCurrentQuality` | 미구현 | 기록용 수신은 GPS PoC(WBS 1) |

## 11. 명세 안에서 서로 다른 곳

앞쪽 장과 뒤쪽 계약 장이 다르다. 프론트는 뒤쪽 계약 장(42 · 46장)을 따른다. 명세를 고칠 때 한쪽으로 맞춰야 한다.

| 앞쪽 | 뒤쪽 계약 | 차이 |
| --- | --- | --- |
| 7.3장 GPS Batch `batchId`, point `altitude, accuracy, speed` | 42.2장 `batchUuid, fromSeq, toSeq`, point `altitudeM, accuracyM, speedMps` | 이름 · 필드 |
| 8.2장 RUN_STATE `seq, elapsedSeconds, currentPaceSecPerKm` | 46장 `memberSeq, elapsedMs, currentPace, runId` | 이름 · 단위 |
| 8.3장 서버 이벤트 `ROOM_STARTED, MEMBER_DISCONNECTED, MEMBER_RECONNECTED, MEMBER_DNF, SYNC_STATE` | 46장 `ROOM_SNAPSHOT, MEMBER_CONNECTION, MEMBER_FINISHED, ERROR` | 이벤트 목록 |

## 12. 백엔드에 추가하거나 정해야 할 것

"명세 없음" 항목을 모은 것이다. 백엔드 착수 전에 명세에 넣을지, 앱에서 빼거나 다른 API로 대신할지 정한다.

1. ~~탈퇴 API~~ → DELETE /users/me로 구현
2. ~~소셜 로그인 응답의 가입 여부~~ → 이메일 가입으로 바뀌어 필요 없음
3. ~~누적 통계(MY-002)를 줄 곳~~ → `GET /users/me`의 `stats { runCount, totalDistanceM, totalActiveSec }`. 앱은 여기에 아직 올리지 못한 기기 기록만 더한다
4. ~~닉네임 중복 확인 API~~ → GET /users/nickname-availability로 구현
5. ~~프로필 이미지 업로드 방식~~ → PATCH /users/me multipart(`profileImage`), 서버 디스크(`ImageStorage` 경계, S3로 바꿀 수 있게), 빼기는 DELETE /users/me/profile-image. 명세에 요청 형식 · 빼기 경로를 넣어야 한다
6. GET /runs/{id} 응답 필드 (PB · 주간 순위 변화 · 친구 최고 기록 포함 여부). 검증 결과 · PB · 주간 순위 · 친구 최고 기록은 `verification`으로 구현
7. 코스 상세 응답 필드, 경로를 상세에 포함할지 (서버는 상세에 줄인 경로를 넣고 GET /route로 전체를 준다)
8. ~~코스 등록 요청의 추천 시간~~ → `recommendedTime` · `region`을 받게 했다. 명세 43장 요청 필드에 넣어야 한다
9. ~~내 주변 순위 API (RNK-005)~~ → GET /courses/{id}/rankings/me로 구현. 명세 표에 넣어야 한다
10. ~~내 코스 목록 API (MY-005)~~ → GET /users/me/courses?kind=로 구현. 명세 표에 넣어야 한다
11. Together 방 목록(예정 · 최근), 준비 취소, 재대결 — 예정 목록 · 준비 취소 · 최근 결과(`GET /live-runs/recent`)는 서버 구현(명세 표에 넣어야 함). 재대결은 앱이 같은 조건으로 새 방을 만든다
12. 공유 링크 요청 · 응답 필드 — 서버 구현(`type, referenceId` → `code, url`, 해석 `type, referenceId, courseId, preview`). 명세에 넣어야 한다
13. ~~일시정지 · 재개 시각~~ → finish에 `activeSeconds`를 더했다(사용자 결정). 명세 42.4장 요청 필드에 넣어야 한다
14. FINISHING 응답 모양: 42.4장은 "동기화 미완료 오류/FINISHING 상태" 중 하나라고만 한다. 서버 · 앱 모두 200 + `status: FINISHING`으로 구현했다
15. `RESOURCE_NOT_FOUND`(404): 서버가 27.1장 표에 없는 코드를 하나 더했다. 없는 주소처럼 도메인 코드가 없는 404에 쓴다. 명세 표에 넣을지 정한다
16. 히스토리 목록 경로 미리보기: GET /runs 항목에 줄인 경로를 넣을지. 지금은 서버 기록 썸네일이 빈칸이다
17. ~~코스 지역 · 러닝 환경 · 추천 시간을 저장할 곳~~ → V10 `region` · `recommended_time`, 러닝 환경은 완주자 평가(course_review)를 모은 값. 화장실 · 급수는 평가에 `has_toilet` · `has_water`를 더했다. ERD에 넣어야 한다
18. 실시간 메시지 필드: 46장은 `elapsedMs · currentPace · memberSeq · runId`, 서버 · 앱은 `elapsedSeconds · currentPaceSecPerKm · seq`, runId는 POST /runs `liveRoomId`로 잇는다. ROOM_SNAPSHOT 대신 SYNC_STATE. 명세에 맞출지 정한다
19. 친구 API 모양: 44장은 경로만 있다. 요청 응답(요청 뒤 관계), 요청 목록 `{ received, sent }`, 검색 항목의 `relation · requestId`, 프로필 경로 `GET /users/{userId}`를 서버 · 앱이 정했다. 명세에 넣어야 한다
20. 도전 API 모양: 44장은 경로만 있다. 응답 필드(`role, targetSec, resultSec, targetBest`), 목록 `GET /challenges`, 러닝 상세의 `challenge`를 서버 · 앱이 정했다. 명세에 넣어야 한다
21. 알림 API 추가분: 모두 읽음 · 안 읽은 수 · Push 토큰 · 알림 설정 경로와 모양, 알림 종류(14.2장에서 LIVE_START · CHALLENGE를 빼고 LIVE_CANCELED · CHALLENGE_DEFENDED를 더함). 명세에 넣어야 한다
22. 함께 달리기 응원: SCREEN-SPECS에 "응원"만 있고 메시지가 없다. STOMP `/app/live-runs/{id}/cheer { toUserId? }` → 방 topic `CHEER { fromUserId, fromName, toUserId }`로 정했다. 46장 메시지 표에 넣을지 정한다
23. 도전 공유 미리보기 필드(`challengeStatus · challengerName · challengedName · challengeTargetSec`): 14.3장은 대상만 있다. 명세에 넣어야 한다
24. 코스 신고 테이블 · 사유(`DANGER · PRIVATE_PROPERTY · WRONG_INFO · OTHER`): ERD에 없다. 신고가 쌓였을 때 숨길지는 20.2장 코스 공개 정책과 함께 정한다
25. Activity 모양: ERD activity에 `value_int`(PB 이전 기록 · 주간 순위)를 더했고, 종류는 PB · COURSE_CREATED · CHALLENGE_WON · WEEKLY_TOP(이번 주 3위 안). 공개 범위(visibility)는 FRIENDS만 쓴다. 명세에 넣어야 한다
26. 요청 제한 값 · App Link 확인 파일 경로 · 공유 페이지 App Link(`/s/{code}`): 명세에 값이 없다. 도메인 · 앱 id는 배포 단계에서 정한다
28. **추가 작업 — 이미지 저장소를 Cloudflare R2로** (사용자 결정): 지금은 서버 디스크(`LocalDiskImageStorage`). 이미지 작업은 나중에 따로 한다. 할 일: `ImageStorage`의 R2 구현(S3 호환 API, 버킷 · 키는 환경변수), 공개 주소(R2 공개 버킷 또는 커스텀 도메인)를 `public-base-url`로, 서버 디스크에 있던 사진 옮기기, R2 흉내 저장소로 테스트(MinIO 컨테이너). 서버를 여러 대로 늘리기 전에 끝내야 한다
27. 인터벌 API 모양: 126장은 경로만 있다(`GET · POST /workouts`, `GET · PUT /workouts/{id}`, `POST /workouts/{id}/duplicate`). 지우기(`DELETE /workouts/{id}`), 목록 응답의 `lastRunAt · runCount`, 추천 템플릿은 앱에 둔 것, Run의 `workout` · `workoutSteps` · 목록 `mode` 필터, 버전별 구간(`template_version`) · 구간 결과 테이블을 서버 · 앱이 정했다. 명세에 넣어야 한다
