# INSTALL-DESIGN-SKILLS

> 출처: `docs/spec/dallimo_master_spec_v1.8_feedback_features.docx` (달리모 통합 개발 명세서 v1.8)
> 옮긴 장: 70.2, 100, 100.1, 101, 101.1, 101.2, 101.3, 102, 102.1, 102.2, 102.3, 106, 107
> 명세서 원문을 그대로 옮겼다. 내용 수정은 명세서를 먼저 고친 뒤 반영한다.

### 70.2 설치 순서

```text
# 1. Expo official plugin
claude plugin install expo@claude-plugins-official

# 2. Anthropic frontend-design 사용 가능 여부 확인
# Claude Code의 official plugin/skill 환경에서 활성화

# 3. 제3자 skill은 저장소 내용을 읽은 뒤 프로젝트 .claude/skills 또는 plugin 방식으로 선택 설치
# 무조건 여러 종합 UI skill을 동시에 켜지 않는다.
```

UI 취향을 결정하는 스킬을 여러 개 동시에 활성화하면 서로 다른 디자인 규칙이 충돌할 수 있다. 본 프로젝트는 Expo official skills를 기술 기준으로 두고, 시각 품질 보조는 1개, accessibility/token audit는 목적별로 추가하는 방식을 권장한다.

## 100. Claude Code 디자인 스킬 스택 및 설치 게이트 v1.5

화면 구현 전에 Claude Code의 UI/UX 관련 스킬을 먼저 준비한다. 단, 외부 스킬을 단순히 많이 설치하는 것이 목적은 아니다. 각 스킬의 책임을 분리하고 프로젝트 고유 문서를 최상위 기준으로 두어, 자동 호출되는 여러 스킬이 디자인 방향을 서로 덮어쓰지 않도록 한다.

### 100.1 사전 설치 게이트

Claude Code는 아래 Preflight를 통과하기 전 React Native 화면 구현을 시작하지 않는다.

1. Claude Code에서 설치/활성화된 플러그인과 project-local skills를 확인한다.
1. Expo 공식 plugin을 설치한다.
1. Anthropic 공식 frontend-design plugin을 설치/활성화한다.
1. React Native/Expo 전용 mobile-taste-skill을 설치한다.
1. UX Research/IA/Design Review용 claude-design-skills 컬렉션을 project-local로 설치한다.
1. 전문 감사용 ui-skills, ui-design, ux-designer 계열은 SKILL.md를 검토한 뒤 project-local로 설치한다.
1. 본 프로젝트의 running-ui-orchestrator skill을 활성화한다.
1. 설치 후 Claude Code를 재시작하고 /skills 또는 plugin 목록에서 인식 여부를 확인한다.
1. 그 후 DESIGN-DIRECTION.md와 프로젝트 문서를 읽고 Design System Playground부터 시작한다.

## 101. 필수 스킬 - Tier 0/1

| Skill/Plugin | 유형 | 역할 | 적용 |
|---|---|---|---|
| Expo official skills | Official plugin | Expo/React Native/Router/UI/EAS/version-sensitive implementation | 항상 |
| frontend-design | Anthropic official | generic AI aesthetic 억제, 명확한 시각 방향/타이포/레이아웃 | 주요 화면 시각 설계 |
| mobile-taste-skill | Draftbit | React Native/Expo native UI, navigation, motion, anti-slop | 항상 |
| running-ui-orchestrator | Project custom skill | 모든 스킬의 우선순위/문서/검증 단계를 통제 | 모든 UI 작업 |

### 101.1 Expo official

Expo 팀은 Claude Code용 공식 plugin을 제공하며 최신 Expo/React Native 제약을 적용하는 스킬과 Expo MCP 구성을 함께 제공한다. 기술 구현과 버전 호환성에 대해서는 프로젝트의 미적 스킬보다 Expo 공식 지침을 우선한다.

```text
# Claude Code 내부
/plugin install expo@claude-plugins-official

# 또는 shell
claude plugin install expo@claude-plugins-official
```

### 101.2 Anthropic frontend-design

Anthropic 공식 frontend-design은 템플릿처럼 보이는 AI UI를 피하고, 제품 맥락에 맞는 의도적인 palette, typography, layout, motion 결정을 요구한다. 단, 웹 중심 일반 가이드가 React Native의 네비게이션/네이티브 제약보다 우선하지 않도록 mobile-taste 및 Expo 규칙 아래에서 사용한다.

```text
# Claude Code 내부
/plugin install frontend-design@claude-plugins-official
```

### 101.3 Draftbit mobile-taste-skill

React Native/Expo에 특화된 디자인 스킬 모음이다. 신규 화면뿐 아니라 네비게이션 계획, 모바일 디자인 시스템, 디자인 리뷰, 단일 화면/앱 전체 리디자인 흐름을 분리해서 제공한다.

| Skill | 책임 |
|---|---|
| mobile-nav-plan | Expo Router route tree, tabs, modal/sheet, deep link, Android back |
| mobile-design-system | token/theme + MOBILE-DESIGN.md |
| mobile-taste | 새로운 모바일 screen/feature 구현 |
| mobile-design-review | Design Score/AI Slop Score 기반 audit |
| mobile-redesign-screen | 단일 화면 audit-first redesign |
| mobile-redesign-app | 전체 앱 phase 기반 redesign |

```text
claude plugin marketplace add draftbit/mobile-taste-skill
claude plugin install mobile-taste-skill
```

## 102. 최근/전문 디자인 스킬 - Tier 2

아래 스킬들은 최근 Claude Code 디자인 워크플로를 더 세분화한다. 모두 설치하더라도 자동으로 서로의 결정을 덮어쓰게 두지 않고, 오케스트레이터가 필요한 단계에서만 호출한다.

| Repository | Author | 강점 | 프로젝트 사용 |
|---|---|---|---|
| claude-design-skills | richhemsley3 | 18개 UX/UI skills: research, IA, journey, wireframe, critique, accessibility, component gap, design-pipeline | Research/IA/Review pipeline |
| ui-skills | dawitlabs | ui-init, design-grill, uiux, uicolor, animate, copy, a11y, tokens | 전문 audit 단계 |
| ui-design-skill | charlomrt-boop | INIT/BUILD/REVIEW/EXTEND/MIGRATE, UX rules, contrast, 2026 trend reference | 디자인 시스템/최종 review |
| ux-designer-skill | szilu | WCAG 2.2, Laws of UX, mobile-first, navigation, microcopy, multiplayer/canvas UX | UX heuristic/accessibility reference |
| design-skill | Vdebug | UI/UX, typography, color, motion, layout, anti-slop를 묶은 meta skill | 보조적인 cross-check; 최종 결정권 없음 |

### 102.1 claude-design-skills 18-skill pipeline

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
```text
# project-local 설치 권장
git clone https://github.com/richhemsley3/claude-design-skills.git .claude/vendor/claude-design-skills
mkdir -p .claude/skills
cp -R .claude/vendor/claude-design-skills/skills/* .claude/skills/
```

### 102.2 dawitlabs/ui-skills

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

### 102.3 ui-design-skill / ux-designer-skill

ui-design-skill의 structured mode와 contrast/review 규칙, ux-designer-skill의 WCAG 2.2와 Laws of UX 자료는 구현 결과를 점검하는 감사 계층으로 사용한다. 디자인 방향을 새로 선택하는 INIT 기능은 ROUTE SIGNAL 확정 이후에는 사용하지 않는다.

## 106. Claude Code Preflight Prompt

```text
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
```

## 107. 업데이트/핀 전략

- Expo 공식 plugin은 공식 marketplace 업데이트를 사용한다.
- Anthropic 공식 plugin도 official marketplace 상태를 기준으로 관리한다.
- 제3자 skill은 project-local vendor 폴더 또는 고정 commit으로 설치해 재현성을 유지한다.
- 무조건 latest를 CI에서 자동 pull하지 않는다. UI 규칙 변경이 코드 전체를 흔들 수 있기 때문이다.
- 업데이트 시 CHANGELOG/SKILL.md diff를 검토하고 running-ui-orchestrator와 충돌 여부를 확인한다.
- README에 설치 시점 commit/hash를 기록한다.
