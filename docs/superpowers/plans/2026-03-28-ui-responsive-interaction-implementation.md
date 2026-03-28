# UI Responsive & Interaction Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make mobile/tablet/desktop UI interactions reliably clickable with deterministic layering and viewport sizing, without changing SSH business behavior.

**Architecture:** Keep the current `App.tsx` state model and component boundaries, then harden CSS/interaction semantics in-place. Drive changes with Playwright viewport regression tests first, then implement minimal TSX/CSS updates until tests pass across all target breakpoints.

**Tech Stack:** React 19 + TypeScript + Vite + Zustand + CSS + Playwright (@playwright/test)

---

## File Responsibility Map

- `frontend/src/App.tsx` — mobile overlay/nav interaction semantics and deterministic open/close behavior.
- `frontend/src/App.css` — global viewport container behavior and app-shell height stability.
- `frontend/src/responsive.css` — breakpoint-specific layer model (`z-index`, panel geometry, overlay/nav hit-testing).
- `frontend/src/components/Header.css` — mobile header control spacing and touch target reliability.
- `frontend/src/components/ConnectionSidebar.css` — mobile sidebar scroll/hit behavior and slide-in geometry.
- `frontend/src/components/QuickCommandsPanel.css` — mobile quick panel slide-in geometry and touch stability.
- `frontend/src/components/Terminal.css` — terminal interaction region sizing/overflow safety under breakpoints.
- `frontend/playwright.config.ts` — Playwright runtime + base URL.
- `frontend/e2e/responsive-interactions.spec.ts` — viewport interaction regression suite.
- `frontend/package.json` — test scripts.

---

### Task 1: Add E2E Infrastructure for Viewport Interaction Regression

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/playwright.config.ts`
- Create: `frontend/e2e/responsive-interactions.spec.ts`

- [ ] **Step 1: Add Playwright dev dependency and scripts**

```bash
rtk pnpm --dir frontend add -D @playwright/test
```

Update `frontend/package.json` scripts section to include:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "test:e2e": "playwright test",
    "test:e2e:headed": "playwright test --headed"
  }
}
```

- [ ] **Step 2: Create Playwright config**

Create `frontend/playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: 1,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'rtk pnpm --dir frontend preview --host 127.0.0.1 --port 4173',
    port: 4173,
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 5'], viewport: { width: 360, height: 800 } } },
    { name: 'tablet', use: { ...devices['iPad (gen 7)'], viewport: { width: 768, height: 1024 } } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 768 } } },
  ],
});
```

- [ ] **Step 3: Add first failing regression spec skeleton**

Create `frontend/e2e/responsive-interactions.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('mobile nav buttons are clickable and toggle panels', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Mobile-only assertion');

  await page.goto('/');

  const connectionBtn = page.getByRole('button', { name: /Connections|连接/i });
  const commandsBtn = page.getByRole('button', { name: /Commands|命令/i });

  await expect(connectionBtn).toBeVisible();
  await expect(commandsBtn).toBeVisible();

  await connectionBtn.click();
  await expect(page.locator('.sidebar.mobile-open')).toBeVisible();

  await commandsBtn.click();
  await expect(page.locator('.quick-commands-panel.mobile-open')).toBeVisible();
  await expect(page.locator('.sidebar.mobile-open')).toHaveCount(0);
});
```

- [ ] **Step 4: Run E2E to confirm at least one failure before UI fixes**

Run:

```bash
rtk pnpm --dir frontend test:e2e
```

Expected: at least one FAIL in interaction assertions (current known click/layer instability).

- [ ] **Step 5: Commit infrastructure and failing test baseline**

```bash
rtk git add frontend/package.json frontend/pnpm-lock.yaml frontend/playwright.config.ts frontend/e2e/responsive-interactions.spec.ts
rtk git commit -m "test(ui): add viewport interaction e2e baseline"
```

---

### Task 2: Lock Down Mobile Layering Model in `responsive.css`

**Files:**
- Modify: `frontend/src/responsive.css`

- [ ] **Step 1: Write deterministic z-index tier constants via CSS custom properties**

Add near top of `frontend/src/responsive.css`:

```css
:root {
  --z-content: 1;
  --z-overlay: 40;
  --z-mobile-nav: 50;
  --z-mobile-panel: 60;
  --z-modal: 1000;
  --mobile-nav-height: 56px;
}
```

- [ ] **Step 2: Replace unstable mobile fixed geometry with dvh + fallback**

In mobile media block, update sidebar/panel/overlay geometry:

```css
@media (max-width: 767px) {
  .sidebar {
    position: fixed;
    left: -100%;
    top: 0;
    bottom: var(--mobile-nav-height);
    height: calc(100vh - var(--mobile-nav-height));
    height: calc(100dvh - var(--mobile-nav-height));
    z-index: var(--z-mobile-panel);
    width: 280px !important;
    transition: left 0.3s ease;
  }

  .quick-commands-panel {
    position: fixed;
    right: -260px;
    top: 0;
    bottom: var(--mobile-nav-height);
    height: calc(100vh - var(--mobile-nav-height));
    height: calc(100dvh - var(--mobile-nav-height));
    z-index: var(--z-mobile-panel);
    width: 260px !important;
    transition: right 0.3s ease;
  }

  .mobile-overlay {
    display: block;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: var(--mobile-nav-height);
    background: rgba(0, 0, 0, 0.5);
    z-index: var(--z-overlay);
    pointer-events: auto;
  }
}
```

- [ ] **Step 3: Ensure mobile nav always wins bottom hit-testing**

Update `.mobile-nav` base block:

```css
.mobile-nav {
  display: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: var(--mobile-nav-height);
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-color);
  padding: 0 16px;
  z-index: var(--z-mobile-nav);
  justify-content: space-around;
  align-items: center;
}
```

- [ ] **Step 4: Re-run failing test to verify partial improvement**

Run:

```bash
rtk pnpm --dir frontend test:e2e --project mobile
```

Expected: fewer failures, but still possible assertion gaps before TSX semantics adjustments.

- [ ] **Step 5: Commit layering hardening**

```bash
rtk git add frontend/src/responsive.css
rtk git commit -m "fix(ui): normalize mobile layer stacking and viewport sizing"
```

---

### Task 3: Make Overlay and Panel State Semantics Explicit in `App.tsx`

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Add deterministic interaction hooks for testability and accessibility**

Update overlay and nav buttons in `frontend/src/App.tsx`:

```tsx
{(mobileSidebarOpen || mobileQuickCommandsOpen) && (
  <div
    className="mobile-overlay"
    onClick={handleOverlayClick}
    role="button"
    aria-label="Close mobile panels"
    data-testid="mobile-overlay"
  />
)}
```

```tsx
<button
  className={`mobile-nav-btn ${mobileSidebarOpen ? 'active' : ''}`}
  onClick={() => {
    setMobileSidebarOpen(!mobileSidebarOpen);
    setMobileQuickCommandsOpen(false);
  }}
  aria-label={language === 'zh' ? '连接' : 'Connections'}
  data-testid="mobile-nav-connections"
>
```

```tsx
<button
  className={`mobile-nav-btn ${mobileQuickCommandsOpen ? 'active' : ''}`}
  onClick={() => {
    setMobileQuickCommandsOpen(!mobileQuickCommandsOpen);
    setMobileSidebarOpen(false);
  }}
  aria-label={language === 'zh' ? '命令' : 'Commands'}
  data-testid="mobile-nav-commands"
>
```

- [ ] **Step 2: Extend E2E test to validate overlay close behavior**

Append to `frontend/e2e/responsive-interactions.spec.ts` mobile test:

```ts
const overlay = page.getByTestId('mobile-overlay');
await expect(overlay).toBeVisible();
await overlay.click();
await expect(page.locator('.sidebar.mobile-open')).toHaveCount(0);
await expect(page.locator('.quick-commands-panel.mobile-open')).toHaveCount(0);
```

- [ ] **Step 3: Run mobile regression test**

Run:

```bash
rtk pnpm --dir frontend test:e2e --project mobile
```

Expected: PASS for overlay close + panel mutual exclusion checks.

- [ ] **Step 4: Commit App.tsx semantic hardening**

```bash
rtk git add frontend/src/App.tsx frontend/e2e/responsive-interactions.spec.ts
rtk git commit -m "fix(ui): enforce mobile overlay and nav interaction semantics"
```

---

### Task 4: Stabilize Shell Height and Header Touch Reliability

**Files:**
- Modify: `frontend/src/App.css`
- Modify: `frontend/src/components/Header.css`

- [ ] **Step 1: Replace fragile app-shell `100vh` with dvh-aware shell sizing**

Update `frontend/src/App.css`:

```css
.app {
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.main {
  flex: 1;
  min-height: 0;
  display: flex;
  overflow: hidden;
}

.main-content {
  flex: 1;
  min-width: 0;
  min-height: 0;
}
```

- [ ] **Step 2: Ensure mobile header controls remain tappable and non-overlapping**

Update `frontend/src/components/Header.css` mobile section:

```css
@media (max-width: 767px) {
  .header {
    padding: 0 12px;
    gap: 8px;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }

  .header-btn {
    min-width: 32px;
    min-height: 32px;
  }
}
```

- [ ] **Step 3: Add/extend E2E assertion for header clickability**

Add test in `frontend/e2e/responsive-interactions.spec.ts`:

```ts
test('header controls stay clickable across viewports', async ({ page }) => {
  await page.goto('/');
  const settingsBtn = page.getByRole('button', { name: /settings|设置/i });
  await expect(settingsBtn).toBeVisible();
  await settingsBtn.click();
  await expect(page.locator('.modal-overlay')).toBeVisible();
});
```

- [ ] **Step 4: Run targeted test for header behavior**

Run:

```bash
rtk pnpm --dir frontend test:e2e -g "header controls stay clickable across viewports"
```

Expected: PASS on mobile/tablet/desktop.

- [ ] **Step 5: Commit shell/header stability changes**

```bash
rtk git add frontend/src/App.css frontend/src/components/Header.css frontend/e2e/responsive-interactions.spec.ts
rtk git commit -m "fix(ui): stabilize shell height and header touch targets"
```

---

### Task 5: Ensure Sidebar/Quick Panel/Terminal Interaction Surface Remains Reachable

**Files:**
- Modify: `frontend/src/components/ConnectionSidebar.css`
- Modify: `frontend/src/components/QuickCommandsPanel.css`
- Modify: `frontend/src/components/Terminal.css`

- [ ] **Step 1: Harden mobile panel internal scrolling and touch behavior**

Update `frontend/src/components/ConnectionSidebar.css` and `frontend/src/components/QuickCommandsPanel.css` with:

```css
.sidebar,
.quick-commands-panel {
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}

.sidebar.mobile-open,
.quick-commands-panel.mobile-open {
  pointer-events: auto;
}
```

- [ ] **Step 2: Protect terminal interaction area geometry after panel close**

Update `frontend/src/components/Terminal.css`:

```css
.terminal-container {
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
}

.terminal-wrapper {
  height: 100%;
  min-height: 0;
}
```

- [ ] **Step 3: Add E2E assertions for terminal interactability after panel close**

Append to mobile test in `frontend/e2e/responsive-interactions.spec.ts`:

```ts
await page.getByTestId('mobile-nav-connections').click();
await page.getByTestId('mobile-overlay').click();
const terminalRegion = page.locator('.terminal-container');
await expect(terminalRegion).toBeVisible();
await terminalRegion.click({ position: { x: 20, y: 20 } });
```

- [ ] **Step 4: Run mobile regression test again**

Run:

```bash
rtk pnpm --dir frontend test:e2e --project mobile -g "mobile nav buttons are clickable"
```

Expected: PASS with no blocked-click zone regressions.

- [ ] **Step 5: Commit panel/terminal interaction fixes**

```bash
rtk git add frontend/src/components/ConnectionSidebar.css frontend/src/components/QuickCommandsPanel.css frontend/src/components/Terminal.css frontend/e2e/responsive-interactions.spec.ts
rtk git commit -m "fix(ui): preserve panel scroll and terminal interaction reachability"
```

---

### Task 6: Validate Full Quality Gate and Capture Evidence

**Files:**
- Modify (if needed during fixes): `frontend/src/**/*.tsx`, `frontend/src/**/*.css`

- [ ] **Step 1: Run lint/type/build quality checks**

Run:

```bash
rtk lint
rtk tsc
rtk pnpm --dir frontend build
```

Expected: all PASS.

- [ ] **Step 2: Run full viewport interaction regression suite**

Run:

```bash
rtk pnpm --dir frontend test:e2e
```

Expected: PASS on `mobile`, `tablet`, `desktop` projects.

- [ ] **Step 3: Generate quick artifact list for review**

Run:

```bash
rtk ls frontend/test-results
rtk ls frontend/playwright-report
```

Expected: report and trace/screenshot artifacts available.

- [ ] **Step 4: Commit any final test-driven fixes from quality gate**

```bash
rtk git add frontend/src frontend/e2e frontend/playwright.config.ts frontend/package.json frontend/pnpm-lock.yaml
rtk git commit -m "test(ui): finalize responsive interaction regression coverage"
```

---

### Task 7: Final Verification Against Acceptance Criteria

**Files:**
- No new files required

- [ ] **Step 1: Verify all acceptance checks map to passing tests**

Checklist:

```text
[ ] Bottom nav buttons clickable
[ ] Sidebar open/close + overlay close
[ ] Quick commands open/close + overlay close
[ ] Sidebar and quick commands mutually exclusive
[ ] Header buttons clickable
[ ] Terminal interactable after panels close
[ ] Connection/settings modal clickable and not blocked
```

- [ ] **Step 2: Run final smoke command set once more**

Run:

```bash
rtk lint && rtk tsc && rtk pnpm --dir frontend build && rtk pnpm --dir frontend test:e2e
```

Expected: all commands PASS.

- [ ] **Step 3: Prepare implementation summary from concrete artifacts**

Include in handoff:

```text
- Files changed
- Test command outputs (pass/fail)
- Viewport evidence paths (playwright artifacts)
- Confirmation: no backend files changed
```
