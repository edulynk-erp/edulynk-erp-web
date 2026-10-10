# Folder Structure

A short guide to how `edulynk-erp-web` (Next.js App Router, TypeScript, Tailwind) is organised.

```
edulynk-erp-web/
├── src/
│   ├── app/            Routes (pages, layouts, route handlers)
│   ├── features/       Screen-level UI, one folder per feature
│   ├── components/     Reusable UI building blocks
│   ├── services/       Data-layer contracts + React hooks to use them
│   ├── demo/           Mock implementation of the services (demo builds only)
│   ├── domain/         Shared TypeScript types for business entities
│   ├── config/         Module catalogue, navigation, branding
│   ├── lib/            Framework-agnostic helpers
│   ├── server/         Server-only code (auth, sessions, CSP, env)
│   ├── styles/         Global CSS and Tailwind theme
│   ├── assets/         Images bundled through CSS/imports
│   └── types/          Ambient type declarations
├── tests/              Playwright end-to-end tests
├── scripts/            Build verification scripts
└── (config files)      next.config.ts, vitest/playwright configs, Dockerfile, etc.
```

## `src/app` — routes

| Folder                                            | Purpose                                                                                                                                                                                               |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `(public)/`                                       | Pages that do not need sign-in: `login`, `forgot-password`, `reset-password`, `invite`, `demo`.                                                                                                       |
| `(portal)/`                                       | Signed-in area wrapped by the app shell (sidebar + top bar). Contains `dashboard`, `users`, and the catch-all `[module]` route that renders placeholder pages for modules without a dedicated screen. |
| `auth/`                                           | Route handlers for `sign-in`, `logout` and `switch-role`.                                                                                                                                             |
| `bff/[...path]`                                   | Backend-for-frontend proxy that forwards API calls to the platform API with the user's session.                                                                                                       |
| `healthz/`                                        | Health-check endpoint for deployments.                                                                                                                                                                |
| `layout.tsx`, `not-found.tsx`, `global-error.tsx` | Root layout and app-wide error pages.                                                                                                                                                                 |

Route groups in parentheses (`(public)`, `(portal)`) only group pages and share layouts; they do not appear in the URL.

## `src/features` — screens

Each folder holds the components for one feature. Pages in `src/app` stay thin and render these.

- `auth/` — login panel and demo sign-in form.
- `dashboard/` — owner dashboard (stats, student growth, admissions overview, recent activity).
- `users/` — Users & Access: users table, create-user dialog, roles tab, role editor (custom roles and built-in permission editing).
- `onboarding/` — invite, set-password, forgot/reset password flows and the demo inbox.

## `src/components` — shared UI

- `ui/` — primitives: button, input, card, badge, dialog, tabs, toast, checkbox, dropdown menu, etc.
- `layout/` — app shell, sidebar, mobile nav, breadcrumbs, page header, user menu, role switcher, auth layout.
- `data/` — `DataTable` with sorting and pagination.
- `charts/` — Recharts wrappers (bar, donut).
- `feedback/` — empty, loading, error and access-denied states.
- `providers/` — client providers for the portal (signed-in user, workspace selection, toasts).

## `src/services` — data layer

Defines what the UI can ask for, independent of where data comes from.

- `types.ts`, `users.ts`, `dashboard.ts`, … — service interfaces (e.g. `RoleService`, `DashboardService`).
- `registry.ts` — the single place the UI gets its services from.
- `provider.tsx` — React hooks: `useServices`, `useServiceQuery`, `useCan`, `usePrincipal`, `useWorkspace`.
- `errors.ts` — `ServiceError` with codes such as `VALIDATION` and `CONFLICT`.

## `src/demo` — mock data (demo builds only)

Implements the service interfaces with realistic, seeded data that lives in the browser.

- `seed/` — deterministic generator for institution, people and records.
- `store/` — in-memory store; selected collections (users, custom roles, role overrides, audit, …) are saved to `localStorage`.
- `services/` — mock implementations of each service, plus their unit tests.
- `access/` — demo roles and demo sign-in accounts.
- `index.ts` / `excluded.ts` — entry point and an empty stand-in. `next.config.ts` swaps in `excluded.ts` for production builds, so no mock data ships to production.

## `src/domain` — business types

Plain TypeScript types shared by services, demo and UI: students, staff, fees, attendance, admissions, roles and permissions (`access.ts`), audit events, dashboard metrics, etc.

## `src/config` — app configuration

- `modules.ts` — catalogue of ERP modules and permission actions (`view`, `create`, `edit`, `delete`, `export`, `approve`).
- `navigation.ts` — sidebar groups and items.
- `branding.ts` — institution display name and brand colours.

## `src/lib` — helpers

- `api/` — browser-side API client for the BFF, error mapping, request IDs, idempotency keys.
- `access/` — grant checks.
- `auth/` — password policy.
- `format/` — date and number formatting.
- `query/` — list filtering, sorting and paging helpers.
- `validation/zod.ts` — CSP-safe zod import (always import zod from here).
- `utils/` — `cn` class merger, safe redirect and URL helpers.

## `src/server` — server-only code

- `auth/` — identity adapters (`demo`, `unconfigured`), encrypted session cookies, route guards.
- `bff/` — request forwarding used by `app/bff`.
- `api/` — server HTTP client to the platform API.
- `security/csp.ts` — Content Security Policy headers.
- `http/` — same-origin checks.
- `env.ts`, `startup.ts`, `demo-mode.ts`, `branding.ts` — environment validation (e.g. `SESSION_ENCRYPTION_KEY`), startup checks and demo-mode detection.

## Other folders

- `src/styles/globals.css` — Tailwind setup, theme colours and a few utility classes.
- `src/assets/` — bundled images (e.g. the login campus photo).
- `src/types/demo-modules.d.ts` — type declarations for the `@edulynk/demo-*` build aliases.
- `tests/e2e/` — Playwright tests for auth, onboarding, security and accessibility; `tests/support/` holds test helpers.
- `scripts/verify-production-build.mjs` — checks that production builds contain no demo code.

## Conventions

- Unit tests sit next to the code they test (`*.test.ts` / `*.test.tsx`) and run with Vitest.
- The `@/` import alias points at `src/`.
- Server-only modules must not be imported from client components.
- No inline `style` attributes; the CSP blocks them in production.
- Environment variables live in `.env.local` (gitignored); see `.env.example` for the full list.
