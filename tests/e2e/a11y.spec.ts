import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function expectAccessible(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(
    results.violations.map((violation) => `${violation.id} (${violation.nodes.length}): ${violation.help}`),
    label,
  ).toEqual([]);
}

test.describe('accessibility (axe, WCAG 2.1 AA)', () => {
  test('sign-in page', async ({ page }) => {
    await page.goto('/login');
    await expectAccessible(page, 'login');
  });

  test('not-found page', async ({ page }) => {
    await page.goto('/login/does-not-exist');
    await expectAccessible(page, 'not found');
  });
});
