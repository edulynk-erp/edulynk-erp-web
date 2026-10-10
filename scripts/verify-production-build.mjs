#!/usr/bin/env node
// Proves that a production build (`npm run build`) contains no demo mode and cannot activate it:
//   1. static: no demo-adapter or mock-data marker, demo credential or seed fixture exists anywhere in the build output
//      (server and browser chunks), and the excluded-adapter marker does (so the scan covers compiled server code);
//   2. runtime: the standalone server, started with AUTH_ADAPTER=demo, never offers demo credentials and never issues a
//      session cookie, under APP_ENV=development (build-time exclusion) and APP_ENV=production (env validation).
// Usage: node scripts/verify-production-build.mjs [--static-only]
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const BUILD_DIR = path.join(ROOT, '.next');
const STANDALONE_SERVER = path.join(BUILD_DIR, 'standalone', 'server.js');
const FORBIDDEN_MARKERS = [
  'edulynk-demo-identity-adapter:included',
  'edulynk-demo-services:included',
  'Edulynk@Demo2026',
  'Greenwood International School',
  'ramesh.kumar@',
  'tnt_greenwood_hyd',
  'demo-access.',
];
const EXCLUDED_MARKER = 'edulynk-demo-identity-adapter:excluded';
const SESSION_COOKIE = '__Host-edl_erp_session';
const SKIP_DIRS = new Set(['cache', 'node_modules']);
// `next dev` writes to .next/dev (it includes demo mode by design); it is not part of the production build output.
const DEV_OUTPUT_DIR = path.join(BUILD_DIR, 'dev');
const TEXT_EXTENSIONS = new Set(['.js', '.cjs', '.mjs', '.json', '.html', '.rsc', '.txt', '.map', '.body', '.meta']);

const failures = [];
const fail = (message) => failures.push(message);
const log = (message) => console.log(`[verify-production-build] ${message}`);

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name) && full !== DEV_OUTPUT_DIR) yield* walk(full);
    } else if (entry.isFile() && TEXT_EXTENSIONS.has(path.extname(entry.name))) {
      yield full;
    }
  }
}

function staticScan() {
  if (!existsSync(STANDALONE_SERVER)) {
    fail(`missing ${path.relative(ROOT, STANDALONE_SERVER)}; run \`npm run build\` first`);
    return;
  }
  let files = 0;
  let excludedMarkerFiles = 0;
  for (const file of walk(BUILD_DIR)) {
    if (statSync(file).size > 50 * 1024 * 1024) continue;
    files += 1;
    const content = readFileSync(file, 'utf8');
    for (const marker of FORBIDDEN_MARKERS) {
      if (content.includes(marker)) fail(`build output ${path.relative(ROOT, file)} contains "${marker}"`);
    }
    if (content.includes(EXCLUDED_MARKER)) excludedMarkerFiles += 1;
  }
  log(`scanned ${files} build files; excluded-adapter marker present in ${excludedMarkerFiles}`);
  if (files === 0) fail('no build files scanned');
  if (excludedMarkerFiles === 0) fail(`excluded-adapter marker "${EXCLUDED_MARKER}" not found; alias not applied?`);
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runtimeCheck(appEnv) {
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, [STANDALONE_SERVER], {
    cwd: path.dirname(STANDALONE_SERVER),
    env: {
      PATH: process.env.PATH,
      NODE_ENV: 'production',
      NEXT_TELEMETRY_DISABLED: '1',
      PORT: String(port),
      HOSTNAME: '127.0.0.1',
      APP_ENV: appEnv,
      AUTH_ADAPTER: 'demo',
      SESSION_ENCRYPTION_KEY: randomBytes(32).toString('base64'),
      ...(appEnv === 'production' ? { TENANT_API_BASE_URL: 'https://api.example.test' } : {}),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', (chunk) => (output += chunk));
  child.stderr.on('data', (chunk) => (output += chunk));
  let exitCode = null;
  child.on('exit', (code) => (exitCode = code ?? -1));

  try {
    let ready = false;
    for (let attempt = 0; attempt < 60 && exitCode === null; attempt += 1) {
      try {
        const response = await fetch(`${base}/healthz`);
        if (response.ok) {
          ready = true;
          break;
        }
      } catch {
        // not listening yet
      }
      await sleep(500);
    }

    if (!ready) {
      if (exitCode !== null && exitCode !== 0) {
        log(`APP_ENV=${appEnv}: server refused to start (exit ${exitCode}) — fail closed`);
        return;
      }
      fail(`APP_ENV=${appEnv}: server neither started nor failed closed (exit ${exitCode})`);
      return;
    }

    const login = await fetch(`${base}/login`);
    const loginHtml = await login.text();
    for (const marker of FORBIDDEN_MARKERS) {
      if (loginHtml.includes(marker)) fail(`APP_ENV=${appEnv}: /login offered "${marker}"`);
    }
    if (loginHtml.includes('action="/auth/sign-in"')) fail(`APP_ENV=${appEnv}: /login rendered a credential form`);

    const signIn = await fetch(`${base}/auth/sign-in`, {
      method: 'POST',
      redirect: 'manual',
      headers: { Origin: base, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ email: 'owner@school.example', password: 'not-a-password', next: '/dashboard' }),
    });
    const setCookie = signIn.headers.getSetCookie().find((cookie) => cookie.startsWith(`${SESSION_COOKIE}=`));
    if (setCookie && !setCookie.startsWith(`${SESSION_COOKIE}=;`)) {
      fail(`APP_ENV=${appEnv}: POST /auth/sign-in issued a session cookie`);
    }
    if (signIn.status !== 303 || !String(signIn.headers.get('location')).startsWith('/login?error=')) {
      fail(`APP_ENV=${appEnv}: POST /auth/sign-in did not reject (status ${signIn.status})`);
    }

    for (const publicDemoPath of ['/demo/inbox', '/forgot-password', '/invite/inv_example']) {
      const response = await fetch(`${base}${publicDemoPath}`, { redirect: 'manual' });
      if (response.status !== 404)
        fail(`APP_ENV=${appEnv}: ${publicDemoPath} returned ${response.status}, expected 404`);
    }

    const dashboard = await fetch(`${base}/dashboard`, { redirect: 'manual' });
    if (dashboard.status !== 307 || !String(dashboard.headers.get('location')).includes('/login')) {
      fail(`APP_ENV=${appEnv}: /dashboard was not redirected to sign-in (status ${dashboard.status})`);
    }
    log(`APP_ENV=${appEnv}: server started but offered no demo sign-in and issued no session`);
  } finally {
    child.kill('SIGTERM');
    await sleep(300);
    if (exitCode === null) child.kill('SIGKILL');
    if (/edulynk-demo-identity-adapter:included/.test(output)) {
      fail(`APP_ENV=${appEnv}: server output mentions the demo adapter`);
    }
  }
}

staticScan();
if (!process.argv.includes('--static-only') && failures.length === 0) {
  await runtimeCheck('development');
  await runtimeCheck('production');
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`[verify-production-build] FAIL ${failure}`);
  process.exit(1);
}
log('PASS: demo mode is absent from and cannot be activated in this production build');
