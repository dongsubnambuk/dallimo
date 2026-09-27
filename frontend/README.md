# 달리모 (DALLIMO) Frontend

React Native + Expo + TypeScript + Expo Router 기반 모바일 앱입니다. 패키지 매니저는 npm입니다.

## 실행

```bash
npm install
npm start
```

## 검증

```bash
npm run typecheck
npm run lint
npx expo config
npx expo-doctor
```

## 구조

```text
frontend/
├─ src/app/            # Expo Router 라우트 (화면/레이아웃만 둔다)
├─ plugins/            # 로컬 config plugin
├─ assets/
├─ docs/ui/            # Claude UI/UX pack 문서
├─ CLAUDE.md           # UI/UX 구현 규칙 (AGENTS.md import 포함)
├─ AGENTS.md           # Expo 템플릿 에이전트 가이드
└─ CLAUDE-*.md         # 단계별 Claude 작업 프롬프트
```

## 앱 이름

- `expo.name`은 `DALLIMO`입니다.
- 홈 화면에 보이는 이름은 `달리모`입니다.
  - iOS: `ios.infoPlist.CFBundleDisplayName`
  - Android: `plugins/with-android-display-name.js`가 `app_name`을 설정

## 다음 단계

UI 작업은 `CLAUDE-UI-PREFLIGHT-PROMPT.md` → `CLAUDE-MASTER-UI-BOOTSTRAP.md` 순서로 진행합니다.
