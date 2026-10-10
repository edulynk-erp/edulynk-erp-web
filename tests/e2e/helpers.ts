import { expect, type Page } from '@playwright/test';

export const SESSION_COOKIE = '__Host-edl_erp_session';
/** Published demo credential (see README). Not a secret. */
export const DEMO_PASSWORD = 'Edulynk@Demo2026';
export const OWNER_EMAIL = 'ramesh.kumar@greenwood.edu.in';
export const TEACHER_EMAIL = 'rahul.mehra@greenwood.edu.in';

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

/** Records every request to the BFF; demo mode must never call a backend. */
export function trackBffRequests(page: Page): string[] {
  const calls: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/bff/')) calls.push(request.url());
  });
  return calls;
}

export async function signIn(page: Page, email: string, next?: string) {
  await page.goto(next ? `/login?next=${encodeURIComponent(next)}` : '/login');
  await page.getByLabel('Email / Mobile Number').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(DEMO_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(next ? new RegExp(`${next}$`) : /\/dashboard/);
}
