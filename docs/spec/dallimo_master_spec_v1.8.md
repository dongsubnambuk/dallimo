<!--
자동 추출본: dallimo_master_spec_v1.8_feedback_features.docx → Markdown
원본은 같은 폴더의 .docx이며, 내용이 다르면 원본을 기준으로 한다.
에이전트/검색용 텍스트이므로 코드 블록·트리 다이어그램의 줄 서식은 일부 유지되지 않는다.
-->

RUNNING PLATFORM
달리모 (DALLIMO)
통합 개발 명세서
Product · Functional · UI · Data · API · Realtime · Mobile · Infra · Test · WBS
Version 1.0  |  2026-09-23
기술 기준: React Native + Expo / Spring Boot / MySQL(개발) / MariaDB(운영) / Redis
본 문서는 기획 기준선과 개발 기준선을 하나로 통합한 마스터 문서다.
# 0. 문서 관리
| 항목 | 내용 |
|---|---|
| 문서명 | 달리모 (DALLIMO) 통합 개발 명세서 |
| 버전 | v1.0 |
| 상태 | Baseline |
| 작성 기준일 | 2026-09-23 |
| 앱 | React Native + Expo / TypeScript |
| 백엔드 | Spring Boot / Java |
| 개발 DB | MySQL |
| 운영 DB | MariaDB |
| 실시간 | Spring WebSocket + STOMP / Redis |
| 문서 범위 | 서비스·기능·화면·ERD·도메인·API·WebSocket·모바일·인프라·테스트·WBS |

## 0.1 변경 관리 원칙
- 본 v1.0을 최초 개발 기준선으로 사용한다.
- 기능 추가·삭제·정책 변경은 v1.1, v1.2 형태로 버전을 올리고 변경 이력을 남긴다.
- 화면, API, DB는 기능 ID를 공통 키로 사용해 추적 가능하게 관리한다.
- 수치 임계값(GPS 정확도, 코스 이탈 거리, 완주 일치율 등)은 PoC 결과 전까지 '정책값'으로 관리하며 하드코딩하지 않는다.
## 0.2 문서 목차
1. 서비스/제품 명세
2. 범위 및 릴리스 전략
3. 정보구조 및 사용자 흐름
4. 화면 정의서
5. 최종 기능 명세
6. 도메인 및 ERD
7. REST API 명세
8. WebSocket/실시간 명세
9. 모바일 앱 아키텍처
10. GPS·러닝 엔진 명세
11. 로컬 저장·동기화 명세
12. 백엔드 아키텍처
13. DB·캐시 설계
14. 인증·알림·공유
15. 인프라·환경·배포
16. 보안·개인정보 설계 원칙
17. 테스트 및 PoC
18. 관측성·운영
19. 개발 WBS
20. 완료 기준 및 오픈 이슈
# 1. 서비스/제품 명세
## 1.1 서비스 정의
주변 러너들이 공유한 좋은 러닝 코스를 발견하고, 동일 코스에서 자신의 기록·친구·다른 러너와 경쟁하며, 서로 다른 장소에서도 친구와 실시간으로 함께 달릴 수 있는 달리모 (DALLIMO)이다.
## 1.2 핵심 가치
| 축 | 사용자 가치 | 핵심 기능 |
|---|---|---|
| COURSE | 오늘 어디서 뛸지 빠르게 결정 | 주변 코스, 지역 검색, 코스 상세, 사용자 코스 등록 |
| COMPETE | 달릴 이유와 재도전 동기 제공 | PB, 코스 랭킹, 친구 기록 Challenge |
| TOGETHER | 장소가 달라도 함께 달리는 경험 | 예약 러닝, 동시 시작, 실시간 진행률·순위 |
| SHARE | 러닝 결과가 다음 행동으로 연결 | 기록·코스·대결 카드, Deep Link, 재도전 |

## 1.3 핵심 순환
DISCOVER → RUN → COMPETE → SHARE → CHALLENGE → RE-RUN
## 1.4 주요 사용자
- 주 1~3회 러닝하는 취미 러너
- 같은 코스 반복이 지루하거나 새로운 지역의 코스를 찾고 싶은 사용자
- 친구와 러닝하고 싶지만 장소·일정이 다른 사용자
- 러닝 결과를 SNS·메신저로 공유하고 기록 경쟁을 즐기는 사용자
## 1.5 제품 원칙
- 기록 정확성이 기능 수보다 우선한다.
- 코스를 서비스의 중심 콘텐츠이자 경쟁 단위로 취급한다.
- 개인 러닝 기록은 네트워크·실시간 연결 장애와 분리한다.
- 공식 랭킹에는 검증된 코스 기록만 반영한다.
- SNS는 피드 소비보다 새로운 러닝·도전을 발생시키는 방향으로 설계한다.
# 2. 범위 및 릴리스 전략
| Phase | 범위 | 성공 질문 |
|---|---|---|
| Phase 1 / Running Core | 인증, GPS 러닝, 백그라운드, 오프라인, 결과, 히스토리 | 기본 러닝 기록을 신뢰할 수 있는가? |
| Phase 2 / Course & Competition | 코스 탐색, 상세, 따라 달리기, 완주 검증, 등록, PB, 랭킹 | 코스가 재도전 동기를 만드는가? |
| Phase 3 / Social | 친구, 친구 랭킹, Challenge, Activity, Push, 공유 | 다른 사람의 기록이 새 러닝으로 연결되는가? |
| Phase 4 / Together | 방, 초대, 예약, Live Race, Time Attack, Together, 음성 | 떨어져 있어도 함께 뛰는 느낌을 주는가? |
| Phase 5 / Expansion | Watch, Pace Match, 컬렉션, 공개 러닝, 고급 추천 | 리텐션과 확장이 가능한가? |

## 2.1 MVP 제외 범위
- AI 코치/자세 분석
- 식단/러닝화 관리
- 대규모 공개 SNS 피드
- 전국 자동 코스 생성
- Apple Watch/Galaxy Watch 네이티브 앱
- 고급 개인화 추천
# 3. 정보구조 및 사용자 흐름
## 3.1 IA
APP
├─ AUTH
│  ├─ Login
│  └─ Profile Setup
├─ EXPLORE
│  ├─ Course Explore / Map / Search
│  ├─ Course Detail
│  ├─ Ranking
│  └─ Course Create
├─ RUN
│  ├─ Run Prepare
│  ├─ Active Run
│  ├─ Pause/Resume
│  ├─ Finish
│  └─ Result / Share
├─ TOGETHER
│  ├─ Home
│  ├─ Room Create
│  ├─ Waiting Room
│  ├─ Live Run
│  └─ Live Result
└─ MY
   ├─ Profile
   ├─ Run History / Detail
   ├─ My Courses
   ├─ Friends / Activity
   └─ Settings
## 3.2 핵심 사용자 플로우
| 플로우 | 경로 |
|---|---|
| 일반 러닝 | Run → GPS 확인 → START → 기록 → STOP → 결과 → 저장/공유 |
| 코스 러닝 | Explore → 코스 상세 → 이 코스 달리기 → 기록 → 완주 검증 → PB/랭킹 → 공유/재도전 |
| Challenge | 친구 기록 → 기록에 도전 → 목표 비교 러닝 → 결과 → 상대 알림 → 재도전 |
| Together | 방 생성 → 초대 → Ready → 동시 시작 → 실시간 진행 → Finish → 결과/공유 |
| 코스 생성 | 자유 러닝 완료 → 코스로 공유 → 정보 입력 → 경로 확인 → 등록 |

# 4. 화면 정의서
| ID | 화면 | 목적 | 주요 요소 | 연계 기능 |
|---|---|---|---|---|
| SCR-A01 | 로그인 | 소셜 로그인 및 기존 세션 복구 | Apple/Google/Kakao 버튼, 약관/정책 진입 | AUTH-001 |
| SCR-A02 | 최초 프로필 | 신규 사용자 프로필 설정 | 프로필 이미지, 닉네임, 완료 | AUTH-002 |
| SCR-E01 | Explore 홈 | 주변 코스 발견 | 검색, 지도, 주변 코스, 추천 코스 | CRS-001~005 |
| SCR-E02 | 지역 검색 | 지역/장소 검색 | 검색어, 검색 결과, 최근 검색 | CRS-003 |
| SCR-E03 | 코스 상세 | 코스 판단 및 러닝 진입 | 지도, 거리, 고도, 태그, 내 기록, 랭킹, 평가, 달리기 | CRS-101~107 |
| SCR-E04 | 코스 랭킹 | 코스 경쟁 현황 | 전체/주간/월간/친구, 내 주변 순위 | RNK-001~005 |
| SCR-E05 | 코스 등록 | 완료 경로를 코스로 공개 | 코스명, 설명, 태그, 추천시간, 경로 확인 | CREG-001~004 |
| SCR-R01 | Run 홈/준비 | 러닝 모드 및 GPS 준비 | 빠른 러닝, 선택 코스, GPS 상태, START | RUN-001~003 |
| SCR-R02 | Active Run | 실시간 러닝 | 거리, 시간, 현재/평균 페이스, 지도, 진행률, 경쟁 패널 | RUN-004~009 |
| SCR-R03 | 러닝 종료 | 오입력 방지 | 계속 달리기, 종료 확인 | RUN-010 |
| SCR-R04 | 러닝 결과 | 기록·PB·랭킹 확인 | 요약, 지도, 스플릿, PB, 순위, 공유 | RST-001~005 |
| SCR-R05 | 공유 카드 | 외부 공유용 결과 생성 | Map/Record/Ranking/Battle 템플릿 | SHR-001 |
| SCR-T01 | Together 홈 | 예정/최근 실시간 러닝 | 예정 방, 최근 결과, 새 방 생성 | TGT-001 |
| SCR-T02 | 방 생성 | 실시간 러닝 조건 설정 | 모드, 거리/시간, 시작시간, 친구 | TGT-001~002 |
| SCR-T03 | Waiting Room | 시작 전 참가 상태 확인 | 참가자, READY, GPS/Network, 카운트다운 | TGT-003~004 |
| SCR-T04 | Live Run | 실시간 경쟁 | 진행률, 거리, 페이스, 순위, 연결상태 | TGT-005~010 |
| SCR-T05 | Live 결과 | 대결 결과 확인 | 순위, 기록, 차이, DNF, 공유/재대결 | TGT-011~012 |
| SCR-M01 | My | 개인 요약 | 프로필, 누적거리/시간/횟수, 최근 기록 | MY-001~003 |
| SCR-M02 | 러닝 히스토리 | 기록 탐색 | 날짜별 기록 목록 | MY-003 |
| SCR-M03 | 러닝 상세 | 개별 기록 조회 | 지도, 거리, 시간, 페이스, 스플릿, 검증상태 | MY-004 |
| SCR-M04 | 내 코스 | 코스 관리 | 등록/저장/완주 코스 | MY-005 |
| SCR-M05 | 친구 | 친구 관계 관리 | 검색, 요청, 목록, 프로필 | FND-001~005 |
| SCR-M06 | Activity | 행동형 소셜 피드 | PB, 코스등록, Challenge, 랭킹 이벤트 | ACT-001~002 |
| SCR-M07 | 설정 | 앱/러닝 설정 | 자동일시정지, 음성, Push, 개인정보, 로그아웃/탈퇴 | MY-006 |

## 4.1 Active Run 화면 상태
| RunMode | 추가 표시 | 비고 |
|---|---|---|
| FREE | 기본 러닝 지표 | 코스 없음 |
| COURSE | 코스 진행률, 기준 경로 | 완주 검증 대상 |
| PB | PB 대비 시간/거리 | 자기 기록 경쟁 |
| CHALLENGE | 상대 기록 대비 시간/거리 | 비동기 경쟁 |
| LIVE_RACE | 참가자 진행률/순위 | WebSocket |
| TIME_ATTACK | 남은 시간/거리/순위 | WebSocket |
| TOGETHER | 그룹 진행상황 | 승패 없음 |

# 5. 최종 기능 명세
| ID | 기능 | 우선순위 | 완료 기준 요약 |
|---|---|---|---|
| AUTH-001 | 소셜 로그인 | P0 | Apple/Google/Kakao 인증 후 회원 식별 및 토큰 발급 |
| AUTH-002 | 프로필 설정 | P0 | 닉네임 중복 확인, 프로필 이미지 선택, 친구코드 생성 |
| AUTH-003 | 자동 로그인/토큰 재발급 | P0 | Refresh Token 기반 세션 복구 |
| AUTH-004 | 로그아웃/탈퇴 | P0 | 진행 중 러닝 보호 후 세션 종료/탈퇴 처리 |
| LOC-001 | 위치 권한 | P0 | 러닝 및 주변 코스 탐색을 위한 위치 권한 요청 |
| LOC-002 | 권한 거부 대응 | P0 | 러닝 제한, 설정 이동, 검색/조회 기능 유지 |
| LOC-003 | GPS 품질 확인 | P0 | 러닝 시작 전 정확도 상태 표시 |
| LOC-004 | GPS 이상치 처리 | P0 | 저정확도/순간이동/비정상 속도 후보 처리 |
| CRS-001 | 주변 코스 | P0 | 현재 위치 기준 코스 조회 |
| CRS-002 | 지도 탐색 | P0 | 지도 영역 재검색 |
| CRS-003 | 지역 검색 | P0 | 지역/장소 기준 코스 탐색 |
| CRS-004 | 필터/정렬 | P1 | 거리·특징·인기·평점 필터 |
| CRS-005 | 추천 코스 | P1 | 초기 규칙 기반 추천 |
| CRS-101 | 코스 정보 | P0 | 경로·거리·시간·고도·태그·완주 정보 |
| CRS-102 | 러닝 환경 | P1 | 노면·신호·야간·혼잡·화장실·급수 |
| CRS-103 | 내 코스 기록 | P0 | PB·최근 기록·완주 횟수 |
| CRS-104 | 랭킹 미리보기 | P0 | 전체/주간/친구 일부 |
| CRS-105 | 코스 저장 | P1 | 북마크 |
| CRS-106 | 코스 러닝 시작 | P0 | 코스 선택 상태로 Run 진입 |
| CRS-107 | 코스 공유 | P0 | 외부 공유 및 링크 |
| RUN-001 | 빠른 러닝 | P0 | 코스 없이 자유 러닝 |
| RUN-002 | 러닝 준비 | P0 | 권한/GPS/모드 확인 |
| RUN-003 | 카운트다운 | P0 | 3-2-1 시작 |
| RUN-004 | 실시간 기록 | P0 | 거리·시간·페이스·경로 계산 |
| RUN-005 | 백그라운드 기록 | P0 | 화면 잠금/백그라운드 지속 |
| RUN-006 | Local First | P0 | GPS를 SQLite에 선저장 |
| RUN-007 | Batch Sync | P0 | GPS 포인트 묶음 전송·재시도 |
| RUN-008 | 일시정지/재개 | P0 | 수동 상태 제어 |
| RUN-009 | 자동 일시정지 | P1 | 정지 감지 기반 자동 제어 |
| RUN-010 | 러닝 종료 | P0 | 종료 확정·동기화·결과 생성 |
| RUN-011 | 비정상 종료 복구 | P0 | 미완료 세션 복구 |
| CRUN-001 | 코스 표시 | P0 | 기준 코스/실제 경로 동시 표시 |
| CRUN-002 | 진행률 | P0 | 코스 기준 진행률 |
| CRUN-003 | 코스 이탈 | P1 | 지속 이탈 시 안내 |
| CRUN-004 | 완주 검증 | P0 | 시작/종료/거리/일치율/GPS 이상 검증 |
| CRUN-005 | 검증 상태 | P0 | PENDING/VERIFIED/UNVERIFIED/REJECTED |
| RST-001 | 결과 요약 | P0 | 지도·거리·시간·평균/구간 페이스·고도 |
| RST-002 | PB 판정 | P0 | 기존 최고 기록과 비교 |
| RST-003 | 코스 순위 | P0 | 검증 완료 후 공식 순위 |
| RST-004 | 친구 비교 | P1 | 동일 코스 친구 기록 비교 |
| RST-005 | 결과 공유 | P0 | 공유 카드 생성 |
| CREG-001 | 러닝→코스 | P0 | 완료 경로 코스화 |
| CREG-002 | 코스 정보 입력 | P0 | 명칭/설명/태그/추천시간 |
| CREG-003 | 경로 확인 | P0 | 등록 전 지도 확인 |
| CREG-004 | 코스 등록 | P0 | 공개 코스 생성 |
| CREG-005 | 코스 신고 | P1 | 위험/사유지/오정보 신고 |
| RNK-001 | 전체 랭킹 | P0 | 사용자별 최고 VERIFIED 기록 |
| RNK-002 | 주간 랭킹 | P0 | 주간 최고 기록 |
| RNK-003 | 월간 랭킹 | P1 | 월간 최고 기록 |
| RNK-004 | 친구 랭킹 | P1 | 친구 집합 내 기록 |
| RNK-005 | 내 주변 순위 | P0 | 내 순위 전후 사용자 노출 |
| FND-001~005 | 친구 | P1 | 검색·요청·승인/거절·삭제·프로필 |
| CHL-001~004 | Challenge | P1 | 친구 기록 도전·실시간 비교·결과·재도전 |
| TGT-001~012 | Together | P1 | 방 생성부터 실시간 경쟁·복구·결과 |
| AUD-001~003 | 음성 안내 | P1 | 기본/경쟁 안내 및 빈도 설정 |
| ACT-001~002 | Activity | P1 | 행동형 친구 활동 피드 |
| SHR-001~004 | 공유 | P0/P1 | 기록·코스·Challenge·Deep Link |
| NTF-001~007 | Push | P1 | 친구/Challenge/Together 이벤트 |
| MY-001~006 | My | P0/P1 | 프로필·통계·히스토리·코스·설정 |
| REV-001 | 코스 평가 | P1 | 완주자 기반 환경 평가 |
| WATCH-001~004 | Watch | P2 | 기본 기록·Challenge·Together·Haptic |

# 6. 도메인 및 ERD
## 6.1 핵심 관계
USER
 ├─< RUN ─< RUN_POINT
 │      └─0..1 COURSE_RECORD >─ COURSE ─< COURSE_ROUTE_POINT
 │                                ├─< COURSE_REVIEW
 │                                └─< COURSE_BOOKMARK
 ├─< FRIENDSHIP >─ USER
 ├─< CHALLENGE >─ COURSE_RECORD
 ├─< LIVE_RUN_MEMBER >─ LIVE_RUN_ROOM
 ├─< ACTIVITY
 ├─< NOTIFICATION
 └─< SHARE_LINK
## 6.2 핵심 테이블
### user
| 컬럼 | 설명 |
|---|---|
| id BIGINT PK |  |
| provider VARCHAR(20) |  |
| provider_user_id VARCHAR(191) |  |
| nickname VARCHAR(40) UNIQUE |  |
| friend_code VARCHAR(20) UNIQUE |  |
| profile_image_url VARCHAR(500) NULL |  |
| status VARCHAR(20) |  |
| created_at DATETIME |  |
| updated_at DATETIME |  |

### refresh_token
| 컬럼 | 설명 |
|---|---|
| id BIGINT PK |  |
| user_id BIGINT FK |  |
| token_hash VARCHAR(255) |  |
| device_id VARCHAR(100) |  |
| expires_at DATETIME |  |
| revoked_at DATETIME NULL |  |

### run
| 컬럼 | 설명 |
|---|---|
| id BIGINT PK |  |
| user_id BIGINT FK |  |
| course_id BIGINT NULL FK |  |
| mode VARCHAR(20) |  |
| status VARCHAR(20) |  |
| started_at DATETIME |  |
| ended_at DATETIME NULL |  |
| elapsed_seconds INT |  |
| distance_m INT |  |
| avg_pace_sec_per_km INT NULL |  |
| elevation_gain_m DECIMAL(8,2) NULL |  |
| calories INT NULL |  |
| verification_status VARCHAR(20) |  |
| client_run_uuid CHAR(36) UNIQUE |  |
| created_at DATETIME |  |

### run_point
| 컬럼 | 설명 |
|---|---|
| id BIGINT PK |  |
| run_id BIGINT FK |  |
| seq INT |  |
| latitude DECIMAL(10,7) |  |
| longitude DECIMAL(10,7) |  |
| altitude_m DECIMAL(8,2) NULL |  |
| accuracy_m DECIMAL(7,2) |  |
| speed_mps DECIMAL(7,3) NULL |  |
| recorded_at DATETIME(3) |  |
| quality_flag VARCHAR(20) |  |
| UNIQUE(run_id, seq) |  |

### course
| 컬럼 | 설명 |
|---|---|
| id BIGINT PK |  |
| creator_id BIGINT FK |  |
| name VARCHAR(100) |  |
| description TEXT NULL |  |
| distance_m INT |  |
| start_lat DECIMAL(10,7) |  |
| start_lng DECIMAL(10,7) |  |
| end_lat DECIMAL(10,7) |  |
| end_lng DECIMAL(10,7) |  |
| elevation_gain_m DECIMAL(8,2) NULL |  |
| difficulty VARCHAR(20) NULL |  |
| status VARCHAR(20) |  |
| visibility VARCHAR(20) |  |
| created_at DATETIME |  |

### course_route_point
| 컬럼 | 설명 |
|---|---|
| id BIGINT PK |  |
| course_id BIGINT FK |  |
| seq INT |  |
| latitude DECIMAL(10,7) |  |
| longitude DECIMAL(10,7) |  |
| altitude_m DECIMAL(8,2) NULL |  |
| UNIQUE(course_id, seq) |  |

### course_record
| 컬럼 | 설명 |
|---|---|
| id BIGINT PK |  |
| course_id BIGINT FK |  |
| run_id BIGINT UNIQUE FK |  |
| user_id BIGINT FK |  |
| duration_seconds INT |  |
| avg_pace_sec_per_km INT |  |
| match_rate DECIMAL(5,2) |  |
| verified_at DATETIME |  |
| created_at DATETIME |  |

### course_bookmark
| 컬럼 | 설명 |
|---|---|
| user_id BIGINT FK |  |
| course_id BIGINT FK |  |
| created_at DATETIME |  |
| PK(user_id, course_id) |  |

### course_review
| 컬럼 | 설명 |
|---|---|
| id BIGINT PK |  |
| course_id BIGINT FK |  |
| user_id BIGINT FK |  |
| run_id BIGINT FK |  |
| rating TINYINT |  |
| surface_score TINYINT NULL |  |
| signal_score TINYINT NULL |  |
| night_score TINYINT NULL |  |
| crowd_score TINYINT NULL |  |
| content VARCHAR(1000) NULL |  |
| created_at DATETIME |  |

### friendship
| 컬럼 | 설명 |
|---|---|
| id BIGINT PK |  |
| requester_id BIGINT FK |  |
| addressee_id BIGINT FK |  |
| status VARCHAR(20) |  |
| created_at DATETIME |  |
| responded_at DATETIME NULL |  |

### challenge
| 컬럼 | 설명 |
|---|---|
| id BIGINT PK |  |
| challenger_id BIGINT FK |  |
| target_user_id BIGINT FK |  |
| course_id BIGINT FK |  |
| target_record_id BIGINT FK |  |
| challenger_run_id BIGINT NULL FK |  |
| status VARCHAR(20) |  |
| created_at DATETIME |  |
| completed_at DATETIME NULL |  |

### live_run_room
| 컬럼 | 설명 |
|---|---|
| id BIGINT PK |  |
| host_user_id BIGINT FK |  |
| mode VARCHAR(20) |  |
| target_distance_m INT NULL |  |
| target_seconds INT NULL |  |
| scheduled_at DATETIME |  |
| status VARCHAR(20) |  |
| started_at DATETIME NULL |  |
| ended_at DATETIME NULL |  |
| created_at DATETIME |  |

### live_run_member
| 컬럼 | 설명 |
|---|---|
| room_id BIGINT FK |  |
| user_id BIGINT FK |  |
| run_id BIGINT NULL FK |  |
| status VARCHAR(20) |  |
| final_distance_m INT NULL |  |
| final_elapsed_seconds INT NULL |  |
| rank_no INT NULL |  |
| joined_at DATETIME |  |
| finished_at DATETIME NULL |  |
| PK(room_id,user_id) |  |

### activity
| 컬럼 | 설명 |
|---|---|
| id BIGINT PK |  |
| user_id BIGINT FK |  |
| type VARCHAR(30) |  |
| reference_type VARCHAR(30) |  |
| reference_id BIGINT |  |
| visibility VARCHAR(20) |  |
| created_at DATETIME |  |

### notification
| 컬럼 | 설명 |
|---|---|
| id BIGINT PK |  |
| user_id BIGINT FK |  |
| type VARCHAR(30) |  |
| title VARCHAR(100) |  |
| body VARCHAR(500) |  |
| deep_link VARCHAR(500) NULL |  |
| read_at DATETIME NULL |  |
| created_at DATETIME |  |

### share_link
| 컬럼 | 설명 |
|---|---|
| id BIGINT PK |  |
| creator_id BIGINT FK |  |
| type VARCHAR(20) |  |
| reference_id BIGINT |  |
| share_code VARCHAR(32) UNIQUE |  |
| expires_at DATETIME NULL |  |
| created_at DATETIME |  |

## 6.3 ENUM/상태
| 대상 | 값 |
|---|---|
| RunMode | FREE, COURSE, PB, CHALLENGE, LIVE_RACE, TIME_ATTACK, TOGETHER |
| RunStatus | PREPARING, RUNNING, PAUSED, FINISHING, FINISHED, RECOVERY, CANCELED |
| VerificationStatus | NONE, PENDING, VERIFIED, UNVERIFIED, REJECTED |
| CourseStatus | NEW, VERIFIED, POPULAR, HIDDEN, BLOCKED |
| FriendshipStatus | PENDING, ACCEPTED, REJECTED, CANCELED |
| ChallengeStatus | OPEN, RUNNING, SUCCESS, FAILED, CANCELED |
| LiveRoomStatus | WAITING, READY, RUNNING, FINISHED, CANCELED |
| LiveMemberStatus | INVITED, JOINED, READY, RUNNING, FINISHED, DNF, DISCONNECTED |

## 6.4 주요 인덱스
- run(user_id, started_at DESC)
- run(course_id, verification_status, ended_at)
- run_point(run_id, seq) UNIQUE
- course(start_lat, start_lng) 또는 지원 가능한 Spatial Index 검토
- course_record(course_id, duration_seconds)
- course_record(course_id, created_at, duration_seconds)
- friendship(requester_id, addressee_id), friendship(addressee_id, status)
- live_run_member(room_id, status)
- notification(user_id, read_at, created_at DESC)
MySQL 개발 / MariaDB 운영 차이를 줄이기 위해 공간 함수 의존은 초기 최소화하고, 코스 매칭 핵심 로직은 Java 서비스 계층에서 처리한다.
# 7. REST API 명세
| Method | Path | 목적 | 인증 | 기능 |
|---|---|---|---|---|
| POST | /api/v1/auth/social | 소셜 로그인/가입 | Public | AUTH-001 |
| POST | /api/v1/auth/refresh | Access Token 재발급 | Refresh | AUTH-003 |
| POST | /api/v1/auth/logout | 로그아웃 | User | AUTH-004 |
| GET | /api/v1/users/me | 내 프로필 | User | MY-001 |
| PATCH | /api/v1/users/me | 프로필 수정 | User | AUTH-002 |
| GET | /api/v1/users/search | 친구 검색 | User | FND-001 |
| GET | /api/v1/courses/nearby | 주변 코스 | User/Optional | CRS-001 |
| GET | /api/v1/courses/search | 지역/조건 코스 검색 | User/Optional | CRS-003~004 |
| GET | /api/v1/courses/{courseId} | 코스 상세 | User/Optional | CRS-101~104 |
| POST | /api/v1/courses | 코스 등록 | User | CREG-004 |
| POST | /api/v1/courses/{courseId}/bookmarks | 코스 저장 | User | CRS-105 |
| DELETE | /api/v1/courses/{courseId}/bookmarks | 코스 저장 해제 | User | CRS-105 |
| GET | /api/v1/courses/{courseId}/rankings | 코스 랭킹 | User/Optional | RNK-001~005 |
| POST | /api/v1/courses/{courseId}/reviews | 코스 평가 | User | REV-001 |
| POST | /api/v1/courses/{courseId}/reports | 코스 신고 | User | CREG-005 |
| POST | /api/v1/runs | 러닝 세션 생성 | User | RUN-002~003 |
| POST | /api/v1/runs/{runId}/points | GPS Batch 업로드 | User | RUN-007 |
| POST | /api/v1/runs/{runId}/pause | 서버 상태 일시정지 | User | RUN-008 |
| POST | /api/v1/runs/{runId}/resume | 서버 상태 재개 | User | RUN-008 |
| POST | /api/v1/runs/{runId}/finish | 러닝 종료 | User | RUN-010 |
| GET | /api/v1/runs/{runId} | 러닝 상세/결과 | User | RST-001 |
| GET | /api/v1/runs | 내 러닝 히스토리 | User | MY-003 |
| POST | /api/v1/friends/requests | 친구 요청 | User | FND-002 |
| GET | /api/v1/friends/requests | 친구 요청 목록 | User | FND-003 |
| POST | /api/v1/friends/requests/{id}/accept | 친구 승인 | User | FND-003 |
| POST | /api/v1/friends/requests/{id}/reject | 친구 거절 | User | FND-003 |
| DELETE | /api/v1/friends/{userId} | 친구 삭제 | User | FND-004 |
| GET | /api/v1/friends | 친구 목록 | User | FND-005 |
| POST | /api/v1/challenges | Challenge 생성 | User | CHL-001 |
| GET | /api/v1/challenges/{id} | Challenge 조회 | User | CHL-001~003 |
| POST | /api/v1/live-runs | Together 방 생성 | User | TGT-001 |
| GET | /api/v1/live-runs/{roomId} | 방 조회 | User | TGT-003 |
| POST | /api/v1/live-runs/{roomId}/invite | 친구 초대 | User | TGT-002 |
| POST | /api/v1/live-runs/{roomId}/join | 방 참가 | User | TGT-003 |
| POST | /api/v1/live-runs/{roomId}/ready | Ready | User | TGT-003 |
| POST | /api/v1/live-runs/{roomId}/leave | 나가기/DNF | User | TGT-011 |
| GET | /api/v1/activities | 친구 Activity | User | ACT-001 |
| GET | /api/v1/notifications | 알림 목록 | User | NTF-* |
| POST | /api/v1/notifications/{id}/read | 알림 읽음 | User | NTF-* |
| POST | /api/v1/shares | 공유 링크 생성 | User | SHR-001~003 |
| GET | /api/v1/shares/{code} | 공유 링크 해석 | Public | SHR-004 |

## 7.1 공통 응답
{
  "success": true,
  "data": { ... },
  "error": null,
  "timestamp": "2026-09-23T09:00:00+09:00"
}
## 7.2 Run 생성 예시
POST /api/v1/runs
{
  "clientRunUuid": "uuid",
  "mode": "COURSE",
  "courseId": 52,
  "challengeId": null,
  "liveRoomId": null,
  "startedAt": "2026-09-23T21:00:00+09:00"
}
## 7.3 GPS Batch 예시
POST /api/v1/runs/{runId}/points
Headers:
  Idempotency-Key: <batch-uuid>

{
  "batchId": "uuid",
  "points": [
    {
      "seq": 101,
      "latitude": 37.1234567,
      "longitude": 127.1234567,
      "altitude": 32.1,
      "accuracy": 4.2,
      "speed": 3.1,
      "recordedAt": "2026-09-23T21:03:01.120+09:00"
    }
  ]
}
## 7.4 API 정책
- 생성·종료·GPS Batch 등 재시도 가능한 요청은 idempotency를 보장한다.
- 목록 API는 cursor 기반 pagination을 기본으로 한다.
- 시간은 API에서 ISO-8601 offset 포함 값을 사용하고 DB 저장 정책은 서버 표준 시간대로 통일한다.
- 페이스는 문자열이 아니라 sec/km 정수로 전달하고 UI에서 표시 형식으로 변환한다.
- 거리는 meter 정수, 시간은 second/millisecond 단위를 명시적으로 고정한다.
# 8. WebSocket / 실시간 명세
## 8.1 역할 분리
방 생성·참가·Ready·조회는 REST로 처리하고, 러닝 중 빠르게 변하는 진행 상태와 이벤트만 WebSocket/STOMP로 전달한다.
| 구분 | Destination | 설명 |
|---|---|---|
| SUBSCRIBE | /topic/live-runs/{roomId} | 방 전체 이벤트 |
| SEND | /app/live-runs/{roomId}/state | 내 진행 상태 전송 |
| SEND | /app/live-runs/{roomId}/heartbeat | 연결 상태 유지 |
| USER | /user/queue/live-runs | 개인 오류/재동기화 메시지 |

## 8.2 RUN_STATE
{
  "type": "RUN_STATE",
  "roomId": 128,
  "userId": 21,
  "seq": 44,
  "distanceM": 2841,
  "elapsedSeconds": 923,
  "currentPaceSecPerKm": 325,
  "status": "RUNNING",
  "sentAt": "2026-09-23T21:15:23.100+09:00"
}
## 8.3 서버 이벤트
| 이벤트 | 설명 |
|---|---|
| ROOM_STARTED | 방 시작 |
| MEMBER_STATE | 참가자 최신 진행상태 |
| RANK_CHANGED | 순위 변경 |
| MEMBER_DISCONNECTED | 연결 끊김 |
| MEMBER_RECONNECTED | 재연결 |
| MEMBER_FINISHED | 참가자 완주 |
| MEMBER_DNF | 중도 포기 |
| ROOM_FINISHED | 전체 종료 |
| SYNC_STATE | 재접속 시 방 최신 스냅샷 |

## 8.4 실시간 정책
- GPS 원본 좌표는 기본적으로 방 참가자에게 전송하지 않는다.
- 클라이언트는 3~5초 수준의 진행 상태 전송을 기본값으로 사용하고 실제 주기는 테스트로 조정한다.
- Redis는 방/멤버의 최신 실시간 상태를 저장하고, 최종 결과만 MariaDB에 영구 저장한다.
- WebSocket 단절은 개인 Run 기록을 중단시키지 않는다.
- 재접속 시 REST 또는 SYNC_STATE로 최신 스냅샷을 받은 뒤 실시간 스트림을 이어간다.
# 9. 모바일 앱 아키텍처
## 9.1 기술
| 영역 | 기술 |
|---|---|
| Framework | React Native + Expo |
| Language | TypeScript |
| Build | EAS Development Build / EAS Build |
| Routing | Expo Router |
| Server State | TanStack Query |
| Client UI State | Zustand |
| Persistent Run State | SQLite |
| Location | expo-location |
| Background Task | expo-task-manager |
| Push | Expo Notifications |
| Map | PoC 후 최종 SDK 확정 |

## 9.2 디렉터리 제안
src/
├─ app/                    # Expo Router
├─ features/
│  ├─ auth/
│  ├─ course/
│  ├─ run/
│  ├─ friend/
│  ├─ challenge/
│  ├─ together/
│  ├─ activity/
│  └─ my/
├─ shared/
│  ├─ api/
│  ├─ location/
│  ├─ database/
│  ├─ sync/
│  ├─ notifications/
│  ├─ ui/
│  └─ utils/
└─ tasks/
   └─ background-location.ts
## 9.3 Run 상태 머신
IDLE → PREPARING → RUNNING ↔ PAUSED → FINISHING → FINISHED
                         ↘ RECOVERY
UI 상태와 실제 러닝 지속 상태를 분리하며, active run의 진실의 원천은 SQLite에 둔다.
# 10. GPS · 러닝 엔진 명세
## 10.1 GPS Point
RunPoint {
  seq
  latitude
  longitude
  altitude?
  accuracy
  speed?
  recordedAt
  qualityFlag
}
## 10.2 거리 계산
- 수신 Point를 원본으로 SQLite에 저장한다.
- 정확도 및 시간 순서를 검사하여 qualityFlag를 지정한다.
- 유효 Point 간 지표면 거리를 계산한다.
- 비현실적 순간 이동 또는 속도는 거리 누적에서 제외 후보로 처리한다.
- 총 거리와 최근 구간을 이용해 평균/현재 페이스를 계산한다.
## 10.3 현재 페이스
GPS 단일 speed 값을 그대로 표시하지 않고 최근 시간/거리 윈도우를 기반으로 smoothing한다. 윈도우 크기와 이상치 기준은 실제 야외 PoC에서 결정한다.
## 10.4 코스 완주 검증 파이프라인
RUN FINISH
 → GPS quality check
 → start proximity
 → end proximity
 → minimum distance
 → route matching
 → abnormal speed / teleport check
 → match score
 → VERIFIED / UNVERIFIED / REJECTED
 → verified record 생성
 → ranking 반영
## 10.5 정책값
| 키 | 초기값 | 확정 방법 |
|---|---|---|
| gps.required_accuracy_m | 미확정 | 실기기 PoC |
| course.start_radius_m | 약 100m 후보 | 코스 형태별 테스트 |
| course.end_radius_m | 약 100m 후보 | 코스 형태별 테스트 |
| course.match_buffer_m | 약 50m 후보 | GPS 오차 테스트 |
| course.minimum_match_rate | 약 80~90% 후보 | 실제 코스 반복 테스트 |
| run.live_state_interval_sec | 3~5초 후보 | UX/서버부하 테스트 |

# 11. 로컬 저장 · 동기화 명세
## 11.1 SQLite 테이블
| 테이블 | 핵심 컬럼 | 역할 |
|---|---|---|
| local_run | client_run_uuid, server_run_id, mode, status, started_at, ended_at | 진행/복구 상태 |
| local_run_point | client_run_uuid, seq, lat, lng, accuracy, speed, recorded_at, sync_status | GPS 원본 |
| sync_batch | batch_id, client_run_uuid, from_seq, to_seq, status, retry_count | Batch 재시도 |
| app_setting | key, value | 러닝/음성/동기화 설정 |

## 11.2 동기화
GPS 수신
 → SQLite INSERT
 → UI 계산
 → 미전송 Point 누적
 → Batch 생성
 → API 전송
 → 성공: SYNCED
 → 실패: PENDING + retry
 → Run 종료 후 잔여 Batch flush
 → 서버 finish
## 11.3 장애 복구
- 네트워크가 없어도 Run은 계속 기록한다.
- 앱 재실행 시 RUNNING/PAUSED local_run을 탐색해 복구 화면을 제공한다.
- 서버 Run 생성 전에 네트워크가 끊긴 경우 clientRunUuid를 기준으로 나중에 서버 Run을 생성할 수 있게 한다.
- 중복 Batch는 batchId와 (run_id, seq) 유니크 제약으로 방지한다.
# 12. 백엔드 아키텍처
## 12.1 패키지
com.example.running
├─ auth
├─ user
├─ course
├─ running
├─ ranking
├─ friend
├─ challenge
├─ live
├─ activity
├─ notification
├─ share
└─ common
## 12.2 계층
도메인별 controller / application(service) / domain / repository / dto 구조를 사용한다. 기능이 커질 경우 application과 infrastructure를 분리한다.
## 12.3 주요 서비스
| 서비스 | 책임 |
|---|---|
| RunService | Run 생성·상태전이·종료 |
| RunPointService | GPS Batch 저장 및 중복 방지 |
| RunMetricService | 거리·페이스·스플릿 계산 |
| CourseService | 코스 CRUD·탐색 |
| CourseVerificationService | 실제 Run과 Course 매칭/검증 |
| RankingService | 코스/기간/친구 랭킹 |
| ChallengeService | 목표 기록 및 결과 판정 |
| LiveRunService | 방 상태 및 최종 결과 |
| FriendService | 친구 관계 |
| ActivityService | 행동 이벤트 생성 |
| NotificationService | 앱 알림/Push |
| ShareService | 공유 링크/Deep Link 데이터 |

## 12.4 비동기 처리 후보
- 코스 완주 검증
- 랭킹 갱신
- Activity 생성
- Push 발송
- 공유 이미지 서버 생성이 필요한 경우
# 13. DB · 캐시 설계
## 13.1 MySQL → MariaDB 원칙
- DDL과 Flyway migration은 MySQL/MariaDB 공통 문법을 우선한다.
- JSON/Spatial/Generated Column 등 DBMS 차이가 큰 기능은 사용 전 양쪽 버전에서 통합 테스트한다.
- 운영과 동일 MariaDB 버전을 CI Testcontainers에 포함한다.
- 코스 매칭 핵심 알고리즘은 DB 전용 함수보다 Java 서비스 계층을 우선한다.
## 13.2 Redis 사용 범위
| Key 예시 | 값 | TTL/정책 |
|---|---|---|
| live:room:{id} | 방 상태, 목표, 시작시간 | 방 종료 후 짧은 TTL |
| live:room:{id}:members | 사용자별 거리/페이스/상태 | 방 종료 후 짧은 TTL |
| live:room:{id}:presence | heartbeat | 수십 초 수준 |
| ranking:* | 초기 미사용, 규모 증가 후 캐시 | 필요 시 도입 |

초기 코스 랭킹은 MariaDB 쿼리와 적절한 인덱스로 처리하고, 규모 증가 시 Redis Sorted Set 도입을 검토한다.
# 14. 인증 · 알림 · 공유
## 14.1 인증
- Access Token + Refresh Token
- Refresh Token은 원문 대신 안전한 형태로 서버 저장
- 기기 단위 토큰 관리
- 탈퇴/로그아웃 시 관련 Refresh Token 폐기
## 14.2 Push 이벤트
| 이벤트 | 예시 |
|---|---|
| FRIEND_REQUEST | 친구 요청이 도착했습니다. |
| CHALLENGE | 친구가 기록 도전을 보냈습니다. |
| RECORD_BEATEN | 친구가 내 코스 기록을 갱신했습니다. |
| LIVE_INVITE | 5K Together Run에 초대되었습니다. |
| LIVE_REMINDER | 10분 뒤 Together Run이 시작됩니다. |
| LIVE_START | Together Run이 시작됩니다. |

## 14.3 공유
공유는 이미지 카드 + URL을 기본으로 한다. URL은 share_code로 실제 코스/기록/Challenge를 해석하고 앱 설치 시 Deep Link, 미설치 시 Web Landing으로 연결한다.
# 15. 인프라 · 환경 · 배포
## 15.1 초기 구성
Mobile App
   │ HTTPS / WSS
   ▼
Nginx / Load Balancer
   │
   ▼
Spring Boot
 ├─ MariaDB (Production)
 ├─ Redis
 └─ S3
## 15.2 환경
| 환경 | DB | 목적 |
|---|---|---|
| local | MySQL | 개발자 로컬 |
| dev | MySQL | 개발 서버 |
| test/CI | MySQL + 운영버전 MariaDB | 호환성/통합 테스트 |
| prod | MariaDB | 운영 |

## 15.3 설정 관리
- Spring profile: local/dev/test/prod
- DB, Redis, OAuth, S3, Push credential은 코드 저장소에 커밋하지 않는다.
- 환경변수 또는 AWS Parameter Store/Secrets Manager 계열을 사용한다.
- Flyway는 배포 전/기동 시 명확한 정책으로 실행하고 운영 DB 수동 변경을 금지한다.
## 15.4 CI/CD
PR
 → unit test
 → lint
 → MySQL integration test
 → MariaDB compatibility test
 → build

main/deploy
 → artifact build
 → server deploy
 → health check
 → migration check
# 16. 보안 · 개인정보 설계 원칙
- 정확한 위치 데이터는 러닝 기록과 코스 검증 목적 범위에서 처리한다.
- Together에서 참가자에게 정확한 GPS 좌표를 기본 공개하지 않는다.
- 공유 카드에서 집/직장 등 민감한 시작·종료 위치가 노출되지 않도록 향후 privacy zone 기능을 검토한다.
- 프로필/친구/Activity 공개 범위는 정책화한다.
- API는 사용자 소유 Run/코스 수정 권한을 서버에서 검증한다.
- GPS Batch의 runId만 믿지 않고 해당 Run 소유자를 검증한다.
- 업로드 이미지 파일 유형·크기·메타데이터 정책을 둔다.
- 로그에 Access Token, Refresh Token, 정밀 GPS payload 전체를 무분별하게 남기지 않는다.
# 17. 테스트 및 PoC
## 17.1 PoC 01 - GPS
| 시나리오 | 검증 |
|---|---|
| 30분 야외 러닝 | 거리/경로 정확도 |
| 화면 잠금 | 백그라운드 지속 |
| 앱 foreground↔background | 상태 복원 |
| 네트워크 OFF/ON | 로컬 기록 및 재동기화 |
| 앱 강제 종료/재실행 | 복구 가능 범위 |
| 건물/교량/나무 밀집 | GPS 튐 처리 |
| 정지/신호 대기 | 페이스/자동 일시정지 |
| 장시간 러닝 | 배터리/메모리 |

## 17.2 PoC 02 - Course Matching
- 정상 완주 반복
- 출발점 약간 벗어남
- 중간 우회
- 반대 방향
- 코스 일부 생략
- GPS 튐 포함
- 왕복/루프 코스
## 17.3 PoC 03 - Live
- 2~4대 실기기 동시 시작
- 3~5초 상태 갱신 체감
- 한 명 네트워크 단절
- 재연결
- 한 명 DNF
- 완주 순위
- 서버 재시작 시 정책 확인
## 17.4 테스트 계층
| 계층 | 대상 |
|---|---|
| Unit | 거리/페이스 계산, 상태머신, 랭킹, Challenge 판정 |
| Repository | MySQL/MariaDB 쿼리/인덱스/제약 |
| Integration | Run 생성→GPS→Finish→Verification→Ranking |
| WebSocket | 입장→상태→재연결→완주 |
| Mobile | SQLite 복구/Batch retry/권한 |
| E2E | Explore→Course→Run→Result→Share |
| Field Test | 실제 iOS/Android 야외 러닝 |

# 18. 관측성 · 운영
| 영역 | 관측 항목 |
|---|---|
| API | 응답시간, 4xx/5xx, endpoint별 오류율 |
| Run | 시작/완료율, 비정상 종료, sync 실패 |
| GPS | 평균 accuracy, rejected point 비율 |
| Verification | VERIFIED/UNVERIFIED/REJECTED 비율 및 사유 |
| WebSocket | 연결 수, disconnect/reconnect, 메시지 지연 |
| Redis | 메모리, key 수, latency |
| DB | slow query, connection pool, lock |
| Push | ticket 성공/실패, invalid token |

## 18.1 제품 지표
- Course Run Rate: 코스 상세 조회 → 러닝 시작
- Course Completion Rate: 코스 러닝 시작 → 정상 완주
- Repeat Challenge Rate: 동일 코스 재도전
- Social Challenge Rate: 친구/공유에서 Challenge 발생
- Together Completion Rate: 생성된 방 중 정상 완료
- Shared Run Conversion: 공유 링크 유입 → 실제 러닝
# 19. 개발 WBS
| WBS | 작업 | 주요 산출물 | 우선순위 |
|---|---|---|---|
| 0 | 프로젝트 기반 | RN Expo 프로젝트, Spring Boot 프로젝트, 환경분리, CI, DB/Flyway | P0 |
| 1 | GPS PoC | 권한, foreground/background location, SQLite, 경로 렌더링, 실기기 테스트 | P0 |
| 2 | Running Core | Run 상태머신, 거리/페이스, pause/resume, offline, batch sync, recovery | P0 |
| 3 | Auth/My | 소셜 로그인, JWT, 프로필, 히스토리/상세 | P0 |
| 4 | Course Core | 코스 모델, 등록, 탐색, 상세, 지도, 지역 검색 | P0 |
| 5 | Course Verification | 경로 매칭, 이상치, 검증상태, course_record | P0 |
| 6 | Ranking/PB | 전체/주간/내 주변 순위, PB | P0 |
| 7 | Share | 결과 카드, 코스 공유, share link 기본 | P0 |
| 8 | Friends | 검색, 요청, 승인/거절, 친구 목록 | P1 |
| 9 | Challenge | 친구 기록 도전, 목표 비교, 결과, 재도전 | P1 |
| 10 | Activity/Push | 행동 이벤트, 알림, Expo Push, Deep Link | P1 |
| 11 | Live PoC | STOMP, Redis room state, 2대 실기기, reconnect | P1 |
| 12 | Together | 방 생성/초대/Ready/Race/Time Attack/Together/결과 | P1 |
| 13 | Audio | 구간/경쟁 TTS 이벤트 | P1 |
| 14 | Review | 코스 환경 평가/신고 | P1 |
| 15 | Hardening | 성능, 보안, GPS 튜닝, 장애복구, MariaDB 호환성 | P0 |
| 16 | Expansion | Watch, Pace Match, 컬렉션, 공개 Together | P2 |

## 19.1 병렬 개발 기준
- 모바일 GPS PoC와 백엔드 프로젝트 기반 구축은 병렬 진행 가능하다.
- 코스 UI는 API 계약(Mock)을 먼저 확정하면 백엔드 Course 개발과 병렬 가능하다.
- Together UI는 Live PoC가 통과되기 전까지 Mock 상태로 개발할 수 있으나 실제 완료 판정은 PoC 이후 확정한다.
- GPS/코스 검증 임계값은 디자인/기획에서 고정하지 않고 필드 테스트 결과로 조정한다.
# 20. 완료 기준 및 오픈 이슈
## 20.1 v1.0 개발 완료 정의
- 실기기에서 화면 잠금 상태를 포함한 러닝 기록이 안정적으로 저장된다.
- 네트워크 단절 후에도 기록이 유실되지 않고 재동기화된다.
- 등록 코스를 따라 달리고 완주 검증 결과가 생성된다.
- VERIFIED 기록만 공식 랭킹에 반영된다.
- 결과/코스를 외부에 공유할 수 있다.
- P1 단계에서는 친구 Challenge와 Together의 연결 장애 복구까지 검증한다.
- 개발 MySQL과 운영 MariaDB 대상 migration 및 핵심 통합 테스트가 모두 통과한다.
## 20.2 구현 전 확정할 오픈 이슈
| 항목 | 결정 필요 내용 | 결정 시점 |
|---|---|---|
| 지도 SDK | 국내 지도 품질, Expo 호환, 비용, 경로 표시 | GPS PoC 직후 |
| 소셜 로그인 범위 | 초기 Apple/Google/Kakao 모두 또는 단계 도입 | Auth 개발 전 |
| GPS 샘플링 | 시간/거리 interval, 배터리 균형 | GPS PoC |
| 완주 임계값 | start/end radius, match buffer/rate | Course Matching PoC |
| 자동 일시정지 | 속도/시간 기준 | 필드 테스트 |
| 코스 경로 저장 | route point 중심 vs LINESTRING/polyline 병행 | Course 설계 전 |
| 실시간 갱신 주기 | 3~5초 후보 | Live PoC |
| 공유 Web Landing | 별도 웹 구현 범위 | Phase 2~3 |
| Privacy Zone | 시작/종료 지점 마스킹 범위 | 출시 전 개인정보 검토 |
| 코스 공개 정책 | 등록 즉시 공개 vs 검토/신뢰도 기반 | Phase 2 |

## 20.3 다음 산출물
- 화면 와이어프레임/Figma
- OpenAPI 상세 스키마
- Flyway DDL v1
- Spring Entity/Repository 초안
- Expo GPS PoC 코드
- QA Test Case 문서
# 21. 기술 설계 기준선 v1.1
본 장부터는 설명용 제안이 아니라 구현·성능 검증·장애 대응·운영을 위한 기술 설계 기준을 정의한다. 아직 실측되지 않은 수치는 '초기 엔지니어링 기준값'으로만 사용하며, PoC·부하 테스트 결과에 따라 변경한다.
| 구분 | 원칙 |
|---|---|
| 사실과 가정 분리 | DB/프레임워크 특성은 실제 구현으로 검증하고, 서비스 트래픽·GPS 주기 등 미측정 값은 가정으로 명시한다. |
| 성능 설계 | 쿼리 패턴, 데이터 증가량, 인덱스, 배치 크기, 캐시 사용 목적을 함께 정의한다. |
| 정합성 | 멱등성·트랜잭션·동시성·재시도·상태 전이를 명시한다. |
| 확장성 | MVP에서 불필요한 분산 시스템을 넣지 않되, 병목 지점과 확장 경계를 문서화한다. |
| 운영성 | 장애 원인을 재현할 수 있도록 검증 결과·동기화 상태·실시간 연결 상태를 관측한다. |

## 21.1 비기능 요구사항(NFR)
| 영역 | 요구사항 | 검증 방식 |
|---|---|---|
| 데이터 유실 | 네트워크 단절만으로 진행 중 Run Point가 유실되지 않아야 함 | 비행기모드/복구 E2E |
| 멱등성 | Run 생성·GPS Batch·Finish 재시도 시 논리 데이터가 중복 생성되지 않아야 함 | 동일 요청 반복 통합 테스트 |
| 백그라운드 | OS 허용 범위 내에서 화면 잠금 후 기록 지속 및 복구 가능 | iOS/Android 실기기 필드 테스트 |
| 실시간 장애 격리 | WebSocket 장애가 개인 러닝 기록을 중단시키지 않아야 함 | WS 강제 종료 테스트 |
| 랭킹 정합성 | 공식 랭킹은 VERIFIED CourseRecord만 사용 | DB 통합 테스트 |
| DB 호환성 | 동일 Flyway migration과 핵심 쿼리가 개발 MySQL/운영 MariaDB에서 통과 | CI dual-DB test |
| 관측성 | Run 생성→업로드→Finish→Verification의 상관관계 추적 가능 | request/run correlation log |
| 보안 | 다른 사용자의 Run/GPS/친구 관계를 ID 변조로 접근할 수 없어야 함 | authorization integration test |

# 22. 데이터 모델 상세 설계
## 22.1 Aggregate 및 소유권
| Aggregate | Root | 포함/연계 | 설계 이유 |
|---|---|---|---|
| Running | Run | RunPoint는 별도 저장 경로, Verification/Record 연계 | GPS 대량 append와 일반 JPA 로딩 분리 |
| Course | Course | RoutePoint, Review, Bookmark | 재사용 가능한 기준 경로 |
| Social | Friendship | 두 User 관계 | 요청/승인 상태 자체가 도메인 |
| Challenge | Challenge | Target CourseRecord, Challenger Run | 검증된 기록만 목표로 사용 |
| Live | LiveRunRoom | LiveRunMember, 각 Member의 Run | 실시간 상태와 영구 Run 분리 |

RunPoint는 Run의 논리적 하위 데이터지만 ORM 컬렉션으로 로딩하지 않는다. 쓰기량과 조회 패턴이 다르기 때문에 전용 Repository/JDBC Batch 경로를 사용한다.
## 22.2 식별자와 멱등성 키
| 키 | 생성 주체 | 용도 | 제약 |
|---|---|---|---|
| run.id | Server DB | 영구 PK | BIGINT AUTO_INCREMENT |
| client_run_uuid | Mobile | 오프라인 Run 식별/Run 생성 재시도 | UNIQUE |
| run_point.seq | Mobile | Run 내부 Point 순서/중복 방지 | UNIQUE(run_id, seq) |
| batch_uuid | Mobile | GPS Batch 요청 멱등성 | UNIQUE(run_id, batch_uuid) |
| share_code | Server | 공유 URL 식별 | UNIQUE, 추측 어려운 랜덤값 |

## 22.3 물리 삭제 정책
| 테이블 | 기본 정책 | 이유 |
|---|---|---|
| tbl_user | 상태 전환 + 개인정보 처리 정책에 따른 후속 처리 | Run/랭킹/관계 참조 무결성 |
| tbl_run / tbl_run_point | 서비스 정책상 삭제 요청 처리 전까지 보존; 무조건 CASCADE 금지 | 핵심 원본 기록 |
| tbl_course | status/visibility/deleted_at 기반 비노출 | 기존 Run/CourseRecord 참조 |
| tbl_refresh_token | 폐기/만료 후 삭제 가능 | 세션 파생 데이터 |
| bookmark/notification | 물리 삭제 가능 | 파생·개인 UI 데이터 |
| live Redis state | 방 종료 후 TTL | 영구 사실이 아님 |

실제 개인정보 보존·삭제 기간은 서비스 정책 및 법적 검토 결과를 반영해 별도로 확정한다. DB FK 정책만으로 개인정보 처리 정책을 대신하지 않는다.
## 22.4 최종 Flyway DDL
-- V1__create_user.sql
CREATE TABLE tbl_user (
  id BIGINT NOT NULL AUTO_INCREMENT,
  provider VARCHAR(20) NOT NULL,
  provider_user_id VARCHAR(191) NOT NULL,
  nickname VARCHAR(40) NOT NULL,
  friend_code VARCHAR(20) NOT NULL,
  profile_image_url VARCHAR(500) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  deleted_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_user_provider (provider, provider_user_id),
  UNIQUE KEY uk_user_nickname (nickname),
  UNIQUE KEY uk_user_friend_code (friend_code),
  KEY idx_user_status (status)
);

CREATE TABLE tbl_refresh_token (
  id BIGINT NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  device_id VARCHAR(100) NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  revoked_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_refresh_device (user_id, device_id),
  KEY idx_refresh_expires_at (expires_at),
  CONSTRAINT fk_refresh_user FOREIGN KEY (user_id)
    REFERENCES tbl_user(id) ON DELETE CASCADE
);
-- V2__create_course.sql
CREATE TABLE tbl_course (
  id BIGINT NOT NULL AUTO_INCREMENT,
  creator_id BIGINT NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT NULL,
  distance_m INT NOT NULL,
  start_lat DECIMAL(10,7) NOT NULL,
  start_lng DECIMAL(10,7) NOT NULL,
  end_lat DECIMAL(10,7) NOT NULL,
  end_lng DECIMAL(10,7) NOT NULL,
  elevation_gain_m DECIMAL(8,2) NULL,
  difficulty VARCHAR(20) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'NEW',
  visibility VARCHAR(20) NOT NULL DEFAULT 'PUBLIC',
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  deleted_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  KEY idx_course_status_visibility (status, visibility),
  KEY idx_course_start_coordinate (start_lat, start_lng),
  KEY idx_course_creator_created (creator_id, created_at),
  CONSTRAINT fk_course_creator FOREIGN KEY (creator_id)
    REFERENCES tbl_user(id)
);

CREATE TABLE tbl_course_route_point (
  id BIGINT NOT NULL AUTO_INCREMENT,
  course_id BIGINT NOT NULL,
  seq INT NOT NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  altitude_m DECIMAL(8,2) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_course_route_seq (course_id, seq),
  CONSTRAINT fk_course_route_course FOREIGN KEY (course_id)
    REFERENCES tbl_course(id)
);
-- V3__create_run.sql
CREATE TABLE tbl_run (
  id BIGINT NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  course_id BIGINT NULL,
  client_run_uuid CHAR(36) NOT NULL,
  mode VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  started_at DATETIME(3) NOT NULL,
  ended_at DATETIME(3) NULL,
  elapsed_seconds INT NOT NULL DEFAULT 0,
  distance_m INT NOT NULL DEFAULT 0,
  avg_pace_sec_per_km INT NULL,
  elevation_gain_m DECIMAL(8,2) NULL,
  calories INT NULL,
  verification_status VARCHAR(20) NOT NULL DEFAULT 'NONE',
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_run_client_uuid (client_run_uuid),
  KEY idx_run_user_started (user_id, started_at),
  KEY idx_run_course_verification (course_id, verification_status),
  CONSTRAINT fk_run_user FOREIGN KEY (user_id) REFERENCES tbl_user(id),
  CONSTRAINT fk_run_course FOREIGN KEY (course_id) REFERENCES tbl_course(id)
);

CREATE TABLE tbl_run_point (
  id BIGINT NOT NULL AUTO_INCREMENT,
  run_id BIGINT NOT NULL,
  seq INT NOT NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  altitude_m DECIMAL(8,2) NULL,
  accuracy_m DECIMAL(7,2) NULL,
  speed_mps DECIMAL(7,3) NULL,
  quality_flag VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
  recorded_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_run_point_sequence (run_id, seq),
  KEY idx_run_point_recorded (run_id, recorded_at),
  CONSTRAINT fk_run_point_run FOREIGN KEY (run_id) REFERENCES tbl_run(id)
);

CREATE TABLE tbl_run_sync_batch (
  id BIGINT NOT NULL AUTO_INCREMENT,
  run_id BIGINT NOT NULL,
  batch_uuid CHAR(36) NOT NULL,
  from_seq INT NOT NULL,
  to_seq INT NOT NULL,
  point_count INT NOT NULL,
  received_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_run_batch_uuid (run_id, batch_uuid),
  KEY idx_run_batch_sequence (run_id, from_seq, to_seq),
  CONSTRAINT fk_run_batch_run FOREIGN KEY (run_id) REFERENCES tbl_run(id)
);

CREATE TABLE tbl_run_verification (
  id BIGINT NOT NULL AUTO_INCREMENT,
  run_id BIGINT NOT NULL,
  start_check VARCHAR(20) NOT NULL,
  end_check VARCHAR(20) NOT NULL,
  distance_check VARCHAR(20) NOT NULL,
  route_check VARCHAR(20) NOT NULL,
  speed_check VARCHAR(20) NOT NULL,
  match_rate DECIMAL(5,2) NULL,
  failure_reason VARCHAR(100) NULL,
  policy_version VARCHAR(30) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_verification_run_created (run_id, created_at),
  CONSTRAINT fk_verification_run FOREIGN KEY (run_id) REFERENCES tbl_run(id)
);

CREATE TABLE tbl_course_record (
  id BIGINT NOT NULL AUTO_INCREMENT,
  course_id BIGINT NOT NULL,
  run_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  duration_seconds INT NOT NULL,
  avg_pace_sec_per_km INT NOT NULL,
  match_rate DECIMAL(5,2) NOT NULL,
  verified_at DATETIME(3) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_course_record_run (run_id),
  KEY idx_course_record_ranking (course_id, duration_seconds),
  KEY idx_course_record_user_best (course_id, user_id, duration_seconds),
  KEY idx_course_record_period (course_id, created_at, duration_seconds),
  CONSTRAINT fk_record_course FOREIGN KEY (course_id) REFERENCES tbl_course(id),
  CONSTRAINT fk_record_run FOREIGN KEY (run_id) REFERENCES tbl_run(id),
  CONSTRAINT fk_record_user FOREIGN KEY (user_id) REFERENCES tbl_user(id)
);
## 22.5 검증 정책 버전
Course Verification 규칙은 향후 변경될 수 있으므로 tbl_run_verification.policy_version을 저장한다. 동일 기록이 어떤 정책으로 판정되었는지 재현할 수 있어야 한다. 정책 변경 시 기존 공식 기록을 일괄 재검증할지 여부는 별도 운영 정책으로 결정한다.
# 23. 쿼리 및 인덱스 설계
| Use Case | 주요 조건/정렬 | 인덱스/전략 |
|---|---|---|
| 내 러닝 히스토리 | user_id + started_at DESC | idx_run_user_started |
| 코스 공식 랭킹 | course_id + duration_seconds | idx_course_record_ranking |
| 사용자 코스 PB | course_id + user_id + duration_seconds | idx_course_record_user_best |
| 주간/월간 랭킹 | course_id + created_at 범위 + duration | idx_course_record_period; 실행계획 확인 |
| Run 경로 복원 | run_id + seq | UNIQUE(run_id, seq) |
| 주변 코스 | bounding box 후보 → 거리 계산 | 초기 start_lat/lng; 규모 증가 시 spatial 전략 검토 |
| 미읽음 알림 | user_id + read_at + created_at | 복합 인덱스 |

## 23.1 랭킹 쿼리
SELECT cr.user_id, MIN(cr.duration_seconds) AS best_seconds
FROM tbl_course_record cr
WHERE cr.course_id = :courseId
GROUP BY cr.user_id
ORDER BY best_seconds ASC, cr.user_id ASC
LIMIT :limit OFFSET :offset;
초기에는 위 구조로 시작하되 실제 EXPLAIN/데이터 규모에서 GROUP BY가 병목이 되면 course_user_best projection 테이블 또는 Redis Sorted Set을 도입한다. 캐시는 성능 측정 없이 선도입하지 않는다.
## 23.2 주변 코스 조회
초기 구현은 지도 viewport 또는 검색 반경으로 위·경도 bounding box 후보를 먼저 줄인 뒤 애플리케이션에서 실제 거리를 계산한다. 데이터 규모와 DB 버전별 공간 기능을 검증한 후 POINT/SRID/Spatial Index 도입 여부를 결정한다. MySQL과 MariaDB의 공간 타입/함수 동작 차이를 테스트 없이 동일하다고 가정하지 않는다.
# 24. 데이터 증가량 및 용량 계획
아래 수치는 제품 트래픽 예측이 아니라 저장 구조 검증을 위한 계산식이다. 실제 DAU·평균 러닝 시간·GPS 수집 주기를 측정한 뒤 다시 산정한다.
| 항목 | 계산식 |
|---|---|
| Run당 Point 수 | active_seconds / gps_interval_seconds |
| 일 Point 수 | daily_runs × avg_active_seconds / gps_interval_seconds |
| 월 Point 수 | daily_points × 30 |
| 저장량 추정 | monthly_points × 실제 row/index byte 실측값 |

예: 60분 러닝에서 3초 주기라면 약 1,200 Point가 생성된다. 이 값은 샘플링 정책의 예시이며 고정 사양이 아니다. 실제 테이블 크기는 MySQL/MariaDB의 row/index 크기를 적재 테스트로 측정한다.
## 24.1 확장 단계
| 단계 | 조건 | 대응 |
|---|---|---|
| MVP | 단일 RDB로 충분한 규모 | tbl_run_point 단일 테이블 + batch insert |
| 성장 | RunPoint 인덱스/백업/조회 비용 증가 | 보존정책, 파티셔닝 가능성, cold storage 검토 |
| 대규모 | RDB append 비용이 명확한 병목 | 시계열/객체 저장 등 별도 저장소는 실측 후 ADR로 결정 |

# 25. 트랜잭션 · 동시성 · 멱등성
## 25.1 Run 생성
POST /runs
1. authenticated user 확인
2. clientRunUuid로 기존 Run 조회
3. 존재하면 기존 Run 반환
4. 없으면 INSERT
5. UNIQUE 충돌 시 동일 clientRunUuid Run 재조회 후 반환
애플리케이션의 선조회만으로 동시 요청을 완전히 막을 수 없으므로 DB UNIQUE를 최종 방어선으로 사용한다.
## 25.2 GPS Batch
TX BEGIN
 → Run 존재/소유권/업로드 가능한 상태 확인
 → (run_id, batch_uuid) 처리 여부 확인
 → 이미 처리됨: 성공 응답
 → Point seq 범위/형식 검증
 → JDBC batch insert
 → tbl_run_sync_batch insert
TX COMMIT
동시 동일 Batch 요청은 UNIQUE(run_id,batch_uuid)와 UNIQUE(run_id,seq)로 보호한다. Duplicate Key 발생 시 요청 내용이 기존 처리와 동일한지 확인한 후 멱등 성공으로 응답하고, 동일 키에 다른 payload가 들어오면 충돌 오류로 처리한다.
## 25.3 Finish
RUNNING/PAUSED
   ↓ finish
FINISHING
   ↓ final batch flush / server summary
FINISHED
   ↓ course selected?
PENDING VERIFICATION
   ↓
VERIFIED / UNVERIFIED / REJECTED
Finish 재요청은 이미 FINISHED라면 기존 결과를 반환한다. RUNNING 이후 허용되지 않는 상태 전이는 409 Conflict 계열 도메인 오류로 처리한다.
## 25.4 Friendship 동시성
A→B와 B→A의 동시 요청을 단순 (requester_id, addressee_id) UNIQUE만으로 막을 수 없다. 서비스에서 두 사용자 ID를 정렬한 pair_key를 저장하거나 canonical_user_low/high 컬럼을 두고 UNIQUE를 거는 방식이 안전하다. 구현 시 아래 구조로 보정한다.
tbl_friendship
- id
- user_low_id   = MIN(A, B)
- user_high_id  = MAX(A, B)
- requester_id
- status
UNIQUE(user_low_id, user_high_id)
# 26. Course Verification 기술 설계
## 26.1 파이프라인
Raw Run Points
 → quality filtering
 → route normalization
 → start/end proximity
 → distance sanity
 → route coverage/matching
 → speed/teleport anomaly
 → policy aggregation
 → verification result + evidence
 → CourseRecord 생성 여부 결정
## 26.2 Verifier 인터페이스
public interface CourseVerifier {
    VerificationCheckResult verify(
        CourseSnapshot course,
        RunSnapshot run,
        VerificationPolicy policy
    );
}
| Verifier | 입력 | 출력/근거 |
|---|---|---|
| StartPointVerifier | 코스 시작점, Run 초기 유효 Point | 거리, PASS/FAIL |
| EndPointVerifier | 코스 종료점, Run 마지막 유효 Point | 거리, PASS/FAIL |
| DistanceVerifier | 코스 거리, Run 유효 거리 | 비율/차이 |
| RouteMatchVerifier | 코스 polyline, Run polyline | coverage/match rate |
| SpeedAnomalyVerifier | Point 간 거리/시간 | 비정상 segment 목록 |

## 26.3 경로 매칭 구현 원칙
- 코스의 각 점과 모든 Run Point를 O(N×M)로 무조건 비교하는 구현은 피한다.
- 초기에는 코스 polyline을 일정 간격으로 정규화/샘플링하고, 공간 후보를 줄인 뒤 점-선분 거리 기반 coverage를 계산한다.
- Run GPS도 지나치게 조밀한 경우 검증용 down-sampling을 적용할 수 있으나 원본은 보존한다.
- 루프 코스, 왕복 코스, 교차 구간은 단순 시작/끝점만으로 판단하지 않는다.
- 알고리즘 선택과 tolerance는 실제 수집 GPS 세트로 precision/false reject를 측정해 결정한다.
## 26.4 검증 결과 재현성
- policy_version 저장
- 각 check 결과와 match_rate 저장
- failure_reason 저장
- 원본 RunPoint 보존
- 검증 코드 변경 시 테스트 fixture로 이전 케이스 회귀 테스트
# 27. REST API 상세 계약
## 27.1 오류 모델
{
  "success": false,
  "data": null,
  "error": {
    "code": "RUN_INVALID_STATE",
    "message": "현재 상태에서는 러닝을 종료할 수 없습니다.",
    "details": null
  },
  "timestamp": "..."
}
| HTTP | 대표 코드 | 의미 |
|---|---|---|
| 400 | VALIDATION_ERROR | 요청 형식/값 오류 |
| 401 | AUTH_REQUIRED / TOKEN_EXPIRED | 인증 실패 |
| 403 | RESOURCE_FORBIDDEN | 소유권/권한 없음 |
| 404 | RUN_NOT_FOUND / COURSE_NOT_FOUND | 리소스 없음 |
| 409 | RUN_INVALID_STATE / IDEMPOTENCY_CONFLICT | 상태/멱등 충돌 |
| 422 | RUN_POINT_INVALID | 의미상 처리 불가한 GPS Batch |
| 429 | RATE_LIMITED | 과도한 요청 |
| 500 | INTERNAL_ERROR | 예상하지 못한 서버 오류 |

## 27.2 Run API 계약
| API | 멱등 키 | 트랜잭션 | 주의 |
|---|---|---|---|
| POST /runs | clientRunUuid | Run insert | UNIQUE 충돌 재조회 |
| POST /runs/{id}/points | batchUuid | Point batch + sync batch | 동일 key 다른 payload는 conflict |
| POST /runs/{id}/pause | 현재 상태 | Run update | RUNNING만 허용 |
| POST /runs/{id}/resume | 현재 상태 | Run update | PAUSED만 허용 |
| POST /runs/{id}/finish | Run 상태 | Run finalization | 재요청 시 기존 결과 |

## 27.3 Pagination
히스토리·Activity·알림은 데이터가 누적되므로 cursor pagination을 기본으로 한다. 단순 page/offset은 깊은 페이지에서 비용이 증가하고 실시간 삽입 시 중복/누락 가능성이 있어 핵심 피드성 API에서는 피한다.
GET /api/v1/runs?cursor=<opaque>&size=20

{
  "items": [...],
  "nextCursor": "...",
  "hasNext": true
}
# 28. Spring Boot 구현 구조
running/
├─ api/
│  ├─ RunController
│  ├─ RunRequest
│  └─ RunResponse
├─ application/
│  ├─ RunCommandService
│  ├─ RunQueryService
│  └─ RunPointUploadService
├─ domain/
│  ├─ Run
│  ├─ RunStatus
│  ├─ RunMode
│  └─ policy/
├─ persistence/
│  ├─ RunJpaRepository
│  ├─ RunPointJdbcRepository
│  └─ RunSyncBatchRepository
└─ verification/
   ├─ CourseVerificationService
   ├─ CourseVerifier
   └─ verifier/...
도메인별 패키지를 유지하되, GPS 대량 쓰기처럼 persistence 특성이 다른 경로는 명시적으로 분리한다. 모든 테이블을 JPA Entity 연관관계로 연결하지 않는다.
## 28.1 JPA/JDBC 사용 기준
| 대상 | 기본 방식 | 이유 |
|---|---|---|
| User/Course/Run/Challenge/Friendship | JPA | 상태 중심 도메인 로직 |
| RunPoint 대량 INSERT | JdbcTemplate batch | append-heavy, batch 제어 |
| 랭킹 복합 조회 | QueryDSL/Native/JDBC 중 실행계획 기준 | 집계/정렬 쿼리 |
| 주변 검색 | 초기 SQL 후보 조회 + Java 거리 계산 | DB 공간 의존 최소화 |

# 29. React Native Running Engine 상세
## 29.1 상태 소유권
| 데이터 | 소유 위치 | 이유 |
|---|---|---|
| 진행 중 Run 원본 상태 | SQLite | 프로세스 종료/재실행 복구 |
| GPS Point | SQLite | Local First |
| 화면 표시용 현재 값 | Zustand/컴포넌트 | 빠른 렌더링 |
| 서버 Run/히스토리 | TanStack Query | 서버 상태 캐시 |
| 동기화 큐 | SQLite | 네트워크 장애 재시도 |

## 29.2 로컬 스키마
local_run(
  client_run_uuid TEXT PRIMARY KEY,
  server_run_id INTEGER NULL,
  mode TEXT NOT NULL,
  course_id INTEGER NULL,
  status TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  ended_at INTEGER NULL,
  elapsed_ms INTEGER NOT NULL DEFAULT 0,
  last_seq INTEGER NOT NULL DEFAULT 0,
  sync_state TEXT NOT NULL
)

local_run_point(
  client_run_uuid TEXT NOT NULL,
  seq INTEGER NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  altitude REAL NULL,
  accuracy REAL NULL,
  speed REAL NULL,
  recorded_at INTEGER NOT NULL,
  quality_flag TEXT NOT NULL,
  sync_state TEXT NOT NULL,
  PRIMARY KEY(client_run_uuid, seq)
)

local_sync_batch(
  batch_uuid TEXT PRIMARY KEY,
  client_run_uuid TEXT NOT NULL,
  from_seq INTEGER NOT NULL,
  to_seq INTEGER NOT NULL,
  status TEXT NOT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  next_retry_at INTEGER NULL
)
## 29.3 Background Task 책임
- GPS 수신과 SQLite append만 핵심 책임으로 둔다.
- 네트워크 호출·복잡한 UI 상태 변경을 background callback에 과도하게 넣지 않는다.
- UI가 열려 있을 때는 DB 변경을 읽어 현재 지표를 갱신하고, background에서도 기록 자체는 독립적으로 지속한다.
- OS별 백그라운드 제한은 실기기에서 검증하며 Expo Go가 아닌 Development Build를 사용한다.
## 29.4 Sync Worker
PENDING points 존재
 → server_run_id 확인
 → 없으면 POST /runs (clientRunUuid)
 → 연속 seq 기준 Batch 생성
 → POST /points(batchUuid)
 → 성공: points SYNCED + batch ACKED
 → 실패: retry_count 증가 + backoff
 → Finish 요청 시 가능한 범위까지 flush
재시도는 즉시 무한 반복하지 않고 backoff를 적용한다. 앱 종료·네트워크 전환 후에도 SQLite 상태를 기반으로 이어서 처리한다.
# 30. 실시간 Together 성능 설계
## 30.1 데이터 경로
Runner A/B/C
   │ 3~5s state update (initial assumption)
   ▼
WebSocket/STOMP
   ▼
LiveRunService
   ├─ Redis latest state
   └─ room broadcast
         ▼
      Clients

Finish
   ▼
MariaDB final result
## 30.2 서버가 받는 데이터
실시간 경쟁에는 distance, elapsed, pace, status, sequence 정도만 전송한다. 개인 GPS 원본은 기존 Run Sync 경로로 별도 저장한다. 이 분리로 실시간 메시지 크기와 개인정보 노출을 줄인다.
## 30.3 메시지 순서
- member별 monotonically increasing seq를 둔다.
- 서버는 마지막 seq보다 작거나 같은 stale message를 무시한다.
- 클라이언트는 서버 update 사이를 보간하여 UI를 부드럽게 표시할 수 있다.
- 서버 시각 하나만으로 실제 러닝 시간을 계산하지 않고 각 Run의 시작 기준과 클라이언트/서버 이벤트를 함께 검증한다.
## 30.4 Presence
heartbeat 만료는 '실시간 연결 끊김'을 의미할 뿐 Run 종료를 의미하지 않는다. DISCONNECTED 상태로 표시하고 재연결 시 최신 Redis snapshot을 전달한다.
## 30.5 확장 기준
초기에는 단일 Spring Boot 인스턴스에서도 구현 가능하다. 인스턴스가 여러 대가 되면 로컬 메모리 room state에 의존하지 않고 Redis 기반 공유 상태/메시지 브로커 전략을 검토한다. 분산 전환은 동시 접속/메시지량 측정 후 결정한다.
# 31. 성능 테스트 계획
| 대상 | 시나리오 | 측정 |
|---|---|---|
| RunPoint insert | Batch 크기별 INSERT | rows/s, transaction latency, DB CPU |
| Run history | 사용자별 누적 Run 증가 | p50/p95, rows examined |
| Ranking | CourseRecord 수 증가 + GROUP BY | p50/p95, temp/filesort, EXPLAIN |
| Nearby course | Course 수 증가 + viewport | 후보 수, latency |
| Verification | Point/Route 길이 증가 | CPU time, memory, match latency |
| WebSocket | 동시 room/member 증가 | messages/s, p95 broadcast latency, reconnect |
| Redis | member state update/read | ops/s, memory |
| Mobile | GPS interval별 | 배터리, point loss, UI smoothness |

## 31.1 성능 목표 수립 방식
임의의 '100ms 보장' 같은 숫자를 먼저 고정하지 않는다. 실제 MVP 예상 동시 사용자와 테스트 장비를 정의한 뒤 baseline을 측정하고, 사용자 경험에 영향을 주는 API/실시간 지연 목표를 설정한다. 결과는 테스트 환경·데이터 크기와 함께 기록한다.
# 32. 장애 시나리오와 복구
| 장애 | 개인 Run | 서버 데이터 | 사용자 경험 |
|---|---|---|---|
| 모바일 네트워크 단절 | SQLite 계속 기록 | 업로드 지연 | 러닝 지속, 연결 복구 후 sync |
| API 서버 일시 장애 | SQLite 계속 기록 | 미전송 | 결과 로컬 보존, 재시도 |
| WebSocket 단절 | Run 계속 | Live state stale | 연결 끊김 표시, 재연결 |
| Redis 장애 | Run 계속 | Live 기능 저하 | Together degraded; 개인 기록 유지 |
| DB 장애 | 로컬 기록 계속 | 서버 저장 지연 | 동기화 대기 |
| 앱 프로세스 종료 | OS/기록 상황에 따라 중단 가능 | 기존 sync 보존 | 재실행 시 recovery |
| 중복 요청 | 영향 없음 목표 | UNIQUE/idempotency로 단일 논리 처리 | 기존 성공 결과 반환 |

# 33. 보안 설계 상세
- Run/Point API는 JWT userId와 Run.userId를 반드시 비교한다.
- courseId, targetRecordId, roomId 등 클라이언트 ID를 신뢰하지 않고 서버에서 접근 가능 여부를 검증한다.
- Refresh Token은 로그/응답 외부에 노출하지 않고 저장 시 원문 보관을 피한다.
- GPS payload 전체를 일반 애플리케이션 로그에 남기지 않는다.
- 공유 URL은 내부 PK 직접 노출 대신 share_code를 사용한다.
- 업로드 파일은 content-type만 믿지 않고 서버 측 검증, 크기 제한, 안전한 파일명 정책을 적용한다.
- Rate limit 대상 후보: 로그인, 사용자 검색, 친구 요청, share resolve, WebSocket connect.
# 34. 관측성 상세
| Trace/Metric | 키 |
|---|---|
| Run lifecycle | clientRunUuid, serverRunId, userId(내부 식별자), state transition |
| Sync | batchUuid, fromSeq, toSeq, retryCount, result |
| Verification | runId, policyVersion, matchRate, failureReason |
| Live | roomId, userId, connectionId, seq, reconnect count |
| DB | query name, duration, rows/plan sample |
| Push | notification type, provider ticket status |

개인정보와 정밀 위치정보를 관측성 데이터에 과도하게 포함하지 않는다. correlation identifier로 흐름을 추적한다.
# 35. ADR(Architecture Decision Record)
| ID | 결정 | 선택 | 근거 |
|---|---|---|---|
| ADR-001 | Local-First GPS | 서버 직접 스트리밍 대신 SQLite 선저장 | 네트워크 장애와 앱/서버 결합도를 낮추고 기록 유실 위험을 줄임 |
| ADR-002 | Run과 CourseRecord 분리 | 모든 Run을 공식 기록으로 취급하지 않음 | 검증된 경쟁 데이터만 별도 모델로 유지 |
| ADR-003 | RunPoint JDBC Batch | RunPoint를 JPA 컬렉션/개별 save하지 않음 | 대량 append 데이터의 ORM 오버헤드와 불필요 로딩 방지 |
| ADR-004 | MySQL Dev / MariaDB Prod Dual Test | 호환성을 가정하지 않음 | SQL/DDL/JSON/Spatial 차이를 CI에서 검증 |
| ADR-005 | Redis는 Live State부터 | 랭킹 캐시 선도입 안 함 | 실시간 상태는 휘발성·고빈도, 랭킹은 초기 RDB로 충분한지 측정 |
| ADR-006 | Verification Policy Versioning | 판정 결과만 저장하지 않음 | 정책 변경 후 판정 근거 재현 가능 |
| ADR-007 | REST + WebSocket 분리 | 모든 Live 기능을 WebSocket으로 처리하지 않음 | 방 lifecycle은 REST, 고빈도 state만 WS |
| ADR-008 | Domain package 구조 | controller/service/repository 전역 분리 안 함 | 기능 확장 시 응집도 유지 |

# 36. 구현 및 검증 순서
| Stage | 구현 | 통과 조건 |
|---|---|---|
| A | Expo Background GPS + SQLite | 화면 잠금/오프라인 포함 실기기 기록 복원 |
| B | Run API + Idempotent Sync | 중복/응답 유실/재시도 테스트 통과 |
| C | Course + Verification | 실제 코스 fixture로 정상/이탈 판정 재현 |
| D | CourseRecord + Ranking | VERIFIED만 랭킹, PB/기간 랭킹 정합성 |
| E | Friend + Challenge | 검증 기록 기반 도전/동시 요청 처리 |
| F | WebSocket + Redis PoC | 2~4기기 동시/단절/재접속 |
| G | Together | 개인 Run과 Live 결과 일관성 |
| H | Hardening | MySQL/MariaDB, 부하, 보안, 장애 테스트 |

# 37. 포트폴리오 산출물 기준
포트폴리오용 표현을 위해 기술을 억지로 추가하지 않는다. 실제 구현과 측정 결과만 다음 산출물로 남긴다.
| 산출물 | 포함 내용 |
|---|---|
| Architecture Diagram | Mobile Local-First → API → DB → Verification → Ranking / Live Redis 경로 |
| ERD | Run/Point/Record 분리와 관계 |
| ADR | 왜 JPA/JDBC, RDB/Redis, REST/WS를 나눴는지 |
| Performance Report | Batch 크기, 랭킹 쿼리, verification 시간, WS 부하 실측 |
| Failure Test | 네트워크/서버/WS 장애에서 데이터 보존 결과 |
| Before/After | 문제 발생 로그 → 설계 변경 → 수치 개선 |
| README | 문제 정의, 핵심 설계, 실행 방법, 테스트 결과 |

특히 '대용량', '고성능', '무중단', '실시간' 같은 표현은 실제 부하 조건과 측정값이 확보된 뒤 사용한다.
# 38. v1.1 오픈 이슈
| ID | 항목 | 결정 근거 |
|---|---|---|
| OI-01 | Map SDK | 국내 지도 품질, Expo Dev Build 지원, 라이선스/비용, polyline 성능 |
| OI-02 | GPS sampling policy | 실기기 정확도·배터리 측정 |
| OI-03 | Course route representation | route point vs encoded polyline vs spatial type 성능/호환 테스트 |
| OI-04 | Verification algorithm | 실제 GPS fixture 기반 false accept/reject |
| OI-05 | Ranking projection | 실제 CourseRecord 규모에서 EXPLAIN/부하 측정 |
| OI-06 | Live transport scaling | 동시 사용자/room/message rate 측정 |
| OI-07 | Data retention | 서비스 정책 및 개인정보/위치정보 법적 검토 |
| OI-08 | Privacy zone | 공유 경로의 시작/종료 위치 노출 위험 검토 |

# 39. 구현 명세 기준선 v1.2
본 장은 v1.1 기술 설계를 실제 코드베이스에 적용하기 위한 구현 계약이다. 라이브러리 버전과 지도 SDK처럼 외부 환경에 따라 변하는 항목은 저장소 생성 시점에 공식 호환성을 확인해 lock file로 고정하며, 본 문서에서는 특정 최신 버전을 임의로 확정하지 않는다.
## 39.1 저장소 구성
dallimo/
├─ apps/
│  └─ mobile/                  # React Native + Expo
├─ server/                     # Spring Boot
├─ infra/
│  ├─ docker/
│  └─ deploy/
├─ docs/
│  ├─ adr/
│  ├─ api/
│  ├─ db/
│  ├─ performance/
│  └─ test/
└─ README.md
모바일과 서버를 별도 저장소로 분리해도 되지만, 개인/소규모 프로젝트에서는 변경 추적과 문서 동기화를 위해 monorepo 형태도 실용적이다. 실제 팀 운영 방식에 맞춰 선택하며 런타임 결합을 의미하지 않는다.
# 40. Spring Boot 프로젝트 상세 설계
## 40.1 모듈/패키지
server/src/main/java/.../
├─ common/
│  ├─ config/
│  ├─ error/
│  ├─ security/
│  ├─ time/
│  └─ web/
├─ auth/
├─ user/
├─ running/
├─ course/
├─ ranking/
├─ friend/
├─ challenge/
├─ live/
├─ activity/
├─ notification/
└─ share/

각 도메인:
<domain>/
├─ api/
├─ application/
├─ domain/
└─ infrastructure/
## 40.2 의존성 방향
api
 ↓
application
 ↓
domain
 ↑
infrastructure implements ports

domain은 Web/JPA/Redis/Push 구현 세부사항을 직접 의존하지 않는다.
단, 프로젝트 규모가 작은 초기 단계에서 모든 도메인에 형식적인 Port/Adapter 인터페이스를 강제하지 않는다. 교체 가능성·테스트 격리 가치가 있는 외부 경계(DB 대량쓰기, Push, Redis, OAuth 등)에 우선 적용한다.
## 40.3 서버 의존성 범주
| 범주 | 필요 기능 | 선정 원칙 |
|---|---|---|
| Web | REST, Validation | Spring MVC + Bean Validation |
| Security | JWT, OAuth 결과 검증 | Spring Security |
| Persistence | 일반 도메인 CRUD | Spring Data JPA |
| Bulk Persistence | RunPoint Batch | JdbcTemplate |
| Migration | 스키마 버전 관리 | Flyway |
| Realtime | STOMP/WebSocket | Spring WebSocket |
| Cache/Live State | Redis | Spring Data Redis 또는 명시적 client |
| Test | 통합/DB 호환 | JUnit + Testcontainers |
| Observability | health/metrics | Actuator + 운영 metric exporter |

## 40.4 공통 시간 정책
- 도메인 내부의 기준 시간은 UTC Instant 사용을 우선한다.
- API는 offset이 포함된 ISO-8601을 수신하고 서버에서 Instant로 정규화한다.
- DB DATETIME(3)을 사용할 경우 JDBC/서버 timezone 설정을 UTC로 고정하고 CI에서 확인한다.
- 사용자 화면 표시는 디바이스/사용자 timezone에서 변환한다.
- scheduled Together는 '절대 시각 + 표시 timezone' 요구가 있는지 UI 정책과 함께 검토한다.
# 41. OpenAPI 계약 - 인증/사용자
| Method | Path | Request | Response | Errors |
|---|---|---|---|---|
| POST | /api/v1/auth/social | provider, idToken/accessToken, deviceId | accessToken, refreshToken, user | 401/409 |
| POST | /api/v1/auth/refresh | refreshToken, deviceId | new access/refresh token | 401 |
| POST | /api/v1/auth/logout | refresh token/device context | 204 | 401 |
| GET | /api/v1/users/me | - | UserProfileResponse | 401 |
| PATCH | /api/v1/users/me | nickname?, profileImage? | UserProfileResponse | 400/409 |
| GET | /api/v1/users/search | q,cursor,size | UserSummary[] | 400/401 |

## 41.1 Social Login Request
{
  "provider": "KAKAO",
  "credential": "<provider credential>",
  "deviceId": "<installation-scoped id>"
}
클라이언트가 provider의 user id를 직접 신뢰 가능한 값으로 보내는 방식은 사용하지 않는다. 서버가 provider credential을 검증하고 provider subject를 추출한다.
# 42. OpenAPI 계약 - Run
| Method | Path | Idempotency | 핵심 응답 |
|---|---|---|---|
| POST | /api/v1/runs | clientRunUuid | runId, clientRunUuid, status, serverTime |
| POST | /api/v1/runs/{runId}/points | batchUuid | accepted range, lastAcceptedSeq |
| POST | /api/v1/runs/{runId}/pause | 상태 기반 | status, pausedAt |
| POST | /api/v1/runs/{runId}/resume | 상태 기반 | status, resumedAt |
| POST | /api/v1/runs/{runId}/finish | 상태 기반 | run summary, verification status |
| GET | /api/v1/runs/{runId} | - | run detail |
| GET | /api/v1/runs | - | cursor history |

## 42.1 Run Create
POST /api/v1/runs

{
  "clientRunUuid": "9f12...",
  "mode": "COURSE",
  "courseId": 52,
  "challengeId": null,
  "liveRoomId": null,
  "startedAt": "2026-09-23T12:00:00.123Z"
}

201 / 200(idempotent replay)
{
  "runId": 1024,
  "clientRunUuid": "9f12...",
  "status": "RUNNING",
  "serverTime": "2026-09-23T12:00:01.000Z"
}
## 42.2 Point Batch
POST /api/v1/runs/1024/points

{
  "batchUuid": "b7d4...",
  "fromSeq": 101,
  "toSeq": 130,
  "points": [
    {
      "seq": 101,
      "latitude": 35.1234567,
      "longitude": 128.1234567,
      "altitudeM": 31.2,
      "accuracyM": 4.8,
      "speedMps": 2.91,
      "recordedAt": "2026-09-23T12:03:01.120Z"
    }
  ]
}

200
{
  "batchUuid": "b7d4...",
  "accepted": true,
  "lastAcceptedSeq": 130
}
## 42.3 Batch validation
- points가 비어 있으면 400.
- fromSeq/toSeq와 실제 최소/최대 seq가 불일치하면 422.
- 동일 Batch UUID에 이전과 다른 seq 범위/point count가 오면 IDEMPOTENCY_CONFLICT.
- Run 소유자가 아니면 403.
- FINISHED/CANCELED Run에 신규 point 업로드는 정책상 허용하지 않으며 recovery 예외가 필요하면 별도 상태로 명시한다.
- 서버는 클라이언트가 보내는 누적 distance를 공식 원본으로 신뢰하지 않는다.
## 42.4 Finish Contract
POST /api/v1/runs/{runId}/finish

{
  "endedAt": "2026-09-23T12:31:22.100Z",
  "lastSeq": 624
}

200
{
  "runId": 1024,
  "status": "FINISHED",
  "distanceM": 5218,
  "elapsedSeconds": 1624,
  "avgPaceSecPerKm": 311,
  "verificationStatus": "PENDING"
}
Finish 요청의 lastSeq보다 서버에 저장된 마지막 seq가 작으면 서버는 즉시 확정하지 않고 동기화 미완료 오류/FINISHING 상태를 반환하는 방식을 채택한다. 클라이언트는 누락 Batch를 전송한 뒤 Finish를 재시도한다.
# 43. OpenAPI 계약 - Course/Ranking
| Method | Path | 주요 Query/Body | 응답 |
|---|---|---|---|
| GET | /api/v1/courses/nearby | lat,lng,radius/viewport,cursor,size | CourseSummary[] |
| GET | /api/v1/courses/search | query, filters, cursor,size | CourseSummary[] |
| GET | /api/v1/courses/{id} | - | CourseDetail |
| POST | /api/v1/courses | sourceRunId,name,description,tags | CourseDetail |
| GET | /api/v1/courses/{id}/route | - | ordered route points/polyline representation |
| GET | /api/v1/courses/{id}/rankings | scope,period,cursor,size | RankingEntry[] |
| POST | /api/v1/courses/{id}/bookmarks | - | 204 |
| DELETE | /api/v1/courses/{id}/bookmarks | - | 204 |
| POST | /api/v1/courses/{id}/reviews | runId,scores,content | Review |

## 43.1 Course 생성 제약
- sourceRunId는 요청 사용자 소유의 FINISHED Run이어야 한다.
- RunPoint가 코스 생성에 충분하지 않으면 생성 거부한다.
- 코스 경로는 source Run의 원본 Point를 그대로 복사하는 것이 아니라 코스용 정규화 과정을 거칠 수 있다.
- 코스 생성 후 원본 Run이 변경되더라도 Course route snapshot은 불변으로 유지하는 방향을 기본으로 한다.
# 44. OpenAPI 계약 - Friend/Challenge
| Method | Path | 설명 |
|---|---|---|
| POST | /api/v1/friends/requests | 대상 userId에 요청 |
| GET | /api/v1/friends/requests | 받은/보낸 요청 |
| POST | /api/v1/friends/requests/{id}/accept | 승인 |
| POST | /api/v1/friends/requests/{id}/reject | 거절 |
| DELETE | /api/v1/friends/{userId} | 친구 관계 삭제 |
| POST | /api/v1/challenges | targetCourseRecordId로 도전 생성 |
| GET | /api/v1/challenges/{id} | 도전/목표 기록 조회 |
| POST | /api/v1/challenges/{id}/cancel | 미시작 도전 취소 |

## 44.1 Friendship DB 보정
CREATE TABLE tbl_friendship (
  id BIGINT NOT NULL AUTO_INCREMENT,
  user_low_id BIGINT NOT NULL,
  user_high_id BIGINT NOT NULL,
  requester_id BIGINT NOT NULL,
  status VARCHAR(20) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  responded_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_friend_pair (user_low_id, user_high_id),
  KEY idx_friend_requester_status (requester_id, status),
  CONSTRAINT fk_friend_low FOREIGN KEY (user_low_id) REFERENCES tbl_user(id),
  CONSTRAINT fk_friend_high FOREIGN KEY (user_high_id) REFERENCES tbl_user(id),
  CONSTRAINT fk_friend_requester FOREIGN KEY (requester_id) REFERENCES tbl_user(id)
);
user_low_id/high_id는 요청 방향과 무관한 canonical pair다. requester_id가 실제 요청 방향을 보존한다. 승인 후에는 pair 하나가 관계 하나를 나타낸다.
# 45. OpenAPI 계약 - Together
| Method | Path | 설명 |
|---|---|---|
| POST | /api/v1/live-runs | 방 생성 |
| GET | /api/v1/live-runs/{roomId} | 방 snapshot |
| POST | /api/v1/live-runs/{roomId}/invite | 친구 초대 |
| POST | /api/v1/live-runs/{roomId}/join | 참가 |
| POST | /api/v1/live-runs/{roomId}/ready | READY 전환 |
| POST | /api/v1/live-runs/{roomId}/leave | 나가기/DNF |
| POST | /api/v1/live-runs/{roomId}/cancel | Host 취소(시작 전 정책) |
| GET | /api/v1/live-runs/{roomId}/result | 최종 결과 |

## 45.1 Live Room invariant
- LIVE_RACE는 targetDistanceM 필수, targetSeconds는 null.
- TIME_ATTACK은 targetSeconds 필수.
- TOGETHER는 승패/순위 저장 정책을 별도 정의할 수 있으나 개인 Run은 항상 생성한다.
- RUNNING 이후 참가자 추가 허용 여부는 MVP에서는 불허를 기본으로 한다.
- 방 상태 전이는 서버가 결정한다. 클라이언트가 started/finished 상태를 직접 지정하지 않는다.
# 46. WebSocket 메시지 계약
| 방향 | Type | 필드 |
|---|---|---|
| C→S | RUN_STATE | roomId, memberSeq, runId, distanceM, elapsedMs, currentPace, status, sentAt |
| C→S | HEARTBEAT | roomId, memberSeq, sentAt |
| S→C | ROOM_SNAPSHOT | room status, startedAt, members latest state |
| S→C | MEMBER_STATE | member latest progress |
| S→C | RANK_CHANGED | ordered member ids + progress |
| S→C | MEMBER_CONNECTION | connected/disconnected/reconnected |
| S→C | MEMBER_FINISHED | final live result |
| S→C | ROOM_FINISHED | all terminal members + final ordering |
| S→C | ERROR | code, message, recoverable |

## 46.1 메시지 정합성
- memberSeq는 방/사용자 기준 증가한다.
- 서버는 마지막 처리 seq 이하의 메시지를 stale로 간주한다.
- distanceM은 실시간 UX용 상태이며 공식 개인 Run 결과는 RunPoint 처리 결과를 사용한다.
- 클라이언트의 실시간 rank와 최종 영구 결과가 다를 수 있으며 결과 화면에서는 서버 finalization 값을 사용한다.
# 47. Redis Key/Atomicity 설계
live:room:{roomId}:meta
  status
  mode
  targetDistanceM
  targetSeconds
  startedAt

live:room:{roomId}:member:{userId}
  seq
  distanceM
  elapsedMs
  pace
  status
  lastSeenAt

live:room:{roomId}:members
  SET of userIds
여러 필드를 함께 갱신할 때 부분 상태가 노출되지 않도록 Redis hash 단위 업데이트 또는 Lua/transaction 사용 여부를 구현 시 결정한다. 순위 계산이 단순 거리 기준이면 서버에서 snapshot 기반으로 계산하고, 동시 사용자 규모가 커질 때 Sorted Set 전환을 검토한다.
## 47.1 TTL
TTL은 고정 숫자를 문서에서 임의 확정하지 않는다. 예약 방은 scheduledAt 이후 최대 러닝 지속시간 + 복구 여유시간을 고려해 계산하고, 종료 방은 영구 결과가 DB에 반영된 뒤 짧은 복구용 TTL을 둔다.
# 48. Flyway 마이그레이션 전체 계획
| Migration | 내용 |
|---|---|
| V1 | User, RefreshToken |
| V2 | Course, CourseRoutePoint |
| V3 | Run, RunPoint, RunSyncBatch, RunVerification, CourseRecord |
| V4 | Friendship, Challenge |
| V5 | CourseBookmark, CourseReview, CourseReport |
| V6 | LiveRunRoom, LiveRunMember |
| V7 | Activity, Notification, ShareLink |
| V8+ | 실측 결과에 따른 index/projection/spatial 변경 |

## 48.1 Migration 원칙
- 운영에 적용된 migration 파일은 수정하지 않고 새 migration으로 변경한다.
- DDL은 MySQL과 MariaDB CI 모두에서 실행한다.
- 대용량 테이블 index 추가/변경은 운영 데이터 규모가 커진 뒤 lock 영향까지 별도 검토한다.
- JPA ddl-auto는 운영 schema 변경 수단으로 사용하지 않는다.
# 49. Expo 프로젝트 상세 구조
apps/mobile/
├─ app/
│  ├─ (auth)/
│  ├─ (tabs)/
│  │  ├─ explore/
│  │  ├─ run/
│  │  ├─ together/
│  │  └─ my/
│  └─ run-session/
├─ src/
│  ├─ features/
│  ├─ entities/
│  ├─ shared/
│  │  ├─ api/
│  │  ├─ db/
│  │  ├─ location/
│  │  ├─ sync/
│  │  ├─ auth/
│  │  └─ telemetry/
│  └─ tasks/
│     └─ backgroundLocationTask.ts
└─ app.config.ts
## 49.1 Run Engine interface
interface RunningEngine {
  prepare(input: RunPrepareInput): Promise<void>;
  start(): Promise<ActiveRun>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  finish(): Promise<RunFinishResult>;
  recover(): Promise<ActiveRun | null>;
}

interface RunPointStore {
  append(point: LocalRunPoint): Promise<void>;
  getUnsyncedRange(runUuid: string, limit: number): Promise<LocalRunPoint[]>;
  markSynced(runUuid: string, fromSeq: number, toSeq: number): Promise<void>;
}
UI 컴포넌트가 expo-location이나 SQLite를 직접 호출하지 않고 RunningEngine/Store 경계를 통하도록 한다. 테스트에서 GPS source와 persistence를 교체할 수 있어야 한다.
## 49.2 Location Adapter
interface LocationSource {
  requestPermissions(): Promise<LocationPermissionState>;
  startForeground(handler: PointHandler): Promise<void>;
  startBackground(): Promise<void>;
  stop(): Promise<void>;
  getCurrentQuality(): Promise<GpsQuality>;
}
실제 Expo API shape를 그대로 도메인 전체에 퍼뜨리지 않는다. 단, 단순 wrapper만 늘어나는 수준이라면 과도한 추상화를 피하고 테스트/교체 가치가 있는 경계만 유지한다.
# 50. SQLite 트랜잭션 및 동기화
## 50.1 GPS append
BEGIN
  validate seq > last_seq
  INSERT local_run_point
  UPDATE local_run.last_seq
COMMIT

UI metric update는 commit 이후 수행
## 50.2 Batch 생성
미전송 Point를 무조건 N개씩 자르는 대신 연속 seq 범위를 선택한다. 이미 ACK된 구간을 건너뛰고 gap이 있으면 별도 Batch로 만든다. Batch UUID는 생성 후 SQLite에 먼저 기록한 뒤 전송한다.
## 50.3 Retry state
| 상태 | 의미 |
|---|---|
| PENDING | 전송 전 |
| SENDING | 현재 요청 중 |
| ACKED | 서버 처리 확인 |
| RETRY_WAIT | 일시 실패 후 backoff |
| FAILED | 재시도 불가능한 validation/auth 문제 |

프로세스 종료 후 SENDING 상태가 남아 있으면 재기동 시 RETRY_WAIT/PENDING으로 복구하여 동일 batchUuid로 재전송한다.
# 51. GPS 계산 파이프라인
Raw Point
 → structural validation
 → accuracy metadata
 → temporal order check
 → segment calculation
 → anomaly classification
 → accepted/rejected-for-metric
 → distance accumulator
 → pace window
 → local persistence (raw + flag)
원본 Point를 삭제하거나 덮어쓰지 않고 quality flag를 함께 보존한다. 거리 계산에 제외된 Point도 디버깅/검증 재현에 필요할 수 있다.
## 51.1 Distance
짧은 구간의 위경도 거리 계산은 지구 곡률을 고려한 공식을 사용한다. 어떤 공식을 사용할지는 구현 라이브러리와 오차 측정을 통해 고정하며, 서버/클라이언트가 서로 다른 계산식을 사용할 경우 결과 차이를 허용할 정책을 둔다.
## 51.2 Pace
- 평균 페이스 = active elapsed / accepted distance.
- 현재 페이스는 단일 GPS speed가 아니라 최근 accepted segments의 거리/시간 window를 기반으로 계산한다.
- 초기 구간처럼 거리 표본이 부족할 때는 '--' 또는 안정화 상태를 표시한다.
- 정지/재개 시 window를 리셋하거나 pause segment를 제외한다.
- UI smoothing과 공식 결과 계산을 구분한다.
# 52. Course Matching 구현 후보 및 벤치마크
| 후보 | 장점 | 위험/검증 |
|---|---|---|
| Point-to-polyline coverage | 설명/구현 비교적 명확 | 긴 route에서 계산량; spatial candidate 최적화 필요 |
| Resampled route + nearest segment | GPS 밀도 차이 완화 | sampling interval 영향 |
| Map matching 외부 엔진 | 도로망 기반 정확도 가능 | 비용/의존성/러닝 전용 보행로 품질 |
| DB Spatial function | 쿼리/인덱스 활용 | MySQL/MariaDB 호환·알고리즘 결합 |

v1에서는 외부 map matching 엔진을 필수 전제로 두지 않는다. 실제 수집 코스/Run fixture를 확보한 뒤 정확도·CPU 비용을 비교해 ADR로 결정한다.
# 53. 테스트 케이스 카탈로그
| ID | 시나리오 | 기대 결과 |
|---|---|---|
| RUN-IT-001 | Run 생성 동일 UUID 2회 | 동일 runId 반환, row 1개 |
| RUN-IT-002 | 동일 Batch UUID 재전송 | Point 중복 없음, 성공 응답 |
| RUN-IT-003 | 동일 Batch UUID 다른 payload | 409 conflict |
| RUN-IT-004 | Point seq 중복 | 중복 데이터 미생성 |
| RUN-IT-005 | 다른 사용자 Run 업로드 | 403 |
| RUN-IT-006 | 누락 Batch 상태에서 Finish | 확정 거부/FINISHING |
| RUN-IT-007 | Finish 재요청 | 동일 최종 결과 |
| GPS-M-001 | 화면 잠금 | 기록 지속/복구 여부 기록 |
| GPS-M-002 | 비행기모드 20분 | SQLite 누적 후 재연결 sync |
| GPS-M-003 | 앱 재시작 | active run recovery |
| GPS-M-004 | GPS jump fixture | metric 제외 + raw 보존 |
| CRS-IT-001 | 정상 코스 완주 | VERIFIED + CourseRecord |
| CRS-IT-002 | 중간 구간 생략 | 정책에 따른 UNVERIFIED |
| CRS-IT-003 | 비정상 속도 | 검증 실패 근거 저장 |
| RNK-IT-001 | 한 사용자 여러 기록 | 최고 기록만 사용자 랭킹 대표 |
| FRD-IT-001 | A→B/B→A 동시 요청 | Friendship 1개 |
| LIVE-IT-001 | stale memberSeq | 서버 무시 |
| LIVE-IT-002 | WS disconnect/reconnect | Run 지속 + snapshot 복구 |
| LIVE-IT-003 | Redis state와 final Run 차이 | 최종 결과는 Run finalization 기준 |
| DB-COMP-001 | 전체 Flyway | MySQL/MariaDB 모두 성공 |
| DB-COMP-002 | 핵심 ranking query | 두 DB에서 결과 동일 |

# 54. 성능 벤치마크 문서 양식
실측 전 결과를 작성하지 않는다. 아래 표를 각 벤치마크 실행 시 채운다.
| 항목 | 기록 |
|---|---|
| 환경 | CPU/RAM/DB 버전/JVM/네트워크 |
| 데이터 규모 | users/runs/points/course_records |
| 시나리오 | 예: 50-point batch insert |
| 동시성 | workers/connections |
| 측정 시간 | warm-up 포함 여부 |
| p50/p95/p99 | 실측 |
| throughput | 실측 |
| DB CPU/IO | 실측 |
| EXPLAIN | plan 요약 |
| 병목 | 근거 |
| 변경 | index/batch/query/code |
| 변경 후 결과 | 동일 조건 재측정 |

# 55. CI 품질 게이트
Pull Request
 ├─ mobile: typecheck / lint / unit
 ├─ server: unit / architecture tests
 ├─ MySQL Testcontainers integration
 ├─ MariaDB Testcontainers integration
 ├─ Flyway clean+migrate validation
 └─ API contract tests

main
 ├─ build artifacts
 ├─ security/dependency scan (선택 도구 확정 후)
 ├─ deploy dev
 └─ smoke test
성능 테스트는 모든 PR마다 전체 실행하기보다 정기/릴리스 전 또는 성능 민감 변경 시 별도 job으로 운영한다.
# 56. 문서/코드 추적성
| 문서 ID | 코드 위치 예 | 테스트 |
|---|---|---|
| RUN-007 | running/application/RunPointUploadService | RUN-IT-002~004 |
| CRUN-004 | running/verification/* | CRS-IT-001~003 |
| RNK-001 | ranking/* | RNK-IT-001 |
| TGT-009 | live/* + Redis | LIVE-IT-001~003 |
| LOC-004 | mobile location/metric pipeline | GPS-M-004 |

기능 ID를 PR/Issue/Test Case에 사용하면 요구사항→코드→테스트의 추적성이 생긴다.
# 57. 즉시 생성할 실제 산출물
| 산출물 | 파일 |
|---|---|
| DB Migration | server/src/main/resources/db/migration/V1~V7.sql |
| API Contract | docs/api/openapi.yaml |
| ADR | docs/adr/ADR-001~008.md |
| Mobile DB | apps/mobile/src/shared/db/schema.ts 또는 migration |
| Run Engine | apps/mobile/src/features/run/* |
| GPS PoC Report | docs/test/gps-poc.md |
| Course Verification Fixture | server/src/test/resources/course-verification/* |
| Performance Baseline | docs/performance/baseline.md |

다음 구현 작업은 이 목록의 파일을 실제 코드/설정 파일로 생성하는 단계다. 문서에만 존재하는 설계가 아니라 저장소에서 실행 가능한 migration, API contract, 테스트 fixture로 내려간다.
# 58. 모바일 UI/UX 레퍼런스 연구 및 Claude Code 구현 플레이북 v1.3
목적: 모바일 앱 UI를 개별 레퍼런스 화면의 모방으로 만들지 않고, 실제 러닝·피트니스·코스 탐색·경쟁·소셜 앱의 검증된 UX 패턴을 기능 단위로 분석한 뒤 본 서비스의 제품 구조와 기술 제약에 맞는 하나의 일관된 디자인 시스템으로 재구성한다.
본 장의 레퍼런스는 '참고 대상'이며 시각 요소를 그대로 복제하기 위한 목록이 아니다. 각 패턴은 사용자 문제, 정보 우선순위, 조작 상황, 러닝 중 안전성, React Native/Expo 구현 비용을 기준으로 채택 여부를 결정한다.
## 58.1 연구 범위와 방법
| 축 | 조사 대상 | 분석 기준 |
|---|---|---|
| 국내 러닝 | 런데이, Runnect, RUNPLE, GhostRunner, 랭킹마라톤, RunPlash, Runky, 먼데이런클럽, 러닝라이프, 런투유, TrackUs, Runnertic, 루티니스트, 달림 | 한국 사용자 언어, 지도/코스, 경쟁, 크루/친구, 기록/공유 |
| 글로벌 러닝 | Strava, Nike Run Club, Runna, ASICS Runkeeper, adidas Running, MapMyRun | 러닝 시작, 기록, PB, 코칭, 목표, 소셜 |
| 코스/탐색 | RunGo, AllTrails, Komoot, Garmin Connect, COROS | 지도 중심 탐색, 필터, 상세 정보, 경로 저장/내비게이션 |
| 몰입/경쟁 | Zwift, GhostRunner, RunPlash, RUNPLE, 랭킹마라톤 | 랭킹, 게임성, 실시간 상태, 경쟁 피드백 |
| 공유/회고 | Relive, Strava, Runna, 국내 기록 앱 | 결과 시각화, 공유 카드, 재도전 동선 |
| 구현 도구 | Anthropic Frontend Design, Expo Skills, Draftbit mobile-taste, ui-skills 등 | Claude Code에서 재현 가능한 디자인 프로세스/검증 |

## 58.2 레퍼런스 사용 규칙
- 한 앱을 전체 디자인 기준으로 삼지 않는다. 기능별로 가장 잘 푼 사례를 분해한다.
- 화면 모양보다 정보 우선순위와 인터랙션 이유를 기록한다.
- 러닝 중 화면은 정지 상태의 일반 앱 UX와 별도 원칙을 적용한다.
- 국내 앱은 한국 사용자에게 익숙한 정보 표현과 경쟁/소셜 문법을 확인하는 용도로 우선 활용한다.
- Strava/NRC 같은 대형 앱은 그대로 복제하지 않고 본 서비스의 '코스 중심' 제품 구조에 맞춰 재배치한다.
- 실제 앱 구현 전 각 레퍼런스의 최신 화면은 App Store/Play Store/공식 사이트에서 Claude Code 작업자가 다시 확인한다.
# 59. 국내 러닝 앱 레퍼런스 분석
| 앱 | 관찰 기능 | 가져올 패턴 | 배제/변형 |
|---|---|---|---|
| 런데이 | 풀보이스 코칭, 초보/훈련 플랜, 자유 달리기, 챌린지 | 러닝 전 '오늘 무엇을 해야 하는지'를 명확히 제시하는 훈련 CTA, 러닝 중 음성 비중 | 본 서비스는 훈련 앱이 아니므로 코칭 홈 구조는 배제. 음성 피드백의 간결한 전달 방식만 참고. |
| Runnect | 코스 직접 그리기, 코스 발견/검색/스크랩, 공유, 트래킹 | 코스가 독립 콘텐츠로 존재하고 발견→저장→실행으로 이어지는 구조 | 우리의 Explore/Course Detail 핵심 참고. 단, 코스 상세는 랭킹·환경 정보·PB까지 강화. |
| RUNPLE | 랭킹존, 주간 리그, 크루런, 매거진 | 물리적 장소를 경쟁 공간으로 바꾸는 '랭킹존', 주간 리그의 리셋 리듬 | 코스별 Weekly Ranking/친구 랭킹에 참고. 매거진/콘텐츠 탭은 초기 제외. |
| GhostRunner | 과거의 나/다른 기록과 실시간 경쟁, 코스 러닝, 시청각 피드백 | 목표 기록과 현재 차이를 러닝 중 즉시 보여주는 경쟁 UX | PB Attack/Rival 모드의 직접 참고. Ghost 자체를 서비스 정체성으로 삼지는 않음. |
| 랭킹마라톤 | 비대면 대회, 전세계 순위, 경쟁 중심 | 장소가 달라도 같은 목표에 참여한다는 대회 문법 | Together Time/Distance Race, 시즌 이벤트에 참고. 공식 코스 랭킹과 원격 랭킹은 분리. |
| RunPlash | GPS 러닝으로 실제 구역 점령, 크루 방어전 | 운동 결과가 지도에 지속적인 세계 상태로 남는 게임화 | 영토 게임은 제품 범위에서 제외. '달린 결과가 다음 행동을 만든다'는 피드백 루프 참고. |
| Runky | 실시간 러닝 공유, 다른 러너 진행 상태, 랜덤 매칭 | 원격 러닝에서 상대의 거리/페이스를 실시간 상태로 소비 | Together 화면의 live progress 구조 참고. 랜덤 매칭은 초기 제외. |
| 먼데이런클럽 | 주변 러너 매칭, 번개런, 외부 러닝 기록 연동 | 혼자 뛰기 싫은 문제를 일정/지역 기반 매칭으로 해결 | 오프라인 만남/매칭은 초기 범위 밖. 향후 공개 Together/크루의 참고. |
| 러닝라이프 | 대회 탐색, 기록, 훈련, 러닝화, 크루 | 러너의 여러 요구를 한 앱에서 제공 | 기능 과밀의 반례로도 사용. 본 서비스는 Course/Competition/Together에 집중. |
| 런투유 | 러닝 기록 + 픽셀 캐릭터/마일리지 + 소셜 | 성취를 캐릭터 보상으로 변환 | 초기에는 캐릭터/재화 제외. 결과 화면에서 성취감 연출 정도만 참고. |
| TrackUs | 지도 기반 코스 지정 + 러닝 모집 | 코스와 사람 모집을 같은 객체로 연결 | 향후 코스 기반 공개 러닝/Meetup 설계에 참고. |
| Runnertic | 코스 탐색/생성, 리더보드, 고스트, 관광/편의시설 | 코스 상세에 편의시설/관광정보를 결합 | 우리 Travel Run 정보 구조와 유사. 편의시설·환경 레이어 참고. |
| 루티니스트 | 지역/또래 랭킹, 친구 응원, 스트릭, 공유 카드 | 가까운 비교집단, '총 N명 중 M등' 같은 즉시 이해 가능한 경쟁 | Near-my-rank, 지역 맥락, 결과 공유에 참고. 성별/연령 경쟁은 개인정보 정책 검토 전 도입하지 않음. |
| 달림(러너의 실험실) | AI 폼 분석, 리더보드, 훈련 도구 | 전문 데이터/훈련 기능을 도구 묶음으로 제공 | 본 앱 핵심과 무관한 분석 기능은 배제. 고급 도구가 메인 러닝 UX를 침범하지 않는 정보구조 참고. |

## 59.1 국내 앱에서 확인되는 공통 패턴
- 코스 공유만으로는 차별화가 어렵다: Runnect, Runnertic, GhostRunner 등에서 이미 코스 발견/공유가 존재한다.
- 랭킹 역시 독립 기능으로는 희소하지 않다: RUNPLE, 랭킹마라톤, 루티니스트 등이 경쟁을 제공한다.
- 실시간/함께 달리기도 Runky, 먼데이런클럽 등 다양한 형태가 존재한다.
- 따라서 본 서비스 UI는 각 기능을 병렬 메뉴로 늘어놓는 방식이 아니라 '코스 발견 → 해당 코스에서 플레이 모드 선택 → 결과/랭킹 → 공유/재도전'이라는 하나의 루프로 보여줘야 한다.
# 60. 글로벌 러닝 앱 레퍼런스 분석
| 앱 | 핵심 UX | 참고할 점 | 본 서비스 적용 |
|---|---|---|---|
| Strava | Maps/Segments, 활동 기록, 소셜, 챌린지 | 지도 탐색 + bottom sheet, 세그먼트 상세/기록 비교, 활동 결과의 소셜 전환 | 코스/랭킹 정보 구조와 기록 비교에 강하게 참고. 피드 중심 IA는 채택하지 않음. |
| Nike Run Club | 즉시 러닝 시작, Guided Runs, 명확한 러닝 메트릭 | 러닝 시작 CTA가 강하고 활동 중 정보가 단순함 | Active Run 화면의 시인성/행동 최소화. 콘텐츠 중심 홈은 제외. |
| Runna | 개인 계획, 주차별 진행, 운동 카드 | '이번에 해야 할 행동'을 카드 하나로 명확히 만드는 구조 | 코스 상세에서 '이 코스 달리기/도전하기' CTA 우선순위에 참고. |
| ASICS Runkeeper | Start 중심 지도, 목표/트레이닝, 기록 | 지도 위에서 바로 시작 가능한 단순한 Start 경험 | Quick Run / 준비 화면 참고. |
| adidas Running | 활동 기록, 목표, 챌린지, 커뮤니티 | 기록→목표→챌린지 연결 | 챌린지는 본 서비스에서는 코스/친구 기록에 한정해 더 구체화. |
| MapMyRun | 러닝 추적, 분석, 접근성 지원 | 기본 tracking UX와 접근성 | Dynamic Type/대비/VoiceOver 검증 체크리스트에 반영. |
| Garmin Connect | 활동 상세 분석, 코스 생성, 친구 순위 | 고밀도 데이터의 계층적 노출 | 결과 상세/통계 화면에서 progressive disclosure 참고. |
| COROS | Explore 지도/route, 활동 상세, 기기 연동 | 지도와 코스 관리가 별도 목적을 갖는 구조 | Explore/내 코스 보관함에 참고. |

# 61. 코스/지도 UX 전문 레퍼런스
| 서비스 | 강점 | UX 원리 | 적용 |
|---|---|---|---|
| RunGo | 러닝 경로 선택 + 음성 turn-by-turn | 코스 상세에서 Start Route가 명확하고 러닝용 음성 내비게이션이 핵심 | 초기에는 완전 내비게이션보다 코스 이탈 안내부터 시작 |
| AllTrails | 500k+ trail 검색, 조건/리뷰/난이도/날씨/상태/오프라인 지도 | 사용자가 출발 전에 '이 길이 나에게 맞는지' 판단할 정보가 풍부 | 우리 코스 상세의 조명/신호/노면/혼잡/화장실/물 정보에 직접 참고 |
| Komoot | sport-specific planner, 표면/난이도/거리/고도, 하이라이트 | 지도와 elevation profile을 하나의 계획 도구로 결합 | 코스 상세/경로 미리보기에서 고도와 중요 포인트 표시 |
| Garmin Connect | 코스 생성/저장/기기 전송 | 코스를 실행 가능한 객체로 관리 | Saved Course / Watch 연동 확장 시 참고 |
| COROS | Explore 지도, route/saved location 관리 | 탐색과 장치 실행 간 연결 | Watch/route sync 확장 시 참고 |

## 61.1 우리 코스 상세 화면의 정보 계층
- 1차: 지도 형태, 거리, 예상 시간, 핵심 난이도, 시작 지점, RUN CTA
- 2차: 내 PB, 친구 최고 기록, 이번 주 순위, 최근 완주자
- 3차: 고도 프로필, 경사, 신호, 야간 조도, 노면, 혼잡, 화장실/급수
- 4차: 리뷰, 추천 시간대, 코스 설명, 생성자, 신고/공유
AllTrails처럼 모든 정보를 한 화면 첫 뷰에 밀어 넣지 않는다. 러너가 실제 출발 결정을 내리는 데 필요한 정보와 경쟁 동기를 먼저 보여주고, 환경 정보는 스크롤 하단에서 판단 보조 역할을 한다.
# 62. 경쟁 및 실시간 UX 레퍼런스
| 레퍼런스 | 핵심 패턴 | 우리 서비스 적용 |
|---|---|---|
| Strava Segments | 한 구간에 대해 개인/다른 사용자 기록 비교 | 공식 Course Ranking의 비교 문법 |
| GhostRunner | 과거 기록과 실시간 gap | PB ATTACK / RIVAL의 핵심 |
| RUNPLE | 랭킹존/리그 | 코스가 경쟁 장소가 되는 표현 |
| 랭킹마라톤 | 원격 대회/순위 | 동일 물리 코스가 아닌 경쟁의 별도 카테고리 |
| Zwift | 공간이 달라도 실시간 그룹/레이스 상태 | Together의 몰입·순위 변화·finish feedback |
| Runky | 상대 distance/pace 실시간 공유 | 실제 GPS 위치를 공유하지 않고 progress를 공유하는 Together UX |

## 62.1 Active Run 모드별 화면 차이
| 모드 | 필수 1차 정보 | 2차 정보 | 금지/축소 |
|---|---|---|---|
| FREE | 시간, 거리, 현재/평균 페이스 | 경로, split | 소셜/랭킹 정보 |
| COURSE | 진행률, 거리, 경로 이탈 여부, 페이스 | 남은 거리, 고도 | 불필요한 경쟁 카드 |
| PB ATTACK | 현재 기록, 목표 PB, 시간/거리 gap | 진행률, 예상 finish | 상대 프로필 등 소셜 노이즈 |
| CHALLENGE | 목표 기록, 현재 gap, 진행률 | 상대 이름/기록, 순위 | 댓글/피드 |
| LIVE RACE | 순위, 진행률, 선두 gap, 내 페이스 | 참가자 상태 | 상대 정밀 위치 |
| TIME ATTACK | 남은 시간, 거리, 순위 | 페이스, 참가자 진행 | 코스 랭킹 |
| TOGETHER | 함께 달린 시간/거리, 친구 진행 | 연결 상태, 응원 | 승패 강조 |

## 62.2 러닝 중 조작 원칙
- 달리는 중에는 읽기보다 glanceability가 우선이다.
- 핵심 수치는 큰 숫자와 짧은 label로 구성하며 한 화면에 경쟁하는 핵심 metric 수를 제한한다.
- Pause/Finish 같은 파괴적 동작은 오작동을 줄이는 제스처/확인 구조를 검토한다.
- 지도는 상세 탐색용이 아니라 경로 확인/이탈 판단용으로 단순화한다.
- 상대 변화는 시각 효과보다 음성/TTS/햅틱으로 보조하고 화면 주의를 최소화한다.
- 운동 중 애니메이션은 배터리·프레임·가독성을 해치지 않는 범위로 제한한다.
# 63. 결과/공유 UX 레퍼런스
| 레퍼런스 | 패턴 | 적용 |
|---|---|---|
| Strava | 활동 지도 + 핵심 기록 + 소셜 반응 | 결과를 '기록 객체'로 정리 |
| Relive | GPS 여정을 시각적 스토리로 재구성 | 공유가 단순 캡처가 아니라 콘텐츠가 됨 |
| Runna | 훈련 성취/계획 진행과 결과 연결 | 완료의 의미를 다음 계획과 연결 |
| 루티니스트 | 스토리 공유 카드, 랭킹 변화 | 한국 SNS 공유 문맥 |
| Iron Ladder(비러닝) | workout receipt/sticker형 공유 | 운동 결과를 SNS 위에 얹는 share asset 발상 |

우리 서비스의 결과 화면은 '기록 확인'으로 끝나면 안 된다. `완주 → 검증 → PB/랭킹 변화 → 공유 → challenge/rematch`가 한 화면에서 자연스럽게 이어져야 한다.
## 63.1 결과 화면 우선순위
- Finish 감정 피드백: 완주/PB/Challenge 성공 여부
- 핵심 수치: 시간·거리·평균 페이스
- 코스 지도/경로
- 공식 검증 상태
- PB 변화 / 랭킹 변화 / 친구와 gap
- Share / Rematch / Challenge CTA
- splits·고도·세부 분석
# 64. 최종 제품 UX 컨셉
레퍼런스 통합 결과, 본 서비스는 '피드형 러닝 SNS', '훈련 코치', '지도 코스 앱', '랭킹 앱' 중 하나로 보이면 안 된다. UI의 중심은 코스를 발견하고 그 코스를 플레이하는 경험이어야 한다.
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
## 64.1 UX 성격
| 속성 | 정의 | 피해야 할 형태 |
|---|---|---|
| Sport-first | 운동 데이터가 장식보다 먼저 읽힘 | SNS 카드가 메인인 피드 앱 |
| Map-aware | 코스 탐색 시 지도가 중요한 작업 공간 | 지도 위에 과도한 카드/버튼 중첩 |
| Competition-aware | 경쟁 상태는 숫자/gap/progress로 즉시 이해 | 게임 HUD처럼 과도한 이펙트 |
| Korean-local | 짧고 직접적인 한국어, 지역/거리 문맥 | 영문 러닝 용어 남발 |
| Outdoor-readable | 밝은 야외/이동 중에도 읽힘 | 저대비 회색/작은 폰트 |
| Calm when idle, focused when running | 탐색은 정보 중심, 러닝 중은 단순/강한 계층 | 모든 화면에 동일한 카드 밀도 |

# 65. 정보 구조 최종안
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
Activity는 독립 탭이 아니라 알림/프로필/관련 도메인에서 진입한다. 내부 피드를 중심 IA로 만들지 않는다.
# 66. 화면별 레퍼런스 매핑
| 화면 | 주요 레퍼런스 | 가져올 패턴 | 구현 방향 |
|---|---|---|---|
| Explore Home | Strava Maps + AllTrails discovery + Runnect course discovery | 지도/리스트 혼합, 지역 검색, 빠른 필터 | 코스 추천은 카드보다 지도 문맥과 결합 |
| Course Detail | AllTrails + Komoot + Strava Segment + RunGo | 경로/고도/환경 + 경쟁 정보 + Start | 한 화면에 '정보'와 '행동'을 명확히 구분 |
| Play Mode Sheet | 게임 모드 selector + Runna의 single-primary-action | 모드 3~5개, 설명 1줄, 최근 사용 강조 | 설정 페이지처럼 보이지 않게 |
| Run Ready | Runkeeper/NRC | GPS 준비 상태 + 목표 요약 + 큰 Start | 권한/정확도 문제를 시작 전 해결 |
| Active Run | NRC + GhostRunner + Zwift | 큰 metric, mode별 gap/progress | 공통 shell + 모드별 패널 |
| Pause | NRC/운동 앱 일반 | resume/finish 명확 | 실수 finish 방지 |
| Result | Strava + Relive + Runna | 성취→기록→지도→랭킹→share | 세부 통계는 아래 |
| Ranking | Strava Segment + RUNPLE + 루티니스트 | 내 주변 순위, 친구, 주간 | 1등 중심보다 '내 위치'가 먼저 |
| Together Lobby | 그룹 운동/게임 lobby | 참가자 상태/Ready/시작 조건 | 채팅은 초기 제외 |
| Together Live | Zwift + Runky | virtual progress + rank/gap | 정밀 위치 공유 금지 |
| Share Composer | Relive + Strava + social workout receipt | Map/Record/Ranking/Battle 템플릿 | 앱 UI 캡처가 아닌 공유 전용 asset |

# 67. 디자인 시스템 초안
색상/타이포그래피 값 자체는 비주얼 탐색 후 확정한다. 여기서는 컴포넌트와 semantic token 구조를 고정한다.
Color tokens
- bg.canvas
- bg.surface
- bg.elevated
- text.primary
- text.secondary
- text.inverse
- action.primary
- action.secondary
- status.success
- status.warning
- status.danger
- gps.good / gps.fair / gps.poor
- ranking.up / ranking.down
- map.route / map.actual / map.target

Typography
- display.metric
- title.screen
- title.section
- body.primary
- body.secondary
- label.metric
- label.control
- caption

Spacing
- 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40
## 67.1 핵심 컴포넌트
| 컴포넌트 | 사용처 | 상태 |
|---|---|---|
| MetricBlock | Active Run/Result | default, highlighted, warning |
| CourseCard | Explore/Saved | default, compact, ranking-context |
| CourseMapPreview | Course/Result | loading, route, actual, deviation |
| PrimaryRunButton | Course/Ready | disabled GPS, ready, loading |
| PlayModeCard | mode picker | selected/default/locked |
| RankingRow | ranking | self, friend, podium, nearby |
| GapIndicator | PB/Challenge/Live | ahead, behind, tied |
| GpsStatus | Ready/Run | good, fair, poor, unavailable |
| ParticipantChip | Together | invited, ready, running, disconnected, finished |
| VerificationBadge | Result/History | pending, verified, unverified, rejected |
| ShareTemplateCard | Share | map, record, ranking, battle |

# 68. 모바일 접근성/야외 사용성
- 핵심 러닝 화면은 작은 보조 텍스트가 없어도 주요 상태를 이해할 수 있어야 한다.
- 색만으로 ahead/behind, GPS good/poor, verified/unverified를 표현하지 않는다.
- Dynamic Type/글자 확대 시 레이아웃이 무너지지 않는지 주요 화면을 테스트한다.
- 터치 타깃은 이동 중 조작을 고려해 충분한 크기로 유지한다.
- 햅틱은 상태 변화의 보조 수단으로만 사용하고 끌 수 있어야 한다.
- 지도 위 텍스트/버튼은 지도 색에 따라 대비가 무너지지 않도록 surface를 둔다.
- 고대비 sunlight 조건에서 Active Run 화면을 실기기로 확인한다.
# 69. 모션/햅틱 원칙
| 상황 | 모션 | 햅틱/음성 |
|---|---|---|
| Run Start | 3-2-1 countdown, 숫자 scale/fade | 각 count 약한 햅틱, Start 강한 햅틱 |
| PB gap 개선 | Gap 숫자 변화 강조 | 임계치 통과 시 선택적 TTS |
| Rank change | 행 재정렬은 짧고 안정적 | 순위 변화 시 가벼운 햅틱 |
| Course deviation | route warning 강조 | 경고 햅틱 + 음성 |
| Finish | 결과 reveal | 완주 햅틱 |
| Share | 과한 애니메이션 없음 | 없음 |

모션은 화면의 의미를 설명하거나 상태 변화를 인지시키는 경우에만 사용한다. 단순 장식 애니메이션을 전역으로 반복하지 않는다.
# 70. Claude Code 스킬 조사
우선순위는 공식/원저자 유지보수 스킬 > 목적이 명확한 오픈소스 스킬 > 검증되지 않은 종합 스킬 순으로 둔다. 제3자 SKILL.md는 에이전트 실행 지침이므로 설치 전 내용을 검토한다.
| 스킬 | 출처 | 용도 | 평가 | 설치/사용 |
|---|---|---|---|---|
| Expo official skills | 공식 Expo | Expo/RN 구조, Router, native UI, animation, design system, data fetching, dev client, build | 필수 | claude plugin install expo@claude-plugins-official |
| frontend-design | Anthropic Claude Code 공식 저장소 | generic AI UI를 피하고 production-grade frontend aesthetic 생성 | 권장 | Claude Code plugin/skill 환경에서 사용 |
| mobile-taste-skill | Draftbit | React Native/Expo에서 흔한 AI-generated mobile UI 패턴 억제, navigation/motion taste | 권장 후보 | 설치 전 SKILL.md 검토 |
| ui-skills | dawitlabs | design brief, UI redesign, color, animation, copy, accessibility, tokens | 선택 | workflow별 skill 사용 |
| claude-code-ui-ux-skill | 오픈소스 | 다양한 style/palette/font/UX rule 데이터베이스 | 탐색 보조 | 결정 엔진이 아니라 아이디어 검색용 |
| mobile-app-ui-design | 오픈소스 | 모바일 UI 설계 프로세스/디자인 시스템 | 보조 | React Native 적용 내용 검토 |
| mobile-app-design | awesome-skills | iOS/Android/accessibility/RN 기준 | 보조 | 플랫폼 검수 체크용 |

## 70.1 Expo 공식 스킬 중 본 프로젝트 사용 대상
| Skill | 사용 시점 |
|---|---|
| expo-overview | Expo 작업의 entry point |
| expo-project-structure | app/routes와 src 구조 정리 |
| expo-router | tabs, stack, modal/sheet navigation |
| expo-animation | Reanimated/Gesture/Haptics 기반 interaction |
| expo-native-ui | native-feeling controls/semantic UI |
| expo-design-system | token/theme/component 규칙과 drift audit |
| expo-ui | 필요 시 native component bridge |
| expo-data-fetching | TanStack Query, cache/offline |
| expo-dev-client | GPS/Native module 개발 빌드 |
| eas-app-stores | 출시 단계 |
| eas-workflows | CI/CD 단계 |
| eas-observe | 출시 후 observability |
| eas-update | OTA 정책이 필요할 때 |

## 70.2 설치 순서
# 1. Expo official plugin
claude plugin install expo@claude-plugins-official

# 2. Anthropic frontend-design 사용 가능 여부 확인
# Claude Code의 official plugin/skill 환경에서 활성화

# 3. 제3자 skill은 저장소 내용을 읽은 뒤 프로젝트 .claude/skills 또는 plugin 방식으로 선택 설치
# 무조건 여러 종합 UI skill을 동시에 켜지 않는다.
UI 취향을 결정하는 스킬을 여러 개 동시에 활성화하면 서로 다른 디자인 규칙이 충돌할 수 있다. 본 프로젝트는 Expo official skills를 기술 기준으로 두고, 시각 품질 보조는 1개, accessibility/token audit는 목적별로 추가하는 방식을 권장한다.
# 71. Claude Code 작업 프로토콜
Claude Code에게 '이 화면 예쁘게 만들어'라고 맡기지 않는다. 레퍼런스 연구 결과와 서비스 원칙을 저장소 문서로 제공하고, 화면별 acceptance criteria와 visual verification을 강제한다.
docs/ui/
├─ PRODUCT-UX.md
├─ REFERENCE-MATRIX.md
├─ DESIGN-SYSTEM.md
├─ SCREEN-SPECS.md
├─ INTERACTION-SPECS.md
├─ ACCESSIBILITY.md
└─ VISUAL-QA.md

CLAUDE.md
- 위 문서를 UI 작업 전 반드시 읽기
- 러닝 중 화면은 Active Run 규칙 우선
- 새로운 색/spacing/radius 임의 추가 금지
- 화면 완성 후 simulator screenshot으로 검증
## 71.1 Claude Code에게 줄 기본 UI 작업 프롬프트
이 프로젝트의 UI를 독립적으로 재해석하지 마라.

작업 전 반드시 다음 파일을 읽는다:
- docs/ui/PRODUCT-UX.md
- docs/ui/REFERENCE-MATRIX.md
- docs/ui/DESIGN-SYSTEM.md
- docs/ui/SCREEN-SPECS.md
- docs/ui/INTERACTION-SPECS.md
- docs/ui/ACCESSIBILITY.md

우선순위:
1. 기능 요구사항과 정보 계층
2. 러닝 중 야외 가독성/조작 안전성
3. 디자인 시스템 일관성
4. 레퍼런스에서 검증된 UX 패턴
5. 시각적 개성

레퍼런스 앱의 화면을 그대로 복제하지 않는다.
각 화면의 역할과 패턴만 참고하고 본 서비스 구조로 재조합한다.

새로운 UI pattern/token/component를 임의로 만들기 전에
기존 design system에서 해결 가능한지 확인한다.

작업 완료 후:
- iOS/Android 대표 viewport에서 screenshot
- empty/loading/error/permission denied 상태 확인
- text overflow
- safe area
- keyboard
- touch target
- contrast
- dynamic text
- map overlay
를 검증하고 발견한 문제를 수정한다.
## 71.2 화면 구현 단위 프로세스
- 화면 목적/사용자 질문 1개 정의
- Reference Matrix에서 관련 앱 패턴 확인
- 필수 정보/보조 정보/CTA 계층 결정
- low-fidelity 구조 작성
- 기존 token/component로 구현
- 실제 데이터 길이/빈 상태/오류 상태 적용
- Simulator/실기기 screenshot 검수
- Active Run 계열은 야외/한손 사용 실기기 확인
- 문제 수정 후 screen spec과 코드 상태 일치 확인
# 72. Claude Code용 화면 작업 순서
| 순서 | 화면 | 이유 |
|---|---|---|
| 1 | Design System Playground | token/component 기준 먼저 확정 |
| 2 | Explore Home | 제품의 코스 중심 정체성 결정 |
| 3 | Course Detail | 정보 계층 + 핵심 CTA 결정 |
| 4 | Play Mode Selector | 제품 차별점인 '코스를 플레이'하는 문법 확정 |
| 5 | Run Ready | GPS/권한/목표 상태 |
| 6 | Active Run FREE | 공통 Run Shell |
| 7 | Active Run COURSE/PB/CHALLENGE | 모드 패널 확장 |
| 8 | Run Result | 경쟁/공유 루프 완성 |
| 9 | Ranking | 코스 경쟁 UX |
| 10 | Together Lobby + Live | 실시간 UI |
| 11 | My/History | 기록 회고 |
| 12 | Onboarding/Auth/Settings | 핵심 경험 확정 후 마감 |

# 73. 화면 Acceptance Criteria
| 화면 | 완료 기준 |
|---|---|
| Explore | 현재 지역을 바꾸고, 코스를 지도/리스트에서 찾고, 2~3 tap 이내 Course Detail 진입 가능 |
| Course Detail | 첫 viewport에서 코스 형태·거리·난이도·내 기록/핵심 경쟁 정보·RUN CTA를 이해 |
| Play Mode | 각 모드 차이를 읽지 않아도 아이콘/제목/짧은 설명으로 구분 |
| Run Ready | GPS 상태/목표/코스 준비 여부를 명확히 표시, 준비되지 않으면 이유를 설명 |
| Active Run | 주요 metric을 이동 중 1초 glance로 인지, 필수 조작 이외의 UI 최소화 |
| Result | 완주 상태/PB/랭킹/검증 상태를 혼동 없이 확인하고 Share/Rematch가 자연스럽게 이어짐 |
| Ranking | 1등뿐 아니라 내 순위/주변 사용자/친구를 빠르게 찾음 |
| Together Live | 상대의 실제 위치 없이도 누가 앞서고 있는지, 연결이 끊겼는지 이해 |
| History | 기록을 시간 순으로 찾고 Run Detail로 이동 |
| Error/Offline | 서버/네트워크 문제와 기록 유실을 혼동시키지 않음 |

# 74. UI 상태 매트릭스
| 화면 | 필수 상태 |
|---|---|
| Explore | loading, location denied, no nearby course, network error, map ready, list ready |
| Course Detail | loading, private/hidden, no record, has PB, verification info unavailable |
| Run Ready | permission denied, GPS acquiring, GPS poor, ready, course start too far |
| Active Run | running, paused, GPS poor, route deviation, offline, recovering, finish pending |
| Result | local-only, syncing, verification pending, verified, unverified, PB, no PB |
| Ranking | loading, empty, user unranked, self visible, cursor loading |
| Together | invite, waiting, ready, disconnected, reconnecting, DNF, finished |

# 75. 시각 방향 탐색 가이드
브랜드 비주얼은 아직 조사 결과만으로 확정하지 않는다. Claude Code가 여러 시안을 만들되, 아래 축을 고정한 상태에서 비교한다.
| 고정 | 탐색 가능 |
|---|---|
| 큰 러닝 metric, 야외 대비 | 브랜드 포인트 색 |
| 코스/실제 경로/목표 경로 색 역할 분리 | light 중심 vs optional dark run mode |
| 카드 남발 금지 | radius 정도 |
| 지도 중심 화면에서 overlay 절제 | 타이포그래피 개성 |
| Active Run은 장식 최소화 | 결과/공유 화면의 감정적 연출 |
| bottom nav 4개 | 아이콘 스타일 |

일반적인 AI 모바일 UI에서 자주 나타나는 '큰 인사말 + 둥근 흰 카드 묶음 + 그라디언트 + floating button' 문법은 의도적으로 피한다. 코스 지도와 러닝 데이터가 시각 언어의 중심이 되어야 한다.
# 76. 비주얼 QA 체크리스트
- iPhone 소형/일반/대형 viewport에서 핵심 CTA가 safe area와 충돌하지 않는가
- Android gesture/navigation inset에서도 bottom controls가 안전한가
- 한글 긴 코스명/닉네임/지역명이 잘리는가
- 지도 이동/zoom 시 floating UI가 map gesture를 방해하는가
- 밝은 지도와 어두운 지도 모두 overlay 대비가 확보되는가
- GPS/네트워크 상태가 색상만으로 전달되지 않는가
- Active Run에서 화면을 보지 않고도 음성/햅틱으로 핵심 이벤트를 이해할 수 있는가
- 러닝 중 화면 업데이트가 불필요한 전체 re-render를 만들지 않는가
- progress/ranking animation이 60fps 체감을 크게 해치지 않는가
- Dynamic Type에서 metric과 controls가 겹치지 않는가
- screen reader label이 아이콘만 있는 control에 존재하는가
- loading skeleton이 실제 content geometry와 크게 다르지 않은가
# 77. UI 성능 설계
| 영역 | 위험 | 설계/측정 |
|---|---|---|
| Map | 많은 marker/polyline | viewport 기반 렌더, simplify/downsample, 실제 디바이스 FPS 측정 |
| Active Run | 초 단위 상태 업데이트 | metric state 분리, 필요한 컴포넌트만 갱신 |
| Live Together | 여러 참가자 업데이트 | latest snapshot normalization, list virtualization 필요 여부 측정 |
| Ranking | 긴 목록 | cursor pagination + virtualized list |
| Result Map | 수천 GPS point polyline | display용 simplified route 사용, 원본과 분리 |
| Animations | Reanimated/JS thread 경쟁 | UI thread animation 우선, profiler 확인 |
| Images | course/user media | 적정 resize/cache, 지도 스크롤 중 과도한 decode 방지 |

성능 목표 숫자는 실제 기기와 화면별 baseline 이후 확정한다. UI 설계 단계부터 '지도 + 실시간 metric + animation'이 동시에 실행되는 Active Run/Together를 가장 높은 위험 화면으로 본다.
# 78. UI/UX 레퍼런스 최종 채택 맵
| 영역 | Reference Blend | 최종 의미 |
|---|---|---|
| Explore | Strava + AllTrails + Runnect | 지도 기반 발견 + 러닝 코스 콘텐츠 |
| Course Detail | AllTrails + Komoot + Strava Segment | 환경 정보 + 고도 + 경쟁 정보 |
| Start/Ready | NRC + Runkeeper | 큰 primary action + 최소 준비 정보 |
| PB/Rival | GhostRunner + Strava | 목표 기록 대비 gap |
| Ranking | Strava + RUNPLE + 루티니스트 | 공식 기록 + 주간 + 친구 + 내 주변 |
| Together | Zwift + Runky | virtual progress / rank / reconnect |
| Voice | 런데이 + NRC | 짧고 행동 가능한 음성 안내 |
| Result | Strava + Runna | 기록/성취/다음 행동 |
| Share | Relive + workout receipt patterns | 앱 화면 캡처가 아닌 공유 전용 카드 |

# 79. 절대 복제하지 않을 패턴
- Strava처럼 Feed를 앱 중심으로 두는 구조
- Runna처럼 Training Plan이 Home의 중심이 되는 구조
- AllTrails처럼 코스 상세에서 트레일 정보가 러닝 경쟁보다 앞서는 구조
- Zwift의 3D 게임 세계 자체
- RunPlash의 영토 점령 메타게임
- 런투유의 캐릭터 경제
- 국내 올인원 러닝 앱처럼 대회/쇼핑/매거진/커뮤니티/트레이닝을 모두 메인 메뉴에 넣는 구조
- AI가 흔히 생성하는 동일 radius의 카드 스택 UI
# 80. 레퍼런스 출처
| Source | URL |
|---|---|
| Runnect App Store | https://apps.apple.com/kr/app/runnect/id1663884202 |
| 런데이 App Store | https://apps.apple.com/kr/app/id1042937618 |
| RUNPLE App Store | https://apps.apple.com/kr/app/runple/id6475159516 |
| GhostRunner | https://ghostrun.io/ |
| GhostRunner App Store | https://apps.apple.com/kr/app/ghostrunner/id6747737877 |
| 랭킹마라톤 App Store | https://apps.apple.com/kr/app/id6449415129 |
| RunPlash App Store | https://apps.apple.com/kr/app/id6790391778 |
| Runky App Store | https://apps.apple.com/kr/app/runky/id6753214440 |
| 먼데이런클럽 App Store | https://apps.apple.com/kr/app/id6737470364 |
| 러닝라이프 App Store | https://apps.apple.com/kr/app/id6503121199 |
| 런투유 App Store | https://apps.apple.com/kr/app/id6768350528 |
| TrackUs App Store | https://apps.apple.com/kr/app/id6503694333 |
| Runnertic App Store | https://apps.apple.com/kr/app/runnertic/id6797750002 |
| 루티니스트 App Store | https://apps.apple.com/kr/app/id6762175125 |
| 달림(러너의 실험실) App Store | https://apps.apple.com/kr/app/id6787890576 |
| Nike Run Club KR | https://www.nike.com/kr/nrc-app |
| Strava Segment Help | https://support.strava.com/en-us/articles/15401734-how-do-i-find-segments-on-the-strava-app |
| Runna | https://www.runna.com/ |
| ASICS Runkeeper App Store | https://apps.apple.com/kr/app/id300235330 |
| adidas DALLIMO Store | https://apps.apple.com/kr/app/id336599882 |
| Map My Run App Store | https://apps.apple.com/kr/app/id291890420 |
| RunGo | https://www.rungoapp.com/ |
| AllTrails App Store | https://apps.apple.com/kr/app/id405075943 |
| Komoot App Store | https://apps.apple.com/kr/app/id447374873 |
| Relive App Store | https://apps.apple.com/kr/app/id1201703657 |
| Garmin Connect App Store | https://apps.apple.com/kr/app/id583446403 |
| COROS App Store | https://apps.apple.com/kr/app/id1277625343 |
| Zwift App Store | https://apps.apple.com/kr/app/id1134655040 |
| Expo Skills | https://github.com/expo/skills |
| Anthropic frontend-design | https://github.com/anthropics/claude-code/tree/main/plugins/frontend-design |
| Draftbit mobile-taste-skill | https://github.com/draftbit/mobile-taste-skill |
| dawitlabs ui-skills | https://github.com/dawitlabs/ui-skills |
| Claude Code UI/UX Skill | https://github.com/nicohodt/claude-code-ui-ux-skill |
| Mobile App UI Design Skill | https://github.com/ceorkm/mobile-app-ui-design |
| Mobile App Design Standards Skill | https://github.com/awesome-skills/mobile-app-design |

# 81. UI 작업 시작 전 산출물
| 파일 | 내용 | 상태 |
|---|---|---|
| docs/ui/PRODUCT-UX.md | 제품 UX 원칙/핵심 loop | v1.3 기준 생성 필요 |
| docs/ui/REFERENCE-MATRIX.md | 앱별 기능→패턴→채택/배제 | v1.3 기준 생성 필요 |
| docs/ui/DESIGN-SYSTEM.md | semantic token/component/state | 시각 탐색 후 확정 |
| docs/ui/SCREEN-SPECS.md | 화면별 정보/CTA/state | 기능명세에서 상세화 |
| docs/ui/INTERACTION-SPECS.md | gesture/motion/haptic/audio | Active Run 우선 |
| docs/ui/ACCESSIBILITY.md | 접근성/야외 사용성 | QA 기준으로 생성 |
| docs/ui/VISUAL-QA.md | screenshot matrix/기기/상태 | Claude Code 검수용 |

다음 구현 단계에서는 위 7개 Markdown 파일과 CLAUDE.md의 UI 작업 규칙을 실제 저장소용 파일로 생성한 뒤, Claude Code가 Explore → Course Detail → Play Mode → Run Ready → Active Run → Result 순으로 화면을 구현하도록 한다.
# 82. 모바일 비주얼 디자인 방향 비교 v1.4
본 장은 레퍼런스 조사 결과를 실제 하나의 제품 언어로 수렴하기 위한 시각 설계 단계다. 세 방향을 모두 실제 화면군(Explore, Course Detail, Active Run, Result, Together)에 적용 가능하도록 정의한 뒤, 제품 포지셔닝·야외 가독성·지도 비중·경쟁 표현·React Native 구현 지속성을 기준으로 최종 방향을 선택한다.
## 82.1 레퍼런스에서 추출한 실제 시각 패턴
| Reference | 관찰 패턴 | 해석 |
|---|---|---|
| Nike Run Club | Active Run에서 큰 숫자, 매우 강한 대비, 제한된 보조 정보 | 러닝 중에는 정보량보다 metric 위계가 우선 |
| AllTrails | 코스 상세에서 지도/경로 + 거리/고도/시간을 묶고 이후 세부 정보 제공 | 출발 결정에 필요한 정보부터 progressive disclosure |
| Runnect | 지도와 코스 라인을 강한 브랜드 색으로 단순하게 강조 | 코스 자체가 콘텐츠라는 인지가 명확 |
| Strava Segments | 구간/기록/랭킹을 같은 객체 문맥 안에서 연결 | 코스와 경쟁을 분리된 메뉴로 보이지 않게 해야 함 |
| Komoot | route planning/navigation을 지도·고도·상세 정보의 도구로 구성 | 지도는 배경이 아니라 작업 표면 |
| Zwift | 진행/상대/순위를 즉각 인지시키는 race state | Together에서는 실제 위치보다 상대 진행 상태가 중요 |
| Relive | 운동 결과를 별도 공유 콘텐츠로 재구성 | 공유는 screenshot 기능이 아니라 결과 asset 생성 |

# 83. 시각 방향 A - ROUTE SIGNAL
성격: 도시 러닝을 위한 기술적이지만 차갑지 않은 시각 언어. 평상시 탐색 화면은 밝고 절제되며, 러닝 중에는 어두운 집중 모드로 전환한다. 코스와 진행 상태는 하나의 강한 Signal Accent로 통일한다.
| 항목 | 정의 |
|---|---|
| Base | Off-white / graphite / near-black |
| Brand Accent | Aqua/teal 계열의 고채도 signal color |
| Typography | 한국어 가독성이 높은 sans-serif + tabular numerals |
| Map | 중립 지도 위 route signal이 가장 먼저 보임 |
| Cards | 필요한 경우만 surface separation; 카드 남발 금지 |
| Active Run | dark canvas + 매우 큰 numeric hierarchy |
| Competition | gap/rank는 accent + semantic state를 병행 |
| Mood | urban, precise, alive, fast |

장점: Explore와 Active Run을 같은 브랜드로 묶으면서도 사용 상황에 따라 밀도를 다르게 만들 수 있다. 지도와 숫자 모두에서 브랜드 accent의 역할이 명확하다.
위험: teal 계열이 일반 웰니스 앱처럼 부드럽게 보이지 않도록 typography/spacing/contrast를 날카롭게 유지해야 한다.
# 84. 시각 방향 B - TRACK GRID
성격: 기록과 경쟁에 강하게 초점을 둔 퍼포먼스 도구. 레이싱 시계·트랙보드처럼 고밀도 숫자, 선, grid를 적극 활용한다.
| 항목 | 정의 |
|---|---|
| Base | Dark graphite dominant |
| Accent | High-visibility yellow/green |
| Typography | condensed/technical numeric emphasis |
| Map | secondary; progress/rank HUD 우선 |
| Components | compact rows, grid, separators |
| Active Run | 가장 강함 |
| Mood | competitive, technical, aggressive |

장점: PB Attack, Ranking, Together Race에서 매우 강한 정체성을 만들 수 있다.
위험: Explore/여행/코스 발견이 딱딱해지고, 초보·가벼운 러너에게 '전문 선수용'처럼 보일 수 있다. 제품 전체가 경쟁 도구로 오해될 가능성이 높다.
# 85. 시각 방향 C - OPEN ROUTE
성격: 탐색과 발견을 강조한 밝고 넓은 지도 중심 경험. 여행·새 코스 발견에 가장 친화적이며 부드러운 surface와 풍부한 코스 정보를 사용한다.
| 항목 | 정의 |
|---|---|
| Base | Warm white/light neutral |
| Accent | Cobalt/sky |
| Typography | friendly sans-serif |
| Map | Explore의 압도적 중심 |
| Cards | 정보 단위별 부드러운 surface |
| Active Run | light/dark 선택 가능하나 경쟁 인상은 약함 |
| Mood | open, exploratory, approachable |

장점: '오늘 어디서 뛰지?'와 여행지 코스 탐색 문제를 잘 표현한다.
위험: AllTrails/일반 지도 앱과 인상이 가까워질 수 있고, 본 서비스의 경쟁/Together 차별점이 약해진다.
# 86. 방향 비교
| 평가축 | ROUTE SIGNAL | TRACK GRID | OPEN ROUTE |
|---|---|---|---|
| 코스 탐색 | 상 | 중 | 최상 |
| PB/랭킹 | 상 | 최상 | 중 |
| Together | 최상 | 최상 | 중 |
| 초보 접근성 | 상 | 중하 | 최상 |
| 야외 가독성 | 최상 | 최상 | 상 |
| 지도와 데이터 균형 | 최상 | 중 | 상 |
| 제품 확장성 | 최상 | 중 | 상 |
| 일반 러닝앱과 차별 | 상 | 최상 | 중 |
| 코스 중심 포지셔닝 적합 | 최상 | 상 | 최상 |

# 87. 최종 선택 - ROUTE SIGNAL
최종 제품 방향은 ROUTE SIGNAL로 고정한다. 이유는 본 서비스가 '코스 탐색 앱'과 '경쟁 앱' 중 하나가 아니라 두 경험을 하나의 루프로 연결해야 하기 때문이다. 밝은 Explore와 어두운 Active Run의 이중 컨텍스트를 사용하되 동일한 accent, typography, route language를 공유한다.
ROUTE SIGNAL

EXPLORE
calm / light / map-first
        ↓
COURSE
route + decision + competitive context
        ↓
RUN
focused / dark / metric-first
        ↓
RESULT
achievement + route + verified competition
## 87.1 브랜드 시각 키워드
- Signal: 어디를 달릴지, 얼마나 앞서는지 즉시 알려주는 시각 신호
- Route: 선과 진행률이 브랜드의 핵심 형태
- Motion: 속도감보다 상태 변화에 반응하는 움직임
- Precision: 숫자와 기록을 정확하게 읽히는 typography
- Urban Outdoor: 헬스장/의료/웰니스보다 실제 야외 러닝 인상
# 88. ROUTE SIGNAL 디자인 토큰 후보
아래 값은 실제 프로토타입을 만들기 위한 v0 후보이며 accessibility contrast 및 지도 SDK 위에서 검증 후 고정한다. semantic 역할이 먼저이며 raw 값은 변경 가능하다.
// Visual exploration candidate — not production locked

colors = {
  canvasLight: "#F7F8F6",
  surfaceLight: "#FFFFFF",
  canvasDark: "#101312",
  surfaceDark: "#181C1B",

  textPrimaryLight: "#111514",
  textSecondaryLight: "#68716E",
  textPrimaryDark: "#F5F8F7",
  textSecondaryDark: "#A8B1AE",

  signal: "#00BFA6",
  signalPressed: "#009F8B",

  success: "#1B9A59",
  warning: "#D99500",
  danger: "#D84A4A",

  routeCourse: "#00BFA6",
  routeActual: "#FFFFFF",
  routeTarget: "#86E7D8"
}
경쟁 상태의 ahead/behind를 브랜드 색 하나로 표현하지 않는다. 텍스트, 방향 icon, 숫자 sign과 semantic color를 함께 사용한다.
## 88.1 Typography
| 역할 | 권장 |
|---|---|
| Korean/UI | Pretendard 또는 동급 한국어 UI sans-serif 검토 |
| Metric | 동일 family의 bold/extra-bold + tabular-nums |
| Screen Title | semibold/bold |
| Body | regular/medium |
| Rule | 숫자를 위해 별도 장식 font를 추가하지 않음 |

폰트 선택은 실제 라이선스와 Expo 번들 크기/렌더링을 확인한 뒤 확정한다. metric alignment는 가능한 경우 tabular numerals를 사용한다.
## 88.2 Shape & Surface
- CourseCard는 경계/간격으로 구분하고 모든 리스트 항목을 떠 있는 카드처럼 만들지 않는다.
- Bottom sheet와 map overlay만 elevation을 분명히 사용한다.
- radius는 control/card/sheet 3단계 정도로 제한한다.
- Route line, progress rail, ranking movement line을 동일한 'signal line' 언어로 연결한다.
- Explore의 화면 배경은 밝게, Active Run/Together Live는 dark를 기본으로 한다.
# 89. 핵심 화면 시각 브리프
| 화면 | 비주얼 구조 | 피할 것 |
|---|---|---|
| Explore Home | 밝은 지도 55~65% + 하단 코스 결과. 상단 검색은 지도 위 고정. 선택 코스가 route signal로 강조. | 지도보다 카드가 더 커지는 구성, 대형 welcome header |
| Course Detail | 상단 route map → 핵심 수치 → 내 PB/주간 순위 compact strip → environment/elevation → reviews. RUN CTA는 하단 sticky. | 환경 정보가 RUN/PB보다 먼저 나오는 구성 |
| Play Mode | 하단 sheet. 각 mode를 동일 크기 카드 4개로 쌓지 말고 주요 모드와 context-aware target을 리스트/segment로 표현. | 설정 화면 같은 radio list |
| Run Ready | dark pre-run canvas. 중앙 GPS 상태와 목표. 하단 넓은 Start. | 여러 설정 chip과 작은 버튼 |
| Active Run | near-black. 화면 중심에 2~3개 giant metrics. 모드별 gap/progress가 한 개의 강조 strip. | 지도와 데이터 50:50 분할, 6개 metric grid |
| Result | light로 복귀. 상단 achievement statement, 핵심 기록, map, verified state, rank delta, actions. | 처음부터 세부 splits 표 |
| Ranking | 일반 list보다 self-anchor가 중요. 나를 기준으로 위/아래 rank가 읽힘. podium은 과장하지 않음. | 1~3등 장식이 화면 절반 차지 |
| Together Lobby | room goal + participant readiness가 핵심. 채팅창 없음. | 메신저 room처럼 구성 |
| Together Live | dark. virtual progress rail과 참가자 상대 진행. self metric 항상 고정. | 실제 지도 위 친구 marker |

# 90. Explore 상세 레이아웃
┌──────────────────────────┐
│ [지역/장소 검색]     [◎] │
│ [3~5km] [평지] [야간]    │
│                          │
│          MAP             │
│       ━ ROUTE ━          │
│               ● selected │
│                          │
├──────────────────────────┤
│ 이 지역 추천 코스      12 │
│                          │
│ 한강 야간 5K             │
│ 5.2 km · 평지 · 신호 적음 │
│ 내 위치에서 1.3 km        │
│                          │
│ 대구스타디움 루프         │
│ 4.8 km · 초보 추천        │
└──────────────────────────┘
핵심은 '지도 따로 / 리스트 따로'가 아니라 리스트 선택과 지도 route highlight가 서로 연결되는 것이다.
# 91. Course Detail 상세 레이아웃
┌──────────────────────────┐
│          ROUTE MAP       │
│       ━━━━━━━━━━━        │
├──────────────────────────┤
│ 수성못 5K Loop            │
│ 5.1 km   31분   쉬움      │
│                          │
│ 내 PB 25:42   주간 18위   │
│ 친구 최고 24:51          │
│                          │
│ [        이 코스 달리기 ] │
├──────────────────────────┤
│ ELEVATION                │
│ ▁▂▂▃▂▁                   │
│                          │
│ 신호 적음 · 야간 밝음     │
│ 아스팔트 · 화장실 2곳     │
│ ...                      │
└──────────────────────────┘
첫 화면에서 '코스가 어떤 곳인지'와 '내가 왜 달려야 하는지'가 동시에 보여야 한다.
# 92. Active Run 상세 레이아웃
┌──────────────────────────┐
│ GPS 양호             LIVE │
│                          │
│          3.72            │
│           km             │
│                          │
│  18:42         5'01"     │
│  시간          평균 페이스 │
│                          │
│ ───── 74% ━━━━━━━━━      │
│ 목표보다 08초 빠름 ▲      │
│                          │
│ [        일시정지        ] │
└──────────────────────────┘
모드별로 가운데 강조 strip만 바뀌도록 한다. FREE에서는 split, COURSE에서는 진행률/이탈, PB/Challenge에서는 gap, LIVE에서는 순위/leader gap.
# 93. Result 상세 레이아웃
┌──────────────────────────┐
│ PB 갱신                  │
│ 이전 기록보다 21초 빨랐어요│
│                          │
│ 25:21        5.02 km     │
│ 5'03"/km                 │
│                          │
│        ROUTE MAP         │
│                          │
│ ✓ 공식 기록 인증됨        │
│ 주간 23위 → 14위          │
│                          │
│ [공유]       [다시 도전] │
│                          │
│ Splits / Elevation ...   │
└──────────────────────────┘
# 94. Together Live 상세 레이아웃
┌──────────────────────────┐
│ 5K RACE             3/4  │
│                          │
│  2위                     │
│  3.84 / 5.00 km          │
│                          │
│ 나      ━━━━━━━━━●       │
│ 민수    ━━━━━━━━━━━● +72m│
│ 지수    ━━━━━━━●    -110m│
│                          │
│ 선두와 18초 차이          │
│ 평균 4'58"/km            │
│                          │
│ [        일시정지        ] │
└──────────────────────────┘
Remote Together에서는 지도보다 virtual progress가 중심이다. 상대 GPS 좌표는 기본 UI 모델에 존재하지 않는다.
# 95. 컴포넌트 시각 규칙
| 컴포넌트 | ROUTE SIGNAL 규칙 |
|---|---|
| MetricBlock | 숫자가 label보다 최소 2~3단계 크게. active run에서는 surface 없이 직접 배치 가능 |
| CourseCard | thumbnail 없는 버전이 기본. 지도에서 route가 이미 시각 콘텐츠 역할 |
| PrimaryRunButton | signal accent를 가장 강하게 사용하는 핵심 action |
| GapIndicator | +/- 방향과 ahead/behind copy를 함께 사용 |
| RankingRow | self는 surface/line로 anchor. podium decoration 절제 |
| VerificationBadge | 작고 명확한 status, 결과 headline보다 시각 우선하지 않음 |
| FilterChip | 선택 상태 명확, 너무 많은 색상 사용 금지 |
| BottomSheet | map 작업을 보조; 최대 높이가 지도 전체를 상시 덮지 않음 |

# 96. Claude Code 스킬 조합 최종안
| 도구 | 역할 | 사용 원칙 |
|---|---|---|
| Expo official plugin | Expo/Router/native/EAS 최신 구현 기준 | 항상 활성화. 기술 source of truth는 Expo docs/CLI |
| Anthropic frontend-design | 시각 방향을 평범한 AI UI로 회귀하지 않게 유지 | 새 주요 화면/visual polish에 사용 |
| Draftbit mobile-taste-skill | React Native/Expo 모바일 anti-slop, navigation/motion review | 화면 구현 및 audit에 사용 |
| 프로젝트 CLAUDE.md | 본 서비스 고유 UX/디자인 규칙 | 가장 높은 프로젝트 문맥 |
| docs/ui/* | 화면/상태/레퍼런스/QA 계약 | 구현 전에 읽고 완료 후 검증 |

# Claude Code
claude plugin install expo@claude-plugins-official

# Draftbit mobile taste
claude plugin marketplace add draftbit/mobile-taste-skill
claude plugin install mobile-taste-skill

# Anthropic frontend-design:
# Claude Code official plugin marketplace에서 frontend-design 활성화/설치
여러 제3자 aesthetic skill을 동시에 추가하지 않는다. Expo official + Anthropic frontend-design + mobile-taste 정도로 제한하고, 최종 의사결정은 프로젝트 문서의 ROUTE SIGNAL 규칙이 우선한다.
# 97. Claude Code 첫 UI 구현 프롬프트 - 최종본
모바일 UI 구현을 시작한다.

먼저 반드시 아래 파일을 전부 읽어라.
- CLAUDE.md
- docs/ui/PRODUCT-UX.md
- docs/ui/REFERENCE-MATRIX.md
- docs/ui/DESIGN-SYSTEM.md
- docs/ui/DESIGN-DIRECTION.md
- docs/ui/SCREEN-SPECS.md
- docs/ui/INTERACTION-SPECS.md
- docs/ui/ACCESSIBILITY.md
- docs/ui/VISUAL-QA.md

제품의 최종 시각 방향은 ROUTE SIGNAL이다.

중요:
- generic fitness dashboard를 만들지 마라.
- Strava/NRC/AllTrails/Runnect 등 레퍼런스 화면을 복제하지 마라.
- 레퍼런스에서는 정보 계층과 interaction pattern만 사용한다.
- Explore는 light/map-first, Active Run/Together Live는 dark/metric-first다.
- route line과 progress signal이 앱 전체의 시각적 연결 장치다.
- white rounded card stack, purple gradient, greeting hero, floating FAB 남발 금지.
- 화면의 주요 한국어 콘텐츠를 실제 길이로 넣어라.
- 새로운 token을 임의로 추가하기 전에 기존 semantic token을 확인하라.

첫 작업:
1. Design System Playground를 구현한다.
2. Route Signal v0 token을 구현한다.
3. MetricBlock, CourseCard, PrimaryRunButton, GpsStatus,
   GapIndicator, RankingRow, VerificationBadge를 만든다.
4. Explore Home을 구현한다.
5. 지도 연동이 아직 준비되지 않았다면 실제 Map component 경계를 유지한 mock adapter를 사용하되,
   임의의 정적 이미지로 구조를 굳히지 마라.
6. iOS/Android viewport에서 screenshot을 확인하고 VISUAL-QA 기준으로 수정한다.

작업 완료 시:
- 생성/수정 파일
- 재사용 컴포넌트
- 새 token
- 구현한 상태
- accessibility 확인
- 성능 위험
- visual QA 결과
- 아직 결정되지 않은 항목
을 보고한다.
# 98. 디자인 확정 전 검증 항목
| 항목 | 통과 기준 |
|---|---|
| Accent contrast | light/dark canvas와 주요 button/text 조합에서 접근성 기준 검증 |
| Map legibility | 국내 실제 지도 SDK 위에서 course/actual/target route 구분 가능 |
| Sunlight | Active Run 주요 metric 실기기 야외 테스트 |
| Font | 한국어/숫자/tabular-nums/Android 렌더 확인 |
| Long content | 긴 코스명/닉네임/4자리 순위에서도 layout 유지 |
| Performance | 지도 + progress + metric update 동시 실행 시 profiler 확인 |
| Distinctiveness | 5개 핵심 화면을 나란히 놓았을 때 하나의 서비스로 보이고 범용 AI UI처럼 보이지 않음 |

# 99. v1.4 결론
본 서비스의 모바일 UI는 ROUTE SIGNAL을 최종 시각 방향으로 채택한다. 탐색 상태에서는 코스와 지도를 차분하게 읽고, 달리는 순간에는 화면이 강한 metric instrument로 바뀌며, 결과에서는 다시 코스와 경쟁의 의미를 연결한다. 이 컨텍스트 전환 자체가 서비스의 시각 정체성이다.
다음 산출물은 Claude Code 저장소의 DESIGN-DIRECTION.md, design token 코드, Design System Playground, Explore Home 구현이다.
# 100. Claude Code 디자인 스킬 스택 및 설치 게이트 v1.5
화면 구현 전에 Claude Code의 UI/UX 관련 스킬을 먼저 준비한다. 단, 외부 스킬을 단순히 많이 설치하는 것이 목적은 아니다. 각 스킬의 책임을 분리하고 프로젝트 고유 문서를 최상위 기준으로 두어, 자동 호출되는 여러 스킬이 디자인 방향을 서로 덮어쓰지 않도록 한다.
## 100.1 사전 설치 게이트
Claude Code는 아래 Preflight를 통과하기 전 React Native 화면 구현을 시작하지 않는다.
- Claude Code에서 설치/활성화된 플러그인과 project-local skills를 확인한다.
- Expo 공식 plugin을 설치한다.
- Anthropic 공식 frontend-design plugin을 설치/활성화한다.
- React Native/Expo 전용 mobile-taste-skill을 설치한다.
- UX Research/IA/Design Review용 claude-design-skills 컬렉션을 project-local로 설치한다.
- 전문 감사용 ui-skills, ui-design, ux-designer 계열은 SKILL.md를 검토한 뒤 project-local로 설치한다.
- 본 프로젝트의 running-ui-orchestrator skill을 활성화한다.
- 설치 후 Claude Code를 재시작하고 /skills 또는 plugin 목록에서 인식 여부를 확인한다.
- 그 후 DESIGN-DIRECTION.md와 프로젝트 문서를 읽고 Design System Playground부터 시작한다.
# 101. 필수 스킬 - Tier 0/1
| Skill/Plugin | 유형 | 역할 | 적용 |
|---|---|---|---|
| Expo official skills | Official plugin | Expo/React Native/Router/UI/EAS/version-sensitive implementation | 항상 |
| frontend-design | Anthropic official | generic AI aesthetic 억제, 명확한 시각 방향/타이포/레이아웃 | 주요 화면 시각 설계 |
| mobile-taste-skill | Draftbit | React Native/Expo native UI, navigation, motion, anti-slop | 항상 |
| running-ui-orchestrator | Project custom skill | 모든 스킬의 우선순위/문서/검증 단계를 통제 | 모든 UI 작업 |

## 101.1 Expo official
Expo 팀은 Claude Code용 공식 plugin을 제공하며 최신 Expo/React Native 제약을 적용하는 스킬과 Expo MCP 구성을 함께 제공한다. 기술 구현과 버전 호환성에 대해서는 프로젝트의 미적 스킬보다 Expo 공식 지침을 우선한다.
# Claude Code 내부
/plugin install expo@claude-plugins-official

# 또는 shell
claude plugin install expo@claude-plugins-official
## 101.2 Anthropic frontend-design
Anthropic 공식 frontend-design은 템플릿처럼 보이는 AI UI를 피하고, 제품 맥락에 맞는 의도적인 palette, typography, layout, motion 결정을 요구한다. 단, 웹 중심 일반 가이드가 React Native의 네비게이션/네이티브 제약보다 우선하지 않도록 mobile-taste 및 Expo 규칙 아래에서 사용한다.
# Claude Code 내부
/plugin install frontend-design@claude-plugins-official
## 101.3 Draftbit mobile-taste-skill
React Native/Expo에 특화된 디자인 스킬 모음이다. 신규 화면뿐 아니라 네비게이션 계획, 모바일 디자인 시스템, 디자인 리뷰, 단일 화면/앱 전체 리디자인 흐름을 분리해서 제공한다.
| Skill | 책임 |
|---|---|
| mobile-nav-plan | Expo Router route tree, tabs, modal/sheet, deep link, Android back |
| mobile-design-system | token/theme + MOBILE-DESIGN.md |
| mobile-taste | 새로운 모바일 screen/feature 구현 |
| mobile-design-review | Design Score/AI Slop Score 기반 audit |
| mobile-redesign-screen | 단일 화면 audit-first redesign |
| mobile-redesign-app | 전체 앱 phase 기반 redesign |

claude plugin marketplace add draftbit/mobile-taste-skill
claude plugin install mobile-taste-skill
# 102. 최근/전문 디자인 스킬 - Tier 2
아래 스킬들은 최근 Claude Code 디자인 워크플로를 더 세분화한다. 모두 설치하더라도 자동으로 서로의 결정을 덮어쓰게 두지 않고, 오케스트레이터가 필요한 단계에서만 호출한다.
| Repository | Author | 강점 | 프로젝트 사용 |
|---|---|---|---|
| claude-design-skills | richhemsley3 | 18개 UX/UI skills: research, IA, journey, wireframe, critique, accessibility, component gap, design-pipeline | Research/IA/Review pipeline |
| ui-skills | dawitlabs | ui-init, design-grill, uiux, uicolor, animate, copy, a11y, tokens | 전문 audit 단계 |
| ui-design-skill | charlomrt-boop | INIT/BUILD/REVIEW/EXTEND/MIGRATE, UX rules, contrast, 2026 trend reference | 디자인 시스템/최종 review |
| ux-designer-skill | szilu | WCAG 2.2, Laws of UX, mobile-first, navigation, microcopy, multiplayer/canvas UX | UX heuristic/accessibility reference |
| design-skill | Vdebug | UI/UX, typography, color, motion, layout, anti-slop를 묶은 meta skill | 보조적인 cross-check; 최종 결정권 없음 |

## 102.1 claude-design-skills 18-skill pipeline
프레임워크 독립적인 research/IA/design/review 스킬 집합이다. 특히 design-pipeline을 이용해 Research → Journey/Flow → IA → Product Design → Critique/Heuristics → Accessibility → Component Gap까지 순서대로 검증할 수 있다.
- user-researcher: 경쟁 서비스/사용자 문제 조사 구조화
- ux-flow-planner: 핵심 흐름 검증
- screen-flow-diagram: 실제 화면 간 전이 검증
- wireframe-agent: low-fidelity 구조 검증
- ux-heuristics: Nielsen/Laws of UX 검토
- accessibility-auditor: 접근성 검토
- design-reviewer: 화면 설계 감사
- component-builder / component gap: 디자인 시스템 누락 확인
- design-pipeline: 위 스킬을 end-to-end로 오케스트레이션
# project-local 설치 권장
git clone https://github.com/richhemsley3/claude-design-skills.git .claude/vendor/claude-design-skills
mkdir -p .claude/skills
cp -R .claude/vendor/claude-design-skills/skills/* .claude/skills/
## 102.2 dawitlabs/ui-skills
개별 실패 모드에 대한 specialist skill로 사용한다. 본 프로젝트에서는 ui-init/design-grill의 새 방향 생성보다 이미 결정된 ROUTE SIGNAL을 보존하는 쪽으로 활용한다.
| Skill | 사용 시점 |
|---|---|
| ui-init | UI 검증 환경 준비; 웹 전용 도구는 RN에 맞게 선택 적용 |
| design-grill | 새 visual direction 생성이 아니라 v1.4 결정과 충돌 여부 확인 |
| uiux | 특정 화면의 visual refinement |
| uicolor | signal accent 및 semantic 상태 색 감사 |
| animate | Reanimated/haptic motion 감사 |
| copy | 한국어 CTA/error/microcopy 감사 |
| a11y | 접근성 감사 |
| tokens | hardcoded style → semantic token 정리 |

## 102.3 ui-design-skill / ux-designer-skill
ui-design-skill의 structured mode와 contrast/review 규칙, ux-designer-skill의 WCAG 2.2와 Laws of UX 자료는 구현 결과를 점검하는 감사 계층으로 사용한다. 디자인 방향을 새로 선택하는 INIT 기능은 ROUTE SIGNAL 확정 이후에는 사용하지 않는다.
# 103. 스킬 충돌 방지 우선순위
Highest priority
1. Product requirements / technical constraints
2. CLAUDE.md
3. docs/ui/PRODUCT-UX.md
4. docs/ui/DESIGN-DIRECTION.md (ROUTE SIGNAL)
5. docs/ui/DESIGN-SYSTEM.md / SCREEN-SPECS.md
6. running-ui-orchestrator
7. Expo official skills (technical truth)
8. mobile-taste (native mobile UX)
9. frontend-design (visual quality)
10. claude-design-skills (research / IA / review)
11. ui-skills specialists
12. ui-design / ux-designer / other community references
Lowest priority
하위 스킬이 ROUTE SIGNAL을 다른 palette/style로 바꾸거나 bottom navigation 구조를 변경하려 하면 적용하지 않는다. 외부 skill의 'best practice'는 프로젝트 요구사항을 대체하지 않는다.
# 104. 화면 구현 전 스킬 적용 파이프라인
| Phase | 사용 스킬 | 출력 |
|---|---|---|
| 0. Preflight | plugin/skill list + orchestrator | 필수 설치 확인 |
| 1. Product Read | running-ui-orchestrator + product docs | 화면 목적/JTBD/모드 |
| 2. UX Structure | design-pipeline / ux-flow-planner / mobile-nav-plan | flow, route, states |
| 3. Visual Structure | frontend-design + mobile-design-system | ROUTE SIGNAL 기반 layout/token |
| 4. Native Build | Expo official + mobile-taste | React Native/Expo 구현 |
| 5. Interaction | mobile-taste + animate + Expo animation guidance | motion/haptic/gesture |
| 6. Accessibility | accessibility-auditor + a11y + ux-designer | WCAG/mobile audit |
| 7. Design Review | mobile-design-review + ui-design REVIEW + ux-heuristics | 결함 목록 |
| 8. Visual QA | 프로젝트 VISUAL-QA + simulator/device screenshots | 수정 후 승인 |

# 105. 프로젝트 전용 running-ui-orchestrator
외부 스킬을 직접 조합하는 책임을 매번 프롬프트에 맡기지 않고 project-local skill로 고정한다.
---
name: running-ui-orchestrator
description: >
  Orchestrates all UI/UX work for the course-based social running mobile app.
  Must run before any screen implementation or redesign.
---

1. Read project UX/design documents.
2. Verify required plugins/skills.
3. Identify screen purpose and required states.
4. Use research/IA skills only if structure is unresolved.
5. Use Expo/mobile-taste for native implementation.
6. Use frontend-design only within ROUTE SIGNAL.
7. Run accessibility/design-review specialists.
8. Run visual QA.
9. Refuse to mark complete if required states or QA are missing.
# 106. Claude Code Preflight Prompt
화면 구현을 시작하기 전에 UI/UX 스킬 환경부터 구성하라.

1. 현재 설치된 Claude Code plugins/skills를 확인한다.
2. 다음 필수 스택이 없으면 설치 또는 설치 방법을 제시하고, 설치/재시작 전에는 화면 코드를 작성하지 않는다.
   - expo@claude-plugins-official
   - frontend-design@claude-plugins-official
   - Draftbit mobile-taste-skill
   - project-local claude-design-skills
   - project-local ui-skills
   - project-local ui-design-skill
   - project-local ux-designer-skill
   - running-ui-orchestrator

3. 제3자 skill은 설치 전에 SKILL.md와 install script를 읽고, 임의의 shell/network side effect가 없는지 확인한다.
4. 설치 완료 후 인식된 skill 목록을 다시 확인한다.
5. CLAUDE.md와 docs/ui/*를 전부 읽는다.
6. 외부 스킬의 시각 제안이 ROUTE SIGNAL과 충돌하면 ROUTE SIGNAL을 우선한다.
7. Design System Playground 이전에는 실제 제품 화면을 구현하지 않는다.
# 107. 업데이트/핀 전략
- Expo 공식 plugin은 공식 marketplace 업데이트를 사용한다.
- Anthropic 공식 plugin도 official marketplace 상태를 기준으로 관리한다.
- 제3자 skill은 project-local vendor 폴더 또는 고정 commit으로 설치해 재현성을 유지한다.
- 무조건 latest를 CI에서 자동 pull하지 않는다. UI 규칙 변경이 코드 전체를 흔들 수 있기 때문이다.
- 업데이트 시 CHANGELOG/SKILL.md diff를 검토하고 running-ui-orchestrator와 충돌 여부를 확인한다.
- README에 설치 시점 commit/hash를 기록한다.
# 108. 적용 원칙
‘최근 스킬을 모두 적용한다’는 의미를 모든 스킬이 매 화면마다 동시에 디자인하도록 해석하지 않는다. 모든 유용한 전문성을 workflow에 포함하되, 각 스킬의 책임을 분리한다. 이 방식이 디자인 일관성과 재현성을 유지하면서도 최신 스킬의 장점을 실제로 활용하는 방법이다.
# 109. UI Foundation Bootstrap v1.6
본 단계의 목적은 제품 화면을 만들기 전에 Claude Code가 사용할 UI 기반을 실제 코드 구조와 검증 절차로 고정하는 것이다. Design System Playground는 디자인 시안을 보여주는 갤러리가 아니라 토큰·컴포넌트·상태·접근성·플랫폼 차이를 조기에 검증하기 위한 개발 도구다.
## 109.1 화면 구현 시작 조건
- Claude UI Skill Preflight 통과
- running-ui-orchestrator 활성화
- ROUTE SIGNAL 문서 확인
- UI Foundation 폴더 구조 생성
- Design token v0 구현
- Design System Playground 구현
- 핵심 primitive/component 상태 검증
- iOS/Android visual QA 통과
- 그 후 Explore Home 구현 시작
# 110. UI Foundation 실제 폴더 구조
apps/mobile/
├─ app/
│  ├─ _layout.tsx
│  ├─ (dev)/
│  │  └─ design-system.tsx
│  └─ (tabs)/
│     ├─ explore/
│     ├─ run/
│     ├─ together/
│     └─ my/
└─ src/
   ├─ design/
   │  ├─ tokens/
   │  │  ├─ color.ts
   │  │  ├─ typography.ts
   │  │  ├─ spacing.ts
   │  │  ├─ radius.ts
   │  │  ├─ motion.ts
   │  │  └─ index.ts
   │  ├─ theme/
   │  │  ├─ lightTheme.ts
   │  │  ├─ darkTheme.ts
   │  │  └─ ThemeProvider.tsx
   │  └─ primitives/
   │     ├─ AppText.tsx
   │     ├─ AppPressable.tsx
   │     ├─ AppSurface.tsx
   │     ├─ AppDivider.tsx
   │     └─ AppIcon.tsx
   ├─ components/
   │  ├─ MetricBlock/
   │  ├─ CourseCard/
   │  ├─ PrimaryRunButton/
   │  ├─ GpsStatus/
   │  ├─ GapIndicator/
   │  ├─ RankingRow/
   │  ├─ VerificationBadge/
   │  ├─ ParticipantChip/
   │  └─ FilterChip/
   ├─ features/
   └─ shared/
## 110.1 구조 원칙
- raw color/font/spacing 값은 feature 화면에서 직접 사용하지 않는다.
- primitive는 시각적 기반만 제공하고, 도메인 의미를 갖는 컴포넌트는 components/features 계층에 둔다.
- MetricBlock이나 RankingRow처럼 러닝 도메인 의미가 강한 컴포넌트를 generic primitive로 만들지 않는다.
- dev playground route는 production build에서 숨기거나 개발 환경에서만 진입 가능하게 한다.
- theme 전환은 light/dark를 위한 것이지만 Active Run의 dark context를 OS dark mode와 동일 개념으로 취급하지 않는다.
# 111. Design System Playground 목적과 구성
| Section | 검증 내용 |
|---|---|
| Foundations | light/dark canvas, semantic colors, spacing, radius |
| Typography | 한글/숫자/tabular numerals, font scaling |
| Actions | primary/secondary/disabled/loading/pressed |
| Metrics | normal/highlight/warning/unavailable |
| Course | normal/long title/no metadata/selected |
| Competition | ahead/behind/tied/rank/self/friend |
| GPS | acquiring/good/fair/poor/unavailable |
| Verification | pending/verified/unverified/rejected |
| Together | invited/ready/running/disconnected/finished/DNF |
| Stress | 긴 한글, 큰 글자, extreme numbers, small screen |

## 111.1 Playground 규칙
- 컴포넌트를 예쁘게 전시하는 마케팅 페이지처럼 만들지 않는다.
- 각 컴포넌트의 정상 상태보다 edge state를 더 많이 보여준다.
- 실제 한국어 문자열과 실제 단위 표기를 사용한다.
- light/dark context를 같은 화면에서 비교할 수 있게 한다.
- 개발자가 token drift와 component drift를 빠르게 발견할 수 있어야 한다.
# 112. Primitive 계약
| Primitive | 책임 | 금지 |
|---|---|---|
| AppText | semantic typography role, color role, scaling | 화면마다 fontSize 직접 지정 |
| AppPressable | pressed/disabled/a11y feedback | 모든 버튼을 같은 시각으로 강제 |
| AppSurface | canvas/surface/elevated semantic layer | 카드 남발 |
| AppDivider | 정보 그룹 분리 | 장식용 선 남용 |
| AppIcon | 일관된 icon adapter + accessibility | 여러 icon library 혼용 |

## 112.1 AppText API 초안
type TextRole =
  | "metricHero"
  | "metricLarge"
  | "screenTitle"
  | "sectionTitle"
  | "body"
  | "label"
  | "caption";

type TextTone =
  | "primary"
  | "secondary"
  | "inverse"
  | "success"
  | "warning"
  | "danger";

<AppText
  role="metricHero"
  tone="inverse"
  tabular
>
  3.72
</AppText>
# 113. 핵심 컴포넌트 계약
| Component | Input | States | Hierarchy |
|---|---|---|---|
| MetricBlock | label/value/unit/status | default, emphasized, warning, unavailable | value > label > unit |
| CourseCard | title,distance,tags,proximity,recordContext | default, selected, compact, loading | course identity > distance > metadata |
| PrimaryRunButton | label,availability,loading | ready, disabledGPS, disabledPermission, loading | single dominant action |
| GpsStatus | quality,copy | acquiring,good,fair,poor,unavailable | icon + text + semantic color |
| GapIndicator | delta,direction,label | ahead,behind,tied,noData | direction + numeric gap |
| RankingRow | rank,user,time,relation | normal,self,friend,podium,nearby | self anchor over decoration |
| VerificationBadge | status | pending,verified,unverified,rejected | compact factual status |
| ParticipantChip | name,status,progress | invited,ready,running,disconnected,finished,DNF | state first |
| FilterChip | label,selected | default,selected,disabled | quick filter only |

# 114. 토큰 구현 규칙
v0 raw 값은 시각 탐색용이며 production lock이 아니다. 하지만 semantic API는 초기에 고정해 화면에서 raw 값의 확산을 막는다.
// Good
theme.colors.action.primary
theme.colors.text.primary
theme.colors.gps.poor
theme.colors.route.course

// Bad
"#00BFA6"
"#68716E"
fontSize: 13
borderRadius: 17
| Token | 초기 후보 | 확정 전 검증 |
|---|---|---|
| signal accent | #00BFA6 | WCAG contrast, map visibility, sunlight |
| canvas light | #F7F8F6 | map/surface relation |
| canvas dark | #101312 | OLED/contrast, active-run outdoor |
| metric hero | 64/68, extra-bold 후보 | small iPhone, Dynamic Type |
| spacing | 4-based semantic scale | dense map controls, Android |
| radius | control/card/sheet/pill | platform feel, over-rounding audit |

# 115. Claude Code 첫 실행 Master Workflow
PHASE 0  Skill Preflight
PHASE 1  Read all project UI docs
PHASE 2  Audit existing mobile project structure
PHASE 3  Create UI foundation folders only
PHASE 4  Implement semantic tokens + theme
PHASE 5  Implement primitives
PHASE 6  Implement core reusable components
PHASE 7  Build Design System Playground
PHASE 8  Run accessibility/stress states
PHASE 9  Run iOS/Android screenshot QA
PHASE 10 Fix drift/issues
PHASE 11 Report foundation decisions
STOP
Do not implement Explore until foundation review is complete.
## 115.1 Claude Code가 임의로 결정하면 안 되는 항목
- 지도 SDK
- 최종 브랜드 색상 확정
- 새 bottom navigation 구조
- 새 run mode
- 새 feature tab
- 외부 UI kit의 wholesale adoption
- 새 font family
- Active Run의 핵심 metric 우선순위 변경
- 사용자 위치/친구 위치 노출 방식 변경
# 116. Foundation 완료 체크리스트
| Area | Definition of Done |
|---|---|
| Skill | 필수 plugin/skills 인식 확인 |
| Docs | UI 문서 전체 읽기 완료 |
| Tokens | raw value 직접 사용 없는 semantic token layer |
| Theme | Explore light / Run dark context 표현 가능 |
| Primitive | Text/Pressable/Surface/Icon/Divider |
| Components | 9개 핵심 component 상태 구현 |
| Korean | 긴 코스명/닉네임/단위 stress test |
| A11y | font scaling, labels, color-independent state, touch target |
| iOS | small/standard viewport 확인 |
| Android | standard viewport + navigation inset 확인 |
| Dark Run | metric hierarchy/glanceability 확인 |
| Performance | Playground에서 불필요한 high-frequency rerender 없음 |
| Docs | 새 token/component가 문서와 일치 |
| Review | mobile-design-review/heuristic audit 수행 |
| Decision Log | 아직 미확정인 visual 값 목록 기록 |

## 116.1 Explore 구현으로 넘어가는 승인 조건
위 체크리스트가 충족되고 Design System Playground에서 ROUTE SIGNAL의 light/dark 문법이 실제 React Native에서 안정적으로 보인다는 것을 확인한 뒤에만 Explore Home으로 넘어간다. Foundation 단계에서 문제가 발견되면 화면별 workaround를 추가하지 말고 token/primitive/component 수준에서 먼저 해결한다.
# 117. 서비스명 및 프로젝트 식별자 확정 v1.7
서비스명은 '달리모', 영문 표기는 'DALLIMO'로 확정한다. 이후 모바일 앱, API, 저장소, 문서, 디자인 시스템, 배포 환경에서 동일한 제품명을 사용한다.
| 항목 | 확정값 | 비고 |
|---|---|---|
| 한글 서비스명 | 달리모 | 사용자-facing 기본 서비스명 |
| 영문 브랜드 | DALLIMO | 영문 표기 및 기술 식별자 기본 |
| 제품 유형 | 코스 기반 소셜 러닝 플랫폼 | 설명용 카테고리 |
| 핵심 경험 | 코스 발견 → 플레이 모드 → 러닝 → 검증 → 랭킹/공유/재도전 | 기존 제품 루프 유지 |
| 시각 방향 | ROUTE SIGNAL | 브랜드명 확정과 무관하게 기존 디자인 방향 유지 |

## 117.1 네이밍 사용 규칙
- 사용자 화면의 기본 표기는 '달리모'로 한다.
- 영문 로고, 저장소 내부 식별자, Expo slug 등에는 'DALLIMO' 또는 소문자 'dallimo'를 사용한다.
- 임의로 DALIMO, RUN DALLIMO, DALLIMO RUN 등 별도 브랜드 표기를 만들지 않는다.
- 기능명은 브랜드명에 종속시키지 않는다. 예: '달리모 코스'보다 문맥상 자연스러운 '코스', '함께 달리기', '기록'을 우선한다.
- 앱스토어 부제/설명은 서비스 기능을 설명하는 용도로 사용하고 브랜드명 자체에 기능을 과도하게 끼워 넣지 않는다.
## 117.2 초기 브랜드 문구
| 용도 | 문구 |
|---|---|
| 제품 설명 | 코스를 발견하고, 기록에 도전하고, 함께 달리는 러닝 앱 |
| 짧은 설명 | 오늘 달릴 코스를 찾고, 같이 달리고, 기록을 깨다. |
| 영문 설명 후보 | Find a route. Run your race. Run together. |

위 문구는 앱스토어/랜딩 페이지 카피 후보이며, 법적 상표 문구나 고정 슬로건으로 확정한 것은 아니다.
# 118. 저장소 및 프로젝트 구조 확정
Git Repository는 하나만 사용하며 frontend와 backend를 명확히 분리한다. 현재 개발 착수 범위는 frontend이며 backend 디렉터리는 이후 Spring Boot 프로젝트 생성 시 추가/초기화한다.
dallimo/
├─ frontend/                # React Native + Expo
│  ├─ app/
│  ├─ src/
│  ├─ assets/
│  ├─ docs/
│  ├─ .claude/
│  ├─ app.config.ts
│  └─ package.json
├─ backend/                 # Spring Boot (후속 단계)
│  └─ README.md             # 초기에는 placeholder 가능
├─ docs/                    # 제품/아키텍처 공통 문서
├─ .gitignore
└─ README.md
## 118.1 Repository 원칙
- 하나의 Git repository 안에서 frontend/backend를 분리한다.
- 모바일 전용 Claude Code UI 문서는 우선 frontend 내부에 배치하되, 제품 공통 문서는 root docs에 둔다.
- frontend와 backend는 각각 독립적으로 build/test 가능한 구조를 유지한다.
- frontend의 package manager 설정과 backend의 Gradle/Maven 설정을 root에서 억지로 통합하지 않는다.
- CI는 변경 경로에 따라 frontend/backend job을 분리할 수 있도록 설계한다.
## 118.2 프론트엔드 프로젝트 식별자 초안
| 항목 | 권장값 | 확정 시점 |
|---|---|---|
| Directory | frontend | 확정 |
| Expo project name | DALLIMO | 프로젝트 생성 시 |
| Expo slug | dallimo | 프로젝트 생성 시 |
| Display name | 달리모 | 프로젝트 생성 시 |
| iOS bundle identifier | com.<owner>.dallimo | Apple 계정/소유 주체 확정 후 |
| Android package | com.<owner>.dallimo | 소유 주체 확정 후 |
| Scheme | dallimo | Deep Link 설계 시 |

bundle/package의 <owner> 부분은 개인/조직 소유 주체가 확정되기 전 임의로 문서에서 고정하지 않는다.
# 119. 프론트엔드 우선 개발 기준
현재는 backend 구현보다 frontend 앱 기반을 먼저 구축한다. API가 아직 없더라도 UI를 임의 JSON에 종속시키지 않고 adapter/mock repository 경계를 통해 이후 실제 API로 교체할 수 있게 한다.
현재 순서

1. Git repository 생성
2. frontend/ Expo 프로젝트 생성
3. Claude Code UI skill preflight
4. UI Foundation / Design System Playground
5. Explore Home
6. Course Detail
7. Play Mode
8. Run Ready / Active Run UI
9. frontend 상태/Mock contract 검증
10. backend/ Spring Boot 착수
## 119.1 프론트 단독 단계에서 하지 않을 것
- 실제 API가 없는 상태에서 서버 응답 구조를 화면 내부에 하드코딩하지 않는다.
- 로그인/회원가입부터 습관적으로 먼저 만들지 않는다.
- 지도 SDK를 디자인 시안 때문에 임의로 확정하지 않는다.
- GPS/백그라운드 기능이 필요한 화면에서 단순 UI mock을 실제 Running Engine 구현으로 오해하지 않는다.
- DALLIMO 이름 확정만을 이유로 기존 ROUTE SIGNAL 토큰과 화면 계층을 재설계하지 않는다.
# 120. Claude Code 브랜드 컨텍스트
PRODUCT BRAND
- Korean: 달리모
- English: DALLIMO
- Category: course-based social running app

Never rename the product.
Never invent an alternate English spelling.

Repository:
dallimo/
  frontend/
  backend/

Current scope:
frontend first.

The product loop remains:
DISCOVER
→ COURSE
→ PICK PLAY MODE
→ RUN
→ VERIFIED RESULT
→ RANK / SHARE / REMATCH

Visual direction:
ROUTE SIGNAL
# 121. 사용자 피드백 반영 범위 v1.8
실사용자 피드백에서 반복적으로 확인된 요구는 외부 러닝 기록 활용, 직접 구성 가능한 인터벌 훈련, GPS 기반 경쟁·게임화이다. 본 버전은 이를 기존 달리모의 코스 중심 구조에 흡수하되, 별도의 만능 피트니스 앱으로 확장하지 않는 것을 원칙으로 한다.
| 피드백 | 반영 방향 | 제품 원칙 |
|---|---|---|
| Apple Watch/건강앱 기록을 달리모에서도 쓰고 싶음 | 외부 Activity Import + 코스 자동 매칭 | 달리모 앱으로 직접 기록하지 않아도 히스토리와 코스 경험으로 연결 |
| 400m/200m 등 인터벌을 직접 구성하고 싶음 | Training / Interval Builder 추가 | 자유 러닝·코스 러닝과 분리된 훈련 모드로 제공 |
| GPS 이동 자체가 재미있는 경험이면 좋겠음 | Ghost, Segment Attack, Course Crown, 이벤트 미션 | 게임 자체가 목적이 아니라 실제 러닝 동기를 강화 |
| Garmin/COROS 같은 기기 기록도 연동되면 좋겠음 | Provider Adapter 구조 선설계, 실제 연동은 후속 단계 | 특정 벤더 SDK/API에 핵심 도메인이 종속되지 않도록 설계 |

# 122. 외부 러닝 기록 연동
외부 기록 연동의 목적은 사용자가 이미 Apple Watch, Android 건강 플랫폼, 스포츠 워치 등에서 기록한 러닝을 달리모의 코스·기록·개인 히스토리 경험에 재사용하게 하는 것이다. 외부 기록은 즉시 공식 랭킹으로 인정하지 않고, 정규화 및 검증 단계를 거친다.
## 122.1 지원 Source 모델
RunSource
- DALLIMO
- APPLE_HEALTH
- HEALTH_CONNECT
- GARMIN
- COROS
- GPX_IMPORT
1.5차에서는 APPLE_HEALTH, HEALTH_CONNECT를 우선 대상으로 두고 GARMIN/COROS는 Adapter 인터페이스와 DB 필드를 먼저 확보한다. 실제 외부 서비스 연동 가능 범위는 구현 시점의 권한, 심사, 파트너 정책을 다시 검증한다.
| Source | 1차 활용 | 공식 랭킹 기본 정책 | 비고 |
|---|---|---|---|
| DALLIMO | 실시간 기록, 코스, PB, Together | 검증 통과 시 가능 | 가장 높은 신뢰 레벨 |
| APPLE_HEALTH | 운동/경로 Import, 코스 매칭 | 추가 검증 후 가능 | iOS 우선 |
| HEALTH_CONNECT | 운동/경로 Import, 코스 매칭 | 추가 검증 후 가능 | Android 우선 |
| GARMIN | Activity Import | 후속 정책 | 사업/권한 조건 확인 후 |
| COROS | Activity Import | 후속 정책 | 사업/권한 조건 확인 후 |
| GPX_IMPORT | 개인 히스토리/코스 참고 | 기본 제외 | 수동 파일은 신뢰도 낮게 처리 |

## 122.2 Import 파이프라인
External Provider
  -> Provider Adapter
  -> ExternalActivity DTO
  -> Normalize
  -> Duplicate Check
  -> Run 저장
  -> GPS/시간 검증
  -> Course Matcher
  -> Verification Policy
  -> CourseRecord 생성 여부 결정
- 외부 원본 ID(provider_activity_id)와 provider를 함께 Unique Key로 사용하여 중복 Import를 방지한다.
- 시간대, 단위, GPS 좌표, 일시정지 구간을 달리모 표준 모델로 정규화한다.
- 기존 Run과 동일 활동으로 판단되는 경우 새 Run을 생성하지 않고 병합 후보로 표시한다.
- 코스 자동 매칭은 출발/종료 지점뿐 아니라 실제 경로 유사도와 이동 거리 조건을 함께 사용한다.
- 공식 CourseRecord 생성은 source별 verification policy를 통과한 경우에만 허용한다.
- Import 실패는 전체 활동을 삭제하지 않고 상태와 실패 사유를 저장하여 재시도 가능하게 한다.
## 122.3 사용자 경험
달리모 실행
-> "새 러닝 기록 2개를 발견했어요"
-> 기록 선택
-> Import
-> "OO 코스와 96% 일치"
-> 내 활동에 저장
-> 검증 통과 시 코스 완주/PB 반영
| 화면 | 필수 요소 |
|---|---|
| 연동 설정 | Provider 상태, 권한 상태, 마지막 동기화, 연결 해제 |
| Import 후보 | 거리, 시간, 시작 시각, Source, 간단 경로 |
| Import 결과 | 매칭 코스, 검증 상태, PB 여부, 랭킹 반영 여부 |
| 내 활동 | Source Badge, Imported 표시, 검증 상태 |

## 122.4 데이터 모델 변경
Run
- source
- source_provider
- provider_activity_id
- source_device_name
- imported_at
- trust_level
- verification_policy_version
- import_status
- import_failure_reason
CourseRecord는 기존처럼 Run과 분리한다. 모든 외부 활동은 Run이 될 수 있지만, 공식 코스 기록은 검증 정책을 통과한 Run에만 생성한다.
# 123. Training / 인터벌 훈련
인터벌 기능은 달리모를 전문 훈련 플랫폼으로 확장하기 위한 것이 아니라, 사용자가 자주 반복하는 러닝 세션을 직접 구성하고 실행할 수 있게 하는 기능이다. 초기 범위는 구조화된 인터벌 편집과 실행에 집중한다.
## 123.1 사용자 IA
달리기
├─ 자유롭게 (FREE)
├─ 코스 달리기 (COURSE)
├─ 훈련하기 (TRAINING)
│   ├─ 나의 인터벌
│   ├─ 최근 훈련
│   ├─ 추천 템플릿
│   └─ + 직접 만들기
└─ 함께 달리기 (TOGETHER)
## 123.2 Interval Builder 모델
| 구성 요소 | 지원 값 | 1차 범위 |
|---|---|---|
| Step Type | WARMUP / WORK / RECOVERY / COOLDOWN | 지원 |
| 종료 조건 | DISTANCE / TIME / MANUAL | 지원 |
| 목표 | TARGET_TIME / TARGET_PACE | 지원 |
| 반복 | 2~N회 Repeat Group | 지원 |
| 심박 목표 | HR Zone | 후속 |
| 케이던스/파워 | Cadence / Power | 후속 |

예시: 400m 인터벌
WARMUP 1km
REPEAT x 5
  WORK     400m / 목표 1:30
  RECOVERY 200m / 최대 1:30
COOLDOWN 1km
- 사용자는 Step 순서를 Drag & Drop하거나 추가/삭제할 수 있다.
- Repeat Group 안에 WORK/RECOVERY를 묶고 반복 횟수를 지정한다.
- Active Run에서는 다음 구간, 남은 거리/시간, 현재 목표 대비 차이만 보여준다.
- 오디오/진동 Cue는 구간 전환 시 사용하며, 화면을 보지 않아도 훈련할 수 있어야 한다.
- 훈련 완료 후 각 Step별 실제 시간, 평균 페이스, 목표 대비 차이를 제공한다.
- 저장한 Workout은 다시 실행하거나 복제해서 수정할 수 있다.
## 123.3 Training 데이터 모델 초안
WorkoutTemplate
- id
- user_id
- name
- description
- version
- created_at

WorkoutBlock
- template_id
- seq
- type
- repeat_count

WorkoutStep
- block_id
- seq
- step_type
- end_condition_type
- end_condition_value
- target_type
- target_min
- target_max
Run은 workout_template_id와 실행 당시 workout_version을 저장하여 템플릿 수정 이후에도 과거 러닝 결과를 재현할 수 있게 한다.
# 124. 달리모식 게임화
GPS 기반 좀비 게임처럼 위치 이동 자체를 게임의 중심으로 만드는 아이디어는 이벤트성 콘텐츠로는 가능하지만, 달리모의 상시 핵심 기능으로 두지 않는다. 상시 게임화는 코스, 기록, 경쟁이라는 기존 핵심 루프를 강화하는 방향으로 제한한다.
| 기능 | 설명 | 단계 |
|---|---|---|
| Ghost / Pace Chase | 내 PB 또는 다른 러너의 기록을 가상 상대처럼 표시 | 핵심 |
| Segment Attack | 코스 내 특정 구간 진입 시 해당 세그먼트 기록 도전 | 2차 |
| Course Crown | 최근 기간 내 코스 최고 검증 기록 보유자 표시 | 2차 |
| Local Legend | 최근 기간 내 해당 코스를 가장 많이 검증 완주한 사용자 표시 | 2차 |
| Route Conquest | 완주한 코스/지역을 수집하는 개인 또는 크루 진행도 | 후속 |
| Seasonal Mission | Halloween Zombie Run 등 기간 한정 GPS 미션 | 이벤트 |

- 게임화 지표는 실제 운동량을 왜곡하거나 위험한 속도 경쟁을 유도하지 않도록 설계한다.
- 정확한 실시간 타인의 GPS 좌표를 기본 공개하지 않는다. 상대 진행도는 거리, 페이스, 코스 진행률 등 상대 정보로 표현한다.
- 영토 기능은 임의 GPS Polygon 쟁탈보다 코스/지역 단위의 검증된 완주 데이터를 기반으로 한다.
- Course Crown과 Local Legend는 동일 의미로 합치지 않는다. 하나는 기록, 하나는 반복 참여를 보상한다.
# 125. 러닝 시작 IA 개편
기존 내부 Play Mode는 유지하되 사용자에게는 목적 중심 4개 진입점으로 단순화한다. 내부 enum과 사용자 노출 IA를 분리하여 기능 확장 시 홈 화면이 복잡해지는 것을 방지한다.
| 사용자 진입점 | 내부 Mode | 주요 사용 목적 |
|---|---|---|
| FREE | SOLO_FREE | 그냥 지금 달리기 |
| COURSE | COURSE_NORMAL / PB_ATTACK / RIVAL | 코스 완주, PB, 라이벌 |
| TRAINING | INTERVAL / STRUCTURED_WORKOUT | 직접 만든 훈련 실행 |
| TOGETHER | TOGETHER / LIVE_RACE | 친구/그룹과 동시 시작 |

Explore에서 코스를 선택한 경우 COURSE로 바로 진입하고, Run 탭에서 시작한 경우 위 4개 진입점을 보여준다. 사용자의 직전 실행 모드는 Quick Start로 제공할 수 있다.
# 126. API 및 도메인 영향
| 영역 | 추가 API/책임 |
|---|---|
| Integration | Provider 연결 상태, Import 후보 조회, Import 실행, Sync 상태 |
| Course Matcher | 외부 Run의 Course 후보 조회 및 매칭 결과 저장 |
| Verification | source별 verification policy 적용 |
| Workout | WorkoutTemplate CRUD, 복제, 실행 준비 |
| Run | workout/version/source metadata 포함 |
| Gamification | Segment result, Crown/Legend 집계 |

예시 API
GET  /api/v1/integrations
POST /api/v1/integrations/{provider}/sync
GET  /api/v1/imported-activities/candidates
POST /api/v1/imported-activities/{externalId}/import

GET  /api/v1/workouts
POST /api/v1/workouts
GET  /api/v1/workouts/{id}
PUT  /api/v1/workouts/{id}
POST /api/v1/workouts/{id}/duplicate

GET  /api/v1/courses/{courseId}/segments
GET  /api/v1/courses/{courseId}/crown
GET  /api/v1/courses/{courseId}/local-legend
API 경로는 구현 전 기존 REST naming convention과 최종 정합성을 다시 확인한다. 본 문서는 계약 방향을 고정하는 수준이며 URL 자체를 최종 동결하지 않는다.
# 127. 프론트엔드 구현 영향
| Feature | 화면/컴포넌트 |
|---|---|
| External Activity | IntegrationSettings, ImportCandidateCard, SourceBadge, ImportResultSheet |
| Training | WorkoutList, WorkoutBuilder, WorkoutStepEditor, RepeatBlock, TrainingRunHUD, WorkoutResult |
| Gamification | GhostGapIndicator, SegmentAttackBanner, CourseCrownBadge, LocalLegendRow |
| Run IA | RunModeSelector, QuickStartCard |

ROUTE SIGNAL 디자인 방향은 그대로 유지한다. 외부 연동/훈련 기능 추가를 이유로 메인 Explore를 카드형 피트니스 대시보드로 바꾸지 않는다.
# 128. 단계별 반영 우선순위
| 단계 | 포함 기능 | 범위 |
|---|---|---|
| MVP | 기존 Explore / Course / Run / Result / Ranking / Together 핵심 | 변경 없음 |
| 1.5차 | Apple Health, Health Connect Import / Source Badge / Course auto-match | 외부 기록을 달리모 경험으로 흡수 |
| 1.5~2차 | Interval Builder 기본 / 저장 / 실행 / 결과 | 거리·시간 기반 구조화 훈련 |
| 2차 | Ghost 강화 / Segment Attack / Course Crown / Local Legend | 코스 기반 경쟁·게임화 |
| 2차+ | Garmin/COROS 연동 / 외부 Workout 전송 검토 | 파트너·권한 조건 충족 시 |
| 이벤트 | Zombie/미션형 GPS 콘텐츠 | 상시 핵심 기능과 분리 |

# 129. 기능별 완료 기준
- External Import: 동일 외부 Activity가 중복 Run으로 생성되지 않고, Source와 검증 상태가 사용자에게 명확히 표시된다.
- Course Matching: 외부 Run이 매칭된 코스에 대해 match 결과와 CourseRecord 생성 여부를 재현할 수 있다.
- Interval Builder: 사용자가 400m WORK + 200m RECOVERY x N 형태의 세션을 1분 내 생성하고 저장할 수 있다.
- Training Run: 화면을 지속적으로 보지 않아도 오디오/진동을 통해 Step 전환을 이해할 수 있다.
- Gamification: 상대의 정확한 실시간 위치를 노출하지 않고도 경쟁 상황을 이해할 수 있다.
- IA: 신규 기능이 추가되어도 Run 시작 1단계에서 4개 이상의 핵심 진입 카테고리를 노출하지 않는다.
