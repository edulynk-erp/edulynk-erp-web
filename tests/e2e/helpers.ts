import type { Page } from '@playwright/test';

export const SESSION_COOKIE = '__Host-edl_erp_session';

/** Collects CSP violations reported by the browser from the first script onwards. */
export async function trackCspViolations(page: Page): Promise<() => Promise<string[]>> {
  const consoleViolations: string[] = [];
  page.on('console', (message) => {
    if (/Content Security Policy/i.test(message.text())) consoleViolations.push(message.text());
  });
  await page.addInitScript(() => {
    const store: string[] = [];
    (window as unknown as { __cspViolations: string[] }).__cspViolations = store;
    document.addEventListener('securitypolicyviolation', (event) => {
      store.push(`${event.violatedDirective} ${event.blockedURI}`);
    });
  });
  return async () => {
    const fromPage = await page
      .evaluate(() => (window as unknown as { __cspViolations?: string[] }).__cspViolations ?? [])
      .catch(() => []);
    return [...consoleViolations, ...fromPage];
  };
}
