# 달리모 (DALLIMO) — 저장소 공통 규칙

## 1. 기준 문서

- 마스터 스펙: `docs/spec/dallimo_master_spec_v1.8_feedback_features.docx`
  - 검색·열람용 추출본: `docs/spec/dallimo_master_spec_v1.8.md`
  - 내용이 다르면 docx 원본을 기준으로 한다.
- frontend 작업은 `frontend/CLAUDE.md`와 `frontend/docs/ui/`를 먼저 읽는다.
- 제품 방향을 재해석하지 않는다.
  - 서비스명: 달리모 / DALLIMO. 다른 표기를 만들지 않는다.
  - 핵심 루프: DISCOVER → COURSE → PICK PLAY MODE → RUN → VERIFIED RESULT → RANK / SHARE / REMATCH
  - 시각 방향: ROUTE SIGNAL (고정)
  - 하단 탭: Explore / Run / Together / My

## 2. 임의로 확정하지 않는 항목

스펙상 PoC·실측·소유 주체 확정 후에 정하는 값이다.

- 지도 SDK
- iOS bundleIdentifier / Android package의 owner prefix
- GPS·코스 검증 정책값 (정확도, start/end radius, match buffer/rate, 실시간 전송 주기)
- 최종 브랜드 색상, 새 font family
- 새 bottom navigation 구조, 새 run mode, 새 feature tab
- 사용자·친구 위치 노출 방식

정책값은 코드에 하드코딩하지 않고 정책 설정으로 관리한다.

## 3. Git 브랜치 규칙

- `main`에 직접 커밋하거나 push하지 않는다.
- 작업은 기능 단위로 `main`에서 새 브랜치를 만들어 진행한다.
- 한 브랜치에는 한 기능만 담는다. 머지된 브랜치는 재사용하지 않는다.
- 브랜치 이름은 `<prefix>/<kebab-case-설명>` 형식을 쓴다.

| prefix | 용도 | 예시 |
| --- | --- | --- |
| `feat/` | 새 기능 추가 | `feat/run-engine-sqlite` |
| `refactor/` | 동작 변화 없는 구조 개선 | `refactor/location-adapter` |
| `design/` | UI, 디자인 토큰, 컴포넌트, 스타일 | `design/ui-foundation-playground` |
| `fix/` | 버그 수정 | `fix/gps-batch-retry` |
| `docs/` | 코드 변경 없는 문서 전용 변경 | `docs/project-conventions` |

- 이 다섯 가지 외의 prefix는 쓰지 않는다.
- 기능 구현에 딸린 문서 수정은 해당 기능 브랜치에 함께 담는다. `docs/`는 문서만 바뀌는 경우에 쓴다.
- 스펙 기능 ID(`RUN-007`, `CRS-101` 등)가 있으면 브랜치 이름이나 PR 본문에 적어 추적성을 유지한다.

## 4. Pull Request 규칙

- PR 제목과 본문은 한국어로 작성한다.
- 본문 구성:

```markdown
## 개요
무엇을 왜 바꿨는지 1~3문장

## 변경 사항
- 주요 변경 목록

## 관련 기능 ID
- 스펙 기능 ID (없으면 생략)

## 검증
- 실행한 명령과 결과 (typecheck, lint, test, expo config 등)

## 남은 작업
- 이번 PR 범위 밖으로 남긴 항목
```

## 5. 검증

frontend 변경은 PR 전에 아래를 통과시킨다.

```bash
cd frontend
npm run typecheck
npm run lint
```
