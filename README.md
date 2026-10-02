# 달리모 (DALLIMO)

코스를 발견하고, 기록에 도전하고, 장소가 달라도 함께 달릴 수 있는 코스 기반 소셜 러닝 앱입니다.

> 오늘 달릴 코스를 찾고, 같이 달리고, 기록을 깨다.

## 저장소 구조

하나의 Git 저장소에서 프론트엔드와 백엔드를 함께 관리합니다.

```text
dallimo/
├─ frontend/   # React Native + Expo + TypeScript + Expo Router (npm)
├─ backend/    # Spring Boot 예정 (아직 생성하지 않음)
├─ docs/       # 제품/기술 스펙 문서, 서버 성능 측정 결과 (docs/perf/README.md)
├─ landing/    # 소개 사이트 · 약관 · 문의 정적 페이지 (landing/README.md)
├─ promo/      # 인스타그램 릴스 홍보 영상 (promo/README.md)
├─ .gitignore
└─ README.md
```

현재 개발 범위는 `frontend/`입니다.

## Frontend 실행

요구 사항은 Node.js 20 이상과 npm입니다.

```bash
cd frontend
npm install
npm start            # expo start
```

검증 명령:

```bash
npm run typecheck    # tsc --noEmit
npm run lint         # expo lint
npx expo config      # Expo 설정 확인
npx expo-doctor      # 의존성/설정 진단
```

패키지는 `npm install`이 아니라 `npx expo install <package>`로 추가합니다. 그래야 SDK와 호환되는 버전이 설치됩니다.

## 앱 식별자

| 항목 | 값 |
| --- | --- |
| Expo `name` | `DALLIMO` |
| 사용자 노출 이름 | `달리모` |
| `slug` | `dallimo` |
| `scheme` | `dallimo` |
| iOS `bundleIdentifier` | 미정 (소유 조직 확정 후 설정) |
| Android `package` | 미정 (소유 조직 확정 후 설정) |

## 문서

- 마스터 스펙: `docs/spec/dallimo_master_spec_v1.8_feedback_features.docx`
- Claude UI/UX 가이드: `frontend/CLAUDE.md`, `frontend/docs/ui/`
