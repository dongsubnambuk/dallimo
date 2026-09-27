# SKILL-STACK

> 출처: `docs/spec/dallimo_master_spec_v1.8_feedback_features.docx` (달리모 통합 개발 명세서 v1.8)
> 옮긴 장: 70, 70.1, 71, 71.1, 96, 103, 104, 105, 108
> 명세서 원문을 그대로 옮겼다. 내용 수정은 명세서를 먼저 고친 뒤 반영한다.

## 70. Claude Code 스킬 조사

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

### 70.1 Expo 공식 스킬 중 본 프로젝트 사용 대상

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

## 71. Claude Code 작업 프로토콜

Claude Code에게 '이 화면 예쁘게 만들어'라고 맡기지 않는다. 레퍼런스 연구 결과와 서비스 원칙을 저장소 문서로 제공하고, 화면별 acceptance criteria와 visual verification을 강제한다.

```text
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
```

### 71.1 Claude Code에게 줄 기본 UI 작업 프롬프트

```text
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
```

## 96. Claude Code 스킬 조합 최종안

| 도구 | 역할 | 사용 원칙 |
|---|---|---|
| Expo official plugin | Expo/Router/native/EAS 최신 구현 기준 | 항상 활성화. 기술 source of truth는 Expo docs/CLI |
| Anthropic frontend-design | 시각 방향을 평범한 AI UI로 회귀하지 않게 유지 | 새 주요 화면/visual polish에 사용 |
| Draftbit mobile-taste-skill | React Native/Expo 모바일 anti-slop, navigation/motion review | 화면 구현 및 audit에 사용 |
| 프로젝트 CLAUDE.md | 본 서비스 고유 UX/디자인 규칙 | 가장 높은 프로젝트 문맥 |
| docs/ui/* | 화면/상태/레퍼런스/QA 계약 | 구현 전에 읽고 완료 후 검증 |

```text
# Claude Code
claude plugin install expo@claude-plugins-official

# Draftbit mobile taste
claude plugin marketplace add draftbit/mobile-taste-skill
claude plugin install mobile-taste-skill

# Anthropic frontend-design:
# Claude Code official plugin marketplace에서 frontend-design 활성화/설치
```

여러 제3자 aesthetic skill을 동시에 추가하지 않는다. Expo official + Anthropic frontend-design + mobile-taste 정도로 제한하고, 최종 의사결정은 프로젝트 문서의 ROUTE SIGNAL 규칙이 우선한다.

## 103. 스킬 충돌 방지 우선순위

```text
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
```

하위 스킬이 ROUTE SIGNAL을 다른 palette/style로 바꾸거나 bottom navigation 구조를 변경하려 하면 적용하지 않는다. 외부 skill의 'best practice'는 프로젝트 요구사항을 대체하지 않는다.

## 104. 화면 구현 전 스킬 적용 파이프라인

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

## 105. 프로젝트 전용 running-ui-orchestrator

외부 스킬을 직접 조합하는 책임을 매번 프롬프트에 맡기지 않고 project-local skill로 고정한다.

```text
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
```

## 108. 적용 원칙

‘최근 스킬을 모두 적용한다’는 의미를 모든 스킬이 매 화면마다 동시에 디자인하도록 해석하지 않는다. 모든 유용한 전문성을 workflow에 포함하되, 각 스킬의 책임을 분리한다. 이 방식이 디자인 일관성과 재현성을 유지하면서도 최신 스킬의 장점을 실제로 활용하는 방법이다.
