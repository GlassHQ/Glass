# Glass application

Main application UI built with [Next.js](https://nextjs.org) 16, React 19, and TypeScript.

## scripts

| command             | description                    |
| ------------------- | ------------------------------ |
| `bun dev`           | Dev server on port **3001**    |
| `bun run build`     | Production build (`.next`)     |
| `bun run start`     | Serve production build on **3001** |
| `bun run lint`      | ESLint (Next.js presets)       |
| `bun run check-types` | `tsc --noEmit`               |

From the monorepo root:

```sh
bun --filter @glass/application dev
```
