# Glass

Monorepo for Glass — **Waitlist** and **Application** — powered by [Bun](https://bun.sh), [Next.js](https://nextjs.org), and [Turborepo](https://turbo.build).

## Requirements

- [Bun](https://bun.sh) 1.3+ (version pinned in root `package.json` via `packageManager`). Use **Bun** for this repo: `bun install`, `bun run`, `bun --filter`, and `bunx` for one-off CLIs. Do not use npm, npx, pnpm, or yarn unless an external tool explicitly requires it.

## Setup

```sh
bun install
```

## Scripts (root)

| command                  | description                                                      |
| ------------------------ | ---------------------------------------------------------------- |
| `bun dev`                | Run all apps in dev mode (parallel)                              |
| `bun run build`          | Build all apps via Turborepo                                     |
| `bun run lint`           | Lint all workspaces                                              |
| `bun run check-types`    | Typecheck all workspaces                                         |

## Apps

| package              | Port (dev) | Path                 |
| -------------------- | ---------- | -------------------- |
| `@glass/waitlist`    | 3000       | `apps/waitlist`      |
| `@glass/application` | 3001       | `apps/application`   |

Run a single app:

```sh
bun --filter @glass/waitlist dev
bun --filter @glass/application dev
```

## Layout

```
apps/
  waitlist/      # public waitlist (Next.js + React + TypeScript)
  application/   # main application (Next.js + React + TypeScript)
packages/
  ui/            # design tokens and shared components
REFERENCES/      # static HTML design references (not shipped)
```
