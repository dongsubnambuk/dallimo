# CLAUDE-VISUAL-IMPLEMENTATION-PROMPT.md

Implement the first visual pass of the mobile app.

Read all project UI documents before touching code.
The final visual direction is ROUTE SIGNAL.

Use available Expo official skills for technical implementation.
Use frontend-design/mobile-taste guidance only where it does not conflict with this project's design documents.

## Phase 1 — Design System Playground

Build a development-only playground screen that renders:
- color roles in light/dark context
- typography roles
- MetricBlock
- CourseCard
- PrimaryRunButton
- PlayModeCard
- GpsStatus
- GapIndicator
- RankingRow
- ParticipantChip
- VerificationBadge
- FilterChip

Render:
- normal
- long Korean text
- disabled
- loading where relevant
- warning/error states

Do not implement a giant component gallery full of decorative cards.
The playground is a QA tool.

## Phase 2 — Explore Home

Create the Explore screen according to SCREEN-SPECS.md and DESIGN-DIRECTION.md.

Visual structure:
- search/control overlay
- map as primary workspace
- quick filters
- course result surface/list
- selected course must map to route highlight

If real map SDK integration is not ready:
- preserve the Map adapter/component boundary
- create a functional placeholder surface that mimics map geometry
- do not use a static marketing image
- do not hardcode the final layout around a fake image

Implement:
- loading
- location denied
- no results
- selected course
- network error
- normal state

## Phase 3 — Verification

Capture screenshots for:
- small iPhone
- standard iPhone
- standard Android

Review against VISUAL-QA.md.

Explicitly inspect:
- Does it look like a generic AI health dashboard?
- Is the map still the working surface?
- Are course cards too dominant?
- Is the signal accent overused?
- Does long Korean copy break?
- Do controls obscure map gestures?
- Is the screen visually recognizable as part of ROUTE SIGNAL?

Fix issues before reporting completion.

Do not proceed to Course Detail until this pass is reviewed.
