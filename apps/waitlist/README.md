# Glass waitlist

Public waitlist UI built with [Next.js](https://nextjs.org) 16, React 19, and shared styles/components from `@glass/ui`. Signups are stored in **Neon PostgreSQL**; **POST** requests are rate-limited with **Upstash Redis**.

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

## Environment

Copy [`.env.example`](.env.example) to `.env.local` and set:

| Variable | Required | Description |
| -------- | -------- | ----------- |
| `DATABASE_URL` | Yes | Neon **pooled** connection string |
| `UPSTASH_REDIS_REST_URL` | Production | Upstash REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Production | Upstash REST token |
| `WAITLIST_ADMIN_TOKEN` | For CSV export | Long random secret; never commit |

In **development**, if Upstash variables are omitted, **POST** rate limiting is skipped. In **production**, Upstash must be configured or **POST** returns 500.

## Database

Apply the migration against your Neon database (from this app directory):

```sh
psql "$DATABASE_URL" -f db/migrations/001_waitlist.sql
```

Or run the SQL in the Neon SQL editor.

## Admin export (CSV)

With `WAITLIST_ADMIN_TOKEN` set locally or in Vercel:

```sh
curl -sS -H "Authorization: Bearer $WAITLIST_ADMIN_TOKEN" \
  "http://localhost:3000/api/admin/waitlist/export" -o waitlist-signups.csv
```

Returns `401` if the bearer token is missing or wrong.
