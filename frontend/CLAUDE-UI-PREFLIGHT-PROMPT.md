# CLAUDE-UI-PREFLIGHT-PROMPT.md

Before implementing any screen, perform the UI skill preflight.

1. Read `CLAUDE.md`, `docs/ui/INSTALL-DESIGN-SKILLS.md`, and `docs/ui/SKILL-STACK.md`.
2. Inspect currently available Claude Code plugins and skills.
3. Confirm these are available:
   - Expo official skills
   - frontend-design
   - Draftbit mobile-taste skills
   - claude-design-skills
   - ui-skills specialists
   - ui-design review skill
   - ux-designer skill
   - running-ui-orchestrator
4. If any third-party skill is missing, inspect its SKILL.md/installation files before installing and prefer project-local installation.
5. Restart/reload Claude Code if required and verify skills again.
6. Invoke running-ui-orchestrator and read all `docs/ui` files.
7. Do not implement Explore, Course Detail, Active Run, or any product screen until preflight is complete.
8. First implementation after preflight: Design System Playground, then Explore Home.

The final visual direction is ROUTE SIGNAL. External skills may refine execution, but may not replace the product's visual identity, navigation architecture, or information hierarchy.
