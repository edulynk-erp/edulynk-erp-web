import axe from 'axe-core';
import { expect } from 'vitest';

/** Runs axe against rendered DOM. Colour contrast needs real layout, so it is covered by the Playwright scans instead. */
export async function expectNoAxeViolations(container: Element): Promise<void> {
  const results = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
  const summary = results.violations.map((violation) => `${violation.id}: ${violation.help}`);
  expect(summary).toEqual([]);
}
