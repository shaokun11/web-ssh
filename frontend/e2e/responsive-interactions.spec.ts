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
