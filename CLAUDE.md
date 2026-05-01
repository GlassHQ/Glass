# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package manager

**Always use Bun.** Do not use npm, npx, pnpm, or yarn.

```sh
bun install          # install deps
bun dev              # run all apps in parallel via Turborepo
bun run build        # build all apps
bun run lint         # lint all workspaces
bun run check-types  # typecheck all workspaces
```

Run a single app:

```sh
bun --filter @glass/waitlist dev        # port 3000
bun --filter @glass/application dev     # port 3001
```

Run a single workspace's script directly:

```sh
cd apps/waitlist && bun run lint
cd apps/waitlist && bun run check-types
```

## Monorepo structure

```
apps/
  waitlist/      # Public waitlist — Next.js 16, React 19, TypeScript (port 3000)
  application/   # Main app — Next.js, React 19, TypeScript (port 3001)
packages/
  ui/            # Shared design tokens + components (@glass/ui)
marketing/       # Static wallpapers (not shipped as an app)
REFERENCES/      # Static HTML design references — not shipped
```

Turborepo orchestrates builds; `packages/ui` has no build emit step — consumers import source directly and `next.config.ts` uses `transpilePackages: ['@glass/ui']`.

## @glass/ui package

- **Design tokens**: `packages/ui/src/styles/tokens.css`, imported as `@glass/ui/tokens.css`
- **Components**: exported from `packages/ui/src/index.ts` (currently: `Button`)
- Dark-first design with CSS custom properties (`--glass-*`). Light theme via `.glass-theme-light` class. Fonts: DM Serif Display + DM Mono from Google Fonts.

## Waitlist app architecture

- **API routes** (`src/app/api/`):
  - `POST /api/waitlist` — email signup, writes to Neon PostgreSQL, rate-limited via Upstash Redis per IP
  - `GET /api/waitlist` — returns current signup count
  - `GET /api/admin/waitlist/export` — CSV export, requires `Authorization: Bearer $WAITLIST_ADMIN_TOKEN`
- **Shared utilities** (`src/lib/`): `db.ts` (pg pool singleton), `email.ts` (validate/normalize), `rate-limit.ts` (Upstash wrapper)
- **DB migration**: `db/migrations/001_waitlist.sql` — apply with `psql "$DATABASE_URL" -f db/migrations/001_waitlist.sql`
- Rate limiting is **skipped in development** if Upstash env vars are absent; in production it is required.

## Environment variables (waitlist)

Copy `apps/waitlist/.env.example` to `apps/waitlist/.env.local`:

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Always | Neon pooled connection string |
| `UPSTASH_REDIS_REST_URL` | Production | Omit in dev to skip rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Production | Omit in dev to skip rate limiting |
| `WAITLIST_ADMIN_TOKEN` | For CSV export | Long random secret |

## Application app architecture

The application is currently a **client-side only prototype** — no API routes, no server components, no backend. All state lives in the browser.

- **Navigation**: uses a `Screen` discriminated union (`'applications' | 'application' | 'session' | 'settings'`) managed with `useState`. There is no URL-based routing — back/forward browser buttons do not work. All screen transitions are explicit function calls (`goToApp`, `goToSession`, `goBack`).
- **State persistence**: a `useLocalStorage<T>(key, defaultValue)` hook (defined in `ApplicationHome.tsx`) initialises from `defaultValue` on first render to avoid SSR hydration mismatches, then syncs from `localStorage` in a `useEffect`. Apps, signals, and workspace name all persist across page reloads.
- **Mock data**: `mockData.ts` defines all types (`Application`, `Session`, `Feature`, `Flow`, `Environment`) and exports `APPLICATIONS` — the seed data loaded by `useLocalStorage` on first visit. Editing mock data changes what a fresh browser session sees; returning visitors see their stored state.
- **Signals**: `APP_SIGNALS` in `ApplicationHome.tsx` is a separate static record (keyed by app id) that drives the card-level status indicators (Last session, Drift, Risk). It is intentionally disconnected from the session data in `mockData.ts` — both are mock.
- **CSS**: `glass.css` is scoped to the application shell (`.glass-app`). It does not use `@glass/ui` tokens — it has its own CSS custom properties (`--bg`, `--text`, `--alert`, `--ok`, `--warn`, etc.).

## Analytics

`@databuddy/sdk` is integrated in both apps at the root layout level, tracking attributes, outgoing links, interactions, and scroll depth.
- **waitlist**: rendered inside `src/app/AppLayout.tsx`, which wraps children in `layout.tsx`
- **application**: inlined directly in `src/app/layout.tsx`
