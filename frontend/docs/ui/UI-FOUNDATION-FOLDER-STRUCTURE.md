# UI-FOUNDATION-FOLDER-STRUCTURE

> 출처: `docs/spec/dallimo_master_spec_v1.8_feedback_features.docx` (달리모 통합 개발 명세서 v1.8)
> 옮긴 장: 110, 110.1, 118, 118.1, 118.2
> 명세서 원문을 그대로 옮겼다. 내용 수정은 명세서를 먼저 고친 뒤 반영한다.

## 110. UI Foundation 실제 폴더 구조

```text
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
```

### 110.1 구조 원칙

- raw color/font/spacing 값은 feature 화면에서 직접 사용하지 않는다.
- primitive는 시각적 기반만 제공하고, 도메인 의미를 갖는 컴포넌트는 components/features 계층에 둔다.
- MetricBlock이나 RankingRow처럼 러닝 도메인 의미가 강한 컴포넌트를 generic primitive로 만들지 않는다.
- dev playground route는 production build에서 숨기거나 개발 환경에서만 진입 가능하게 한다.
- theme 전환은 light/dark를 위한 것이지만 Active Run의 dark context를 OS dark mode와 동일 개념으로 취급하지 않는다.

## 118. 저장소 및 프로젝트 구조 확정

Git Repository는 하나만 사용하며 frontend와 backend를 명확히 분리한다. 현재 개발 착수 범위는 frontend이며 backend 디렉터리는 이후 Spring Boot 프로젝트 생성 시 추가/초기화한다.

```text
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
```

### 118.1 Repository 원칙

- 하나의 Git repository 안에서 frontend/backend를 분리한다.
- 모바일 전용 Claude Code UI 문서는 우선 frontend 내부에 배치하되, 제품 공통 문서는 root docs에 둔다.
- frontend와 backend는 각각 독립적으로 build/test 가능한 구조를 유지한다.
- frontend의 package manager 설정과 backend의 Gradle/Maven 설정을 root에서 억지로 통합하지 않는다.
- CI는 변경 경로에 따라 frontend/backend job을 분리할 수 있도록 설계한다.

### 118.2 프론트엔드 프로젝트 식별자 초안

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
