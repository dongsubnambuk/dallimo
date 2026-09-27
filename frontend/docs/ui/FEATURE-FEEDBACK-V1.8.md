# DALLIMO Feature Feedback v1.8

## Scope
This document converts user feedback into product constraints. Do not implement these features before their roadmap stage unless explicitly requested.

## 1. External activity import
Supported source model:
- DALLIMO
- APPLE_HEALTH
- HEALTH_CONNECT
- GARMIN
- COROS
- GPX_IMPORT

Pipeline:
`Provider -> Adapter -> Normalize -> Duplicate Check -> Run -> Course Match -> Verification -> CourseRecord eligibility`

Rules:
- Imported activity is always a `Run` first.
- Never create an official `CourseRecord` only because an activity was imported.
- Keep source badge and verification state visible.
- 1.5 target: Apple Health and Health Connect.
- Garmin/COROS are later provider adapters; do not hard-code the app architecture to one vendor.

## 2. Training / interval
User-facing Run IA:
- FREE
- COURSE
- TRAINING
- TOGETHER

Training supports:
- WARMUP / WORK / RECOVERY / COOLDOWN
- DISTANCE / TIME / MANUAL end conditions
- target time / target pace
- Repeat Group

Example:
- Warmup 1km
- Repeat x5
  - Work 400m / target 1:30
  - Recovery 200m / max 1:30
- Cooldown 1km

Active training UI must be glanceable and support audio/haptic step transitions.

## 3. Gamification
Core-compatible:
- Ghost / Pace Chase
- Segment Attack
- Course Crown
- Local Legend
- Route Conquest (later)

Seasonal only:
- Zombie/GPS mission modes

Never turn Explore into a game dashboard. The course remains the main playable object.
Never expose another participant's exact live GPS position by default.
