# UI Responsive & Interaction Remediation Design

## Overview

This design covers a full UI pass for the `frontend` app to fix screen adaptation and click/touch failures while keeping existing SSH business behavior unchanged.

Goal: make desktop/tablet/mobile layouts stable, all primary interactions clickable, and verified by repeatable viewport tests.

## Scope

### In scope
- Responsive layout behavior across desktop/tablet/mobile breakpoints
- Mobile bottom navigation, overlay, sidebar, and quick-commands panel interaction fixes
- Touch/click hit-area and stacking-context fixes (`z-index`, `pointer-events`, fixed layers)
- Regression testing for key interaction flows

### Out of scope
- SSH protocol/backend behavior changes
- New feature additions beyond responsiveness and interaction reliability
- Visual redesign/theme overhaul

## Current Issues Observed

1. Mobile overlay and side panels use fixed positioning with bottom-nav offsets, which can create blocked click zones.
2. Header/main/panel layers use mixed stacking expectations, increasing risk of invisible interception.
3. `100vh` + fixed elements may produce unstable effective heights on mobile browser UI collapse/expand.
4. Interactions rely on class toggles spread across components; state is correct but UX can fail when layers overlap.

## Design Approach

### Approach A (recommended): Minimal-risk structural hardening
- Keep current component architecture
- Normalize mobile layer model and viewport sizing
- Repair interaction hit-testing and panel transitions
- Add targeted E2E viewport checks for critical click paths

**Pros**: smallest blast radius, fast validation, no large refactor
**Cons**: still class/CSS heavy, not a full responsive-system rewrite

### Approach B: Unified responsive shell refactor
- Introduce a dedicated layout shell component handling breakpoints/state
- Move panel/nav/overlay logic into one place

**Pros**: cleaner long-term architecture
**Cons**: larger change set and higher regression risk now

### Approach C: CSS-only patching
- Only patch z-index and media-query values

**Pros**: fastest
**Cons**: fragile, likely to miss interaction-edge bugs

## Recommended Architecture

Use **Approach A** with 4 focused workstreams.

### 1) Layering model normalization
- Define deterministic z-index tiers:
  - `mobile-nav` base top layer for bottom controls
  - `overlay` below active slide panels, above app content
  - `sidebar/quick-commands` above content and overlay target behavior
  - modals above everything
- Ensure no transparent full-screen element can intercept terminal or nav clicks unexpectedly.

### 2) Mobile viewport stability
- Replace unstable full-height assumptions with dynamic viewport-safe sizing (`dvh` with fallback).
- Ensure panel heights account for header and mobile-nav without producing hidden/unreachable regions.

### 3) Interaction state consistency
- Preserve existing mutual exclusion behavior (open one panel closes the other).
- Guarantee overlay click always closes transient mobile panels.
- Keep terminal area interactive when panels are closed.

### 4) Component-level responsive adjustments
- `Header`: prevent right-action overflow and preserve tappable controls.
- `ConnectionSidebar` and `QuickCommandsPanel`: keep slide-in behavior but ensure touchable content and scroll.
- `TerminalContainer` area: preserve available space under all breakpoints.

## Data Flow / State Changes

No backend or persistence schema changes.
Frontend state remains in `App.tsx` (`mobileSidebarOpen`, `mobileQuickCommandsOpen`) with CSS behavior made deterministic.

## Error Handling

- UI actions must fail gracefully: no JS errors on rapid toggles.
- If transitions are interrupted, final state must remain consistent with store/component state.

## Testing Strategy

### Automated checks
1. `rtk lint`
2. `rtk tsc`
3. `rtk pnpm build`

### Interaction regression (Playwright/devtools)
For each viewport:
- Mobile: `360x800`
- Tablet: `768x1024`
- Desktop: `1366x768`

Validate:
1. Bottom nav buttons are always clickable.
2. Sidebar open/close works; overlay closes it.
3. Quick commands panel open/close works; overlay closes it.
4. Sidebar and quick commands never open simultaneously.
5. Header buttons remain clickable.
6. Terminal region remains interactable when panels close.
7. Connection form/settings modal is clickable and not blocked.

## Implementation Plan (high-level)

1. Adjust responsive CSS (layering, viewport units, panel geometry).
2. Apply minimal TSX updates only where interaction semantics require it.
3. Run lint/type/build checks.
4. Run viewport interaction tests and fix regressions.
5. Deliver final diff + test evidence.

## Acceptance Criteria

- All listed interaction regression checks pass on mobile/tablet/desktop.
- No blocked-click zones in main user flows.
- Frontend lint/type/build pass.
- No backend behavior changes introduced.
