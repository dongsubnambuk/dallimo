# DALLIMO BRAND CONTEXT

This repository is for **달리모 (DALLIMO)**.
Current implementation scope is `frontend/` first inside a single repository with `backend/` as the backend directory.

Read `docs/ui/BRAND-AND-PROJECT.md` before all other UI work.

# CLAUDE-MASTER-UI-BOOTSTRAP.md

You are preparing the mobile UI foundation for a DALLIMO, a course-based social DALLIMO app.

This is not a request to implement product screens yet.

## Hard rule
Do not implement Explore Home, Course Detail, Active Run, Result, Together, Auth, or My in this task.

The task ends after the Design System Playground and foundation QA are complete.

## PHASE 0 — Skill Preflight
First read:
- `CLAUDE-UI-PREFLIGHT-PROMPT.md`
- `docs/ui/INSTALL-DESIGN-SKILLS.md`
- `docs/ui/SKILL-STACK.md`

Verify that the required plugins/skills are actually recognized.

At minimum:
- Expo official skills
- Anthropic frontend-design
- Draftbit mobile-taste skills
- project running-ui-orchestrator

Use project-local research/audit skills where installed.

If a required skill is unavailable:
- report exactly what is missing,
- follow the documented installation process,
- do not silently skip the preflight.

## PHASE 1 — Read Product UI Contract
Invoke/read `running-ui-orchestrator`.

Read:
- `CLAUDE.md`
- `docs/ui/PRODUCT-UX.md`
- `docs/ui/REFERENCE-MATRIX.md`
- `docs/ui/DESIGN-DIRECTION.md`
- `docs/ui/DESIGN-SYSTEM.md`
- `docs/ui/DESIGN-SYSTEM-PLAYGROUND-SPEC.md`
- `docs/ui/COMPONENT-CONTRACTS.md`
- `docs/ui/UI-FOUNDATION-FOLDER-STRUCTURE.md`
- `docs/ui/INTERACTION-SPECS.md`
- `docs/ui/ACCESSIBILITY.md`
- `docs/ui/VISUAL-QA.md`

The visual direction is already decided:
**ROUTE SIGNAL**

Do not run a new brand/style selection process.

## PHASE 2 — Audit Existing Project
Before creating files:
- inspect package.json
- inspect Expo SDK and React Native versions
- inspect Expo Router setup
- inspect existing theme/components
- inspect installed icon/font/animation packages
- inspect path aliases
- inspect lint/format/typecheck configuration

Do not duplicate existing infrastructure.

Use official Expo skills for version-sensitive decisions.

## PHASE 3 — Create Foundation Structure
Create/adapt:

`src/design/tokens`
`src/design/theme`
`src/design/primitives`
`src/components`

Keep the existing project architecture if it already has an equivalent structure.

Do not create abstraction merely to match the document.

## PHASE 4 — Semantic Tokens
Implement:
- color semantic roles
- typography roles
- spacing
- radius
- motion roles

The raw visual values in the document are candidates, not permanent brand truth.

Never spread raw color values throughout components.

## PHASE 5 — Primitives
Implement only useful foundations:
- AppText
- AppPressable
- AppSurface
- AppDivider
- AppIcon adapter

Requirements:
- accessibility-first
- font scaling
- theme-aware
- minimal abstraction
- no DOM/web assumptions

## PHASE 6 — Core Components
Implement:
- MetricBlock
- CourseCard
- PrimaryRunButton
- GpsStatus
- GapIndicator
- RankingRow
- VerificationBadge
- ParticipantChip
- FilterChip

Follow `COMPONENT-CONTRACTS.md`.

Every component must expose the required states.
Do not implement only the prettiest happy state.

## PHASE 7 — Design System Playground
Create a development-only route/screen.

The Playground must show:
- Light foundations
- Dark active-run foundations
- Typography
- Actions
- Metrics
- Course
- GPS
- Competition
- Ranking
- Verification
- Together states
- stress-test content

It is a QA surface, not a marketing component gallery.

## PHASE 8 — Stress / Accessibility
Test:
- long Korean course name
- long nickname
- 4-digit ranking
- extreme pace/distance values
- font scaling
- disabled controls
- poor GPS
- offline-style warning surfaces
- dark active-run canvas

Use accessibility/audit skills here.

## PHASE 9 — Visual QA
Verify representative iOS and Android sizes.

Use simulator/device screenshots if the environment supports them.

Inspect:
- text clipping
- safe area
- Android insets
- over-rounded surfaces
- AI-generated card-stack look
- contrast
- token drift
- long Korean text
- dark metric readability

## PHASE 10 — Review
Run:
- mobile design review
- heuristic/accessibility review

Resolve high-impact issues.

## PHASE 11 — Completion Report
Report:
1. skills used
2. project structure discovered
3. files created/changed
4. token decisions
5. components implemented
6. all implemented states
7. accessibility findings
8. iOS/Android QA findings
9. performance risks
10. values still intentionally not finalized

## STOP CONDITION
Stop after the UI foundation is complete.

Do not continue into Explore Home without a separate instruction.
