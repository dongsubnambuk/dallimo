# 달리모 (DALLIMO) — 저장소 공통 규칙

## 1. 기준 문서

- 마스터 스펙: `docs/spec/dallimo_master_spec_v1.8_feedback_features.docx`
- Claude UI/UX pack 원본: `docs/spec/dallimo_claude_uiux_pack_v1.5_feedback_features.zip`
- frontend UI 규칙: `frontend/CLAUDE.md`, `frontend/docs/ui/`

작업은 위 문서 내용대로 진행한다. 문서에 없는 내용을 임의로 추가하거나 문서를 임의로 수정하지 않는다.

## 2. Git 브랜치 규칙

- 브랜치는 기능별로 나눈다.
- 새 브랜치는 `main`에서 만든다.
- prefix는 아래 다섯 가지를 쓴다.

| prefix | 용도 |
| --- | --- |
| `feat/` | 기능 |
| `refactor/` | 리팩터링 |
| `design/` | 디자인 |
| `fix/` | 수정 |
| `docs/` | 문서만 바뀌는 변경 |

## 3. Pull Request 규칙

- PR 제목과 본문은 한국어로 작성한다.

## 4. 커밋·PR 작성자 규칙

- 커밋, push, PR에 Claude를 기여자로 넣지 않는다.
  - 커밋 작성자는 저장소 소유자 계정으로 한다.
  - 커밋 메시지에 `Co-Authored-By: Claude` 등 Claude 관련 trailer를 넣지 않는다.
  - PR 본문에 Claude Code 생성 문구나 세션 링크를 넣지 않는다.
