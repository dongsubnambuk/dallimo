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
| PATCH /users/me `nickname` | `updateMe` | 구현(닉네임만) | 프로필 이미지 업로드는 S3 결정 뒤. 그 전까지 사진은 기기에만 |
| GET /users/nickname-availability?nickname= → `{ available }` | `checkNickname` | 구현 | 로그인 없이 부를 수 있다(가입 화면) |
| GET /users/search | 없음 | 미구현 | 친구(SCR-M05) 화면 |

## 3. Run (42장, 27.2장)

| API | 프론트 | 상태 | 메모 |
| --- | --- | --- | --- |
| POST /runs `clientRunUuid, mode, courseId, challengeId, liveRoomId, startedAt` | 기록 동기화 `syncRun` | 일치 | 서버 id가 없으면 먼저 만든다(`clientRunUuid` 멱등). 백엔드 전까지 `mockRunApi` |
| POST /runs/{id}/points `batchUuid, fromSeq, toSeq, points[]` | 기록 동기화 `syncRun` | 일치 | SQLite에 Batch UUID를 먼저 기록한 뒤 보낸다(50.2장). 연속 seq 60개씩, 실패하면 같은 batchUuid로 backoff 재전송. 422 · 409 IDEMPOTENCY_CONFLICT · 400 · 403은 FAILED. `toPointDto`로 이름 · 단위 변환, `qualityFlag`는 보내지 않는다 |
| POST /runs/{id}/pause · resume | 엔진 · SQLite 구간에만 | 부르지 않음 | 요청에 시각이 없어 오프라인에서 한 일시정지를 나중에 올릴 수 없다. 12항 13번 |
| POST /runs/{id}/finish `endedAt, lastSeq` | 엔진 `finish()` → `syncRunNow` | 일치 | 남은 Batch를 보낸 뒤 요청. 응답 `status`가 FINISHING이면 빠진 Batch를 보내고 다시 요청. 오프라인이거나 20초 안에 못 끝내면 휴대폰에 저장한 결과로 보여주고 연결되면 이어서 올린다 |
| GET /runs/{id} → run detail | `RunResultRepository.get(id)` | 명세 없음 | 응답 필드가 정해지지 않았다. 앱이 쓰는 필드: `startedAt, finishedAt, distanceM, activeSec, avgPaceSec, splits, path(표시용으로 줄인 것), course{ id, name, timeSec }, target, verification, verificationReason, pb{ previousSec, improved }, weeklyRank{ before, after }, friendBest{ name, timeSec }` |
| GET /runs?cursor&size | `list(cursor, size)` | 일치 | 항목에 `startedAt` 추가(이번에 고침, 6.4장 정렬 기준). 목록의 `pb`, 경로 미리보기(`preview`)는 명세 없음 |
| (기기 저장) | `saveFinished(input, synced)` | — | 서버 API가 아니라 기기 저장(11장 SQLite local_run). `clientRunUuid`와 `startedAt`을 함께 저장하도록 고침 |

## 4. 코스 · 랭킹 (43장)

| API | 프론트 | 상태 | 메모 |
| --- | --- | --- | --- |
| GET /courses/nearby `lat, lng, radius/viewport, cursor, size` | `getNearby({ center, radiusM })` | 변환 | 앱은 cursor 없이 한 번에 받는다. 반경 안 코스가 많아지면 cursor를 붙인다 |
| GET /courses/search | 없음 | 미구현 | 지역 검색(SCR-E02). 지금은 받은 목록을 이름 · 태그로 거른다 |
| GET /courses/{id} → CourseDetail | `getDetail(id)` | 명세 없음 | 응답 필드가 정해지지 않았다. 앱이 쓰는 필드는 `entities/course/types.ts`의 `CourseDetail`(상태, 지역, 만든 사람, 거리, 예상 시간, 난이도, 오르막, 태그, 경로, 고도 프로필, 완주자 수, 이번 주 러너 수, 추천 시간, 환경, 내 기록, 경쟁 정보, 저장 여부) |
| GET /courses/{id}/route | 상세 안의 `route` | 변환 | 명세는 경로를 따로 받는다. 앱은 상세 하나로 받는다 |
| POST /courses `sourceRunId, name, description, tags` | `CourseRegistrationRepository.create(input)` | 일치 | `recommendedTime`은 명세 요청 필드에 없다(SCR-E05 화면 요소에는 있다) |
| POST · DELETE /courses/{id}/bookmarks | `setBookmark(id, saved)` | 일치 | |
| GET /courses/{id}/rankings `scope, period, cursor, size` | `RankingRepository.getPage(query)` | 일치 | 응답 항목 필드: `rank, userId, name, timeSec, paceSecPerKm, relation, isPB` |
| (내 주변 순위) | `getMyStanding(courseId, scope, period)` → `{ total, entry, around }` | 명세 없음 | RNK-005 내 주변 순위 API가 없다 |
| (내 코스) | `getMine(kind)` | 명세 없음 | MY-005 등록 / 저장 / 완주 코스 목록 API가 없다 |
| POST /courses/{id}/reviews · reports | 없음 | 미구현 | REV-001, CREG-005 (P1) |

## 5. 친구 · 도전 (44장)

| API | 프론트 | 상태 | 메모 |
| --- | --- | --- | --- |
| GET /friends | `LiveRoomRepository.listFriends()` | 변환 | 함께 달리기 초대 목록으로만 쓴다. 친구 repository로 옮기면 된다 |
| 친구 요청 · 승인 · 거절 · 삭제 | 없음 | 미구현 | SCR-M05 |
| POST /challenges 등 | 없음 | 미구현 | 라이벌 모드는 목표 기록만 넘긴다(Play Mode) |

## 6. Together (45장)

| API | 프론트 | 상태 | 메모 |
| --- | --- | --- | --- |
| POST /live-runs | `create(input)` | 변환 | 앱은 초대할 친구(`inviteeIds`)를 함께 보낸다. 명세는 생성 뒤 POST /invite. 예약 시각(`scheduledAt`)은 명세 요청 필드에 없다 |
| GET /live-runs/{roomId} | `get(roomId)` | 일치 | 대기실은 WebSocket ROOM_SNAPSHOT 전까지 1초마다 다시 읽는다 |
| POST /live-runs/{roomId}/invite | create에 포함 | 변환 | |
| POST /live-runs/{roomId}/join | `join(roomId)` | 일치 | |
| POST /live-runs/{roomId}/ready | `setReady(roomId, ready)` | 명세 없음 | 명세는 READY 전환만 있다. 준비 취소(`ready=false`)는 없다 |
| POST /live-runs/{roomId}/leave | `leave(roomId)` | 일치 | |
| POST /live-runs/{roomId}/cancel | `cancel(roomId)` | 이번에 고침 | 전에는 방장도 leave를 불렀다. 방장은 cancel, 참가자는 leave |
| GET /live-runs/{roomId}/result | `getResult(roomId)` | 일치 | |
| (예정 방 · 최근 결과 목록) | `listUpcoming()`, `listRecent()` | 명세 없음 | Together 홈(SCR-T01) 목록 API가 없다 |
| (같은 멤버로 다시) | `rematch(roomId)` | 명세 없음 | 앱에서 create + invite로 대신할 수 있다 |

## 7. WebSocket (46장)

| 메시지 | 프론트 | 상태 | 메모 |
| --- | --- | --- | --- |
| C→S RUN_STATE `roomId, memberSeq, runId, distanceM, elapsedMs, currentPace, status, sentAt` | `LiveChannel.sendState({ distanceM, elapsedSec, paceSec, status, runId? })` | 변환 | 채널이 elapsedMs(×1000) · currentPace로 바꾸고 roomId · memberSeq · sentAt을 붙인다. runId는 실제로는 시작 때부터 있으므로 매번 보낸다(지금 mock은 끝날 때만) |
| C→S HEARTBEAT | 없음 | 미구현 | 채널 구현 몫 |
| S→C ROOM_SNAPSHOT | 없음 | 미구현 | 대기실은 REST 재조회로 대신 |
| S→C MEMBER_STATE | `{ type: 'MEMBER_STATE', members }` | 변환 | 앱은 전체 멤버 배열로 받는다. 한 명씩 오면 채널이 합친다 |
| S→C RANK_CHANGED | 쓰지 않음 | — | 러닝 중 순위는 앱이 거리로 계산(화면용). 최종 순위는 서버 결과(46.1장) |
| S→C MEMBER_CONNECTION | 멤버 status `DISCONNECTED` | 변환 | |
| S→C MEMBER_FINISHED | 멤버 status `FINISHED` · `finishSec` | 변환 | |
| S→C ROOM_FINISHED | `{ type: 'ROOM_FINISHED', result }` | 일치 | |
| S→C ERROR `code, message, recoverable` | 없음 | 미구현 | 받으면 recoverable이면 재연결, 아니면 안내 |

## 8. 공유 (SHR)

| API | 프론트 | 상태 | 메모 |
| --- | --- | --- | --- |
| POST /shares | `ShareRepository.create(type, referenceId, courseId)` | 명세 없음 | 요청 필드가 정해지지 않았다. share_link 컬럼 기준 `type, referenceId`. `courseId`는 앱이 더 보낸다 |
| GET /shares/{code} | `resolve(code)` → `{ type, referenceId, courseId }` | 명세 없음 | 응답 필드가 정해지지 않았다. 링크를 열 때 코스로 보내려면 `courseId`가 필요하다 |

## 9. 알림 · Activity

| API | 프론트 | 상태 |
| --- | --- | --- |
| GET /activities | 없음 | 미구현 (SCR-M06) |
| GET /notifications, POST /notifications/{id}/read | 없음 | 미구현 |

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
3. 누적 통계(MY-002)를 줄 곳 (UserProfileResponse 필드는 구현됨)
4. ~~닉네임 중복 확인 API~~ → GET /users/nickname-availability로 구현
5. 프로필 이미지 업로드 방식
6. GET /runs/{id} 응답 필드 (PB · 주간 순위 변화 · 친구 최고 기록 포함 여부)
7. 코스 상세 응답 필드, 경로를 상세에 포함할지
8. 코스 등록 요청의 추천 시간
9. 내 주변 순위 API (RNK-005)
10. 내 코스 목록 API (MY-005)
11. Together 방 목록(예정 · 최근), 준비 취소, 재대결
12. 공유 링크 요청 · 응답 필드
13. 일시정지 · 재개 시각: POST /runs/{id}/pause · resume에 시각이 없다. 오프라인에서 한 일시정지를 나중에 알리려면 `pausedAt` · `resumedAt`을 요청에 넣거나, finish에 달린 구간(또는 active 시간)을 넣어야 서버 `elapsedSeconds`가 맞다
14. FINISHING 응답 모양: 42.4장은 "동기화 미완료 오류/FINISHING 상태" 중 하나라고만 한다. 앱은 200 + `status: FINISHING`으로 가정했다
15. `RESOURCE_NOT_FOUND`(404): 서버가 27.1장 표에 없는 코드를 하나 더했다. 없는 주소처럼 도메인 코드가 없는 404에 쓴다. 명세 표에 넣을지 정한다
