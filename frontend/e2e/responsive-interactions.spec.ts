import { expect, test } from '@playwright/test';

test('responsive nav interactions behave correctly by viewport', async ({ page }, testInfo) => {
  await page.goto('/');

  const mobileNav = page.locator('.mobile-nav');
  const isMobileLayout = testInfo.project.name === 'mobile';

  if (isMobileLayout) {
    await expect(mobileNav).toBeVisible();

    const connectionBtn = page.getByTestId('mobile-nav-connections');
    const commandsBtn = page.getByTestId('mobile-nav-commands');

    const panelIntersectsViewport = async (selector: string) => {
      return page.evaluate((panelSelector) => {
        const panel = document.querySelector(panelSelector);
        if (!panel) return false;

        const rect = panel.getBoundingClientRect();
        return (
          rect.left < window.innerWidth &&
          rect.right > 0 &&
          rect.top < window.innerHeight &&
          rect.bottom > 0
        );
      }, selector);
    };

    await expect(connectionBtn).toBeVisible();
    await expect(commandsBtn).toBeVisible();

    await expect.poll(() => panelIntersectsViewport('.sidebar')).toBe(false);
    await expect.poll(() => panelIntersectsViewport('.quick-commands-panel')).toBe(false);

    await connectionBtn.click();
    await expect.poll(() => panelIntersectsViewport('.sidebar')).toBe(true);
    await expect.poll(() => panelIntersectsViewport('.quick-commands-panel')).toBe(false);

    await commandsBtn.click();
    await expect.poll(() => panelIntersectsViewport('.quick-commands-panel')).toBe(true);
    await expect.poll(() => panelIntersectsViewport('.sidebar')).toBe(false);

    const shortcutsHeader = page.locator('.category-header', {
      hasText: /Shortcuts|快捷按键/i,
    });
    await expect(shortcutsHeader).toBeVisible();
    await shortcutsHeader.click();

    const ctrlCShortcut = page.locator('.command-item', {
      has: page.locator('.command-code', { hasText: 'Ctrl + C' }),
    });
    await expect(ctrlCShortcut).toBeVisible();
    await ctrlCShortcut.click();
    await expect(ctrlCShortcut.locator('.copy-feedback')).toBeVisible();

    const overlay = page.getByTestId('mobile-overlay');
    await expect(overlay).toBeVisible();
    const viewport = page.viewportSize();
    const closeOverlayNearLeftEdge = async () => {
      await overlay.click({
        position: { x: 10, y: Math.min(120, (viewport?.height ?? 600) - 80) },
      });
    };
    const closeOverlayNearRightEdge = async () => {
      await overlay.click({
        position: {
          x: Math.max((viewport?.width ?? 390) - 10, 10),
          y: Math.min(120, (viewport?.height ?? 600) - 80),
        },
      });
    };

    await closeOverlayNearLeftEdge();

    await expect.poll(() => panelIntersectsViewport('.sidebar')).toBe(false);
    await expect.poll(() => panelIntersectsViewport('.quick-commands-panel')).toBe(false);

    await connectionBtn.click();
    await closeOverlayNearRightEdge();

    const terminalRegion = page.locator('.terminal-container');
    await expect(terminalRegion).toBeVisible();
    await terminalRegion.click({ position: { x: 20, y: 20 } });
  } else {
    await expect(mobileNav).toBeHidden();
  }
});

test('header controls stay clickable across viewports', async ({ page }) => {
  await page.goto('/');

  const settingsBtn = page.getByTitle(/settings|设置/i).first();
  await expect(settingsBtn).toBeVisible();
  await settingsBtn.click();

  await expect(page.locator('.modal-overlay')).toBeVisible();
});
