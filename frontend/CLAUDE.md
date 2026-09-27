# PRODUCT BRAND — FIXED

Product name:
- Korean: **달리모**
- English: **DALLIMO**

Repository model:
- single repository
- `frontend/`
- `backend/`
- current scope: frontend first

Read `docs/ui/BRAND-AND-PROJECT.md`.

Do not rename or respell the product.

# UI FOUNDATION BOOTSTRAP

For a new UI implementation session, first execute:
`CLAUDE-MASTER-UI-BOOTSTRAP.md`

Product screens must not be implemented before the Design System Playground foundation gate is complete.

# CLAUDE.md — Mobile UI/UX Implementation Rules

## 1. Required Reading
Before modifying any mobile UI, read these files in order:

1. `docs/ui/PRODUCT-UX.md`
2. `docs/ui/REFERENCE-MATRIX.md`
3. `docs/ui/DESIGN-SYSTEM.md`
4. `docs/ui/DESIGN-DIRECTION.md`
5. `docs/ui/SCREEN-SPECS.md`
6. `docs/ui/INTERACTION-SPECS.md`
7. `docs/ui/ACCESSIBILITY.md`
8. `docs/ui/VISUAL-QA.md`

Do not implement a screen from memory or from generic mobile UI conventions alone.

## 2. Product Definition
This is a DALLIMO, a course-based social running platform.

The central product loop is:

`DISCOVER → COURSE DETAIL → PICK PLAY MODE → RUN → VERIFIED RESULT → RANK / SHARE / REMATCH`

The app is not:
- an Instagram-like running feed,
- a training-plan-first coach,
- a generic map tracker,
- a game with running attached,
- a dashboard full of unrelated health metrics.

The route/course is the central object.
Running, competition, sharing, and social actions should connect back to a course or a running activity.

## 3. Product Priorities
When priorities conflict, use this order:

1. Functional correctness
2. Running safety and glanceability
3. Information hierarchy
4. Consistency with the design system
5. Performance
6. Accessibility
7. Visual polish
8. Decorative motion

Never trade away legibility or running-state clarity for aesthetics.

## 4. Reference Usage
Reference apps are pattern sources, not templates.

Never copy an entire screen from a reference app.

Extract:
- information hierarchy,
- interaction pattern,
- task flow,
- state model,
- feedback pattern.

Then rebuild it for this product.

Primary reference blends:
- Explore: Strava + AllTrails + Runnect
- Course Detail: AllTrails + Komoot + Strava Segment
- Run Ready: Nike Run Club + Runkeeper
- PB / Rival: GhostRunner + Strava
- Ranking: Strava + RUNPLE + Routiniest
- Together: Zwift + Runky
- Voice feedback: RunDay + Nike Run Club
- Result: Strava + Runna
- Sharing: Relive + dedicated workout-share-card patterns

## 5. Design Anti-Patterns
Do not default to:
- giant greeting headers,
- generic white card stacks,
- excessive gradients,
- glassmorphism,
- floating buttons everywhere,
- arbitrary shadows,
- identical card radii on every component,
- large empty hero areas that push actual content below the fold,
- excessive icon-only controls without labels,
- dense analytics during active running.

Do not add a new visual token because "it looks better".
Check the existing semantic tokens first.

## 6. Active Run Rules
Active running screens are a separate UX class.

They must:
- be readable with a one-second glance,
- prioritize 2–4 primary metrics,
- use large numeric typography,
- minimize interaction,
- avoid tiny secondary labels,
- keep map overlays minimal,
- communicate poor GPS / offline / route deviation clearly,
- support voice or haptic feedback for important state changes,
- avoid exposing other participants' precise location in remote Together modes.

The active run shell should be shared across modes.
Mode-specific panels must be modular.

Supported run modes:
- FREE
- COURSE
- PB
- CHALLENGE
- LIVE_RACE
- TIME_ATTACK
- TOGETHER

## 7. State Completeness
No screen is complete if only the success state exists.

Implement relevant states:
- loading
- empty
- error
- offline
- permission denied
- partial sync
- stale data
- disabled
- reconnecting
- verification pending
- unverified
- local-only

Check `SCREEN-SPECS.md` for the required states by screen.

## 8. Maps
Maps are working surfaces, not backgrounds.

Rules:
- map gestures must not conflict with floating UI,
- keep overlay count low,
- route, actual path, and target path must be visually distinguishable,
- do not rely on color alone,
- use viewport-aware rendering,
- do not render thousands of route points without simplification,
- do not cover important map content with oversized bottom sheets by default.

## 9. Performance
Avoid unnecessary re-renders in:
- Active Run
- Live Together
- Ranking lists
- Map screens

Use:
- memoization only where measured/justified,
- virtualized lists for long result sets,
- simplified display polylines for dense routes,
- stable callbacks and isolated state for high-frequency metrics,
- UI-thread animation when appropriate.

Do not optimize blindly. Measure on real devices.

## 10. Accessibility
Every relevant implementation must handle:
- Dynamic Type / font scaling,
- screen-reader labels,
- non-color-only status differentiation,
- touch target size,
- Korean text overflow,
- high-contrast outdoor readability,
- safe area,
- Android navigation insets,
- reduced motion where applicable.

## 11. Visual QA Requirement
After completing a screen:
1. Run it on representative iOS and Android viewport sizes.
2. Capture screenshots.
3. Check all required UI states.
4. Check Korean long strings.
5. Check text scaling.
6. Check map overlays.
7. Check safe area and keyboard.
8. Fix issues before marking the task complete.

A task is not complete because the component compiles.

## 12. Implementation Order
Build in this order unless an issue explicitly requires otherwise:

1. Design System Playground
2. Explore Home
3. Course Detail
4. Play Mode Selector
5. Run Ready
6. Active Run — FREE
7. Active Run — COURSE / PB / CHALLENGE
8. Result
9. Ranking
10. Together Lobby
11. Together Live
12. My / History
13. Auth / Onboarding / Settings

## 13. Change Discipline
When a task requires a new reusable UI pattern:
- first check existing tokens/components,
- document the reason if introducing a new primitive,
- update `DESIGN-SYSTEM.md` if the primitive becomes part of the system,
- avoid one-off styling that duplicates an existing pattern.

## 14. Output Expectations
For every major screen implementation, report:
- files changed,
- reused components,
- new components,
- states implemented,
- performance-sensitive areas,
- accessibility checks,
- unresolved UX decisions.

Do not claim a screen is production-ready without completing the QA checklist.

## Feature feedback v1.8
Before implementing health import, training, or gamification, read:
- `docs/ui/FEATURE-FEEDBACK-V1.8.md`
- `docs/ui/EXTERNAL-ACTIVITY-INTEGRATION.md`
- `docs/ui/INTERVAL-TRAINING-SPEC.md`
- `docs/ui/GAMIFICATION-SPEC.md`

Do not move roadmap-later features into the current UI Foundation scope.

# Expo Agent Guidance (create-expo-app template)

Expo SDK 버전별 규칙과 명령은 아래 파일을 따른다.

@AGENTS.md
