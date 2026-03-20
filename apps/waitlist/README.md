# Glass waitlist

Public waitlist UI built with [Next.js](https://nextjs.org) 16, React 19, and shared styles/components from `@glass/ui`.

## Scripts

| Command            | Description              |
| ------------------ | ------------------------ |
| `bun dev`          | Dev server on port **3000** |
| `bun run build`    | Production build (`.next`) |
| `bun run start`    | Serve production build on **3000** |
| `bun run lint`     | ESLint (Next.js presets) |
| `bun run check-types` | `tsc --noEmit`        |

From the monorepo root:

```sh
bun --filter @glass/waitlist dev
```
