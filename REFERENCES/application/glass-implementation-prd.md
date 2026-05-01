# Glass — Implementation PRD
**Version 1.0 · May 2026 · Status: Ready to build**

This document defines everything that needs to be built to make Glass real — replacing the current frontend prototype with a working system. No timelines. Just what, why, and which files.

---

## Guiding constraints

- **Playwright MCP is the browser layer.** Accessibility tree only. No screenshots, ever. This is permanent.
- **Claude is the intelligence layer.** Tool use via the Anthropic SDK, not computer use.
- **Neon PostgreSQL is the database.** Already provisioned for the waitlist app. Reuse it.
- **Upstash Redis is the event bus.** Already provisioned for waitlist rate limiting. Use it for session event streaming.
- **Next.js API routes handle the backend.** No separate service for MVP. Long-running streaming responses are supported on Vercel Pro (up to 900s).
- **localStorage state is replaced by the database.** The frontend stops being a prototype and starts being a real app.

---

## Architecture overview

```
Frontend (Next.js, React)
    │
    ├── POST /api/applications/[id]/sessions/run
    │       Creates session record (status: running)
    │       Spawns agent in background
    │       Returns sessionId
    │
    ├── GET /api/sessions/[id]/stream  (SSE)
    │       Reads events from Upstash Redis pub/sub
    │       Streams to frontend as newline-delimited JSON
    │
    └── GET /api/sessions/[id]
            Returns completed session with features + flows

Background agent (runs inside the API route or a separate worker)
    │
    ├── Playwright MCP subprocess
    │       browser_navigate, browser_snapshot, browser_click, browser_type
    │
    └── Anthropic SDK (streaming, tool use)
            System prompt → explore app → return structured JSON
            Each tool call → publish event to Redis → streams to frontend
```

---

## Part 1 — Database

### 1.1 Schema

**New file:** `db/migrations/002_glass_core.sql`

```sql
-- Applications
create table applications (
  id           text primary key,
  name         text not null,
  initials     text not null,
  created_at   timestamptz default now()
);

-- Environments
create table environments (
  id              serial primary key,
  application_id  text references applications(id) on delete cascade,
  type            text not null check (type in ('local', 'staging')),
  url             text not null,
  reachability    text not null default 'reachable'
                    check (reachability in ('reachable', 'auth_required', 'unreachable')),
  last_session_id text,
  unique (application_id, type)
);

-- Sessions
create table sessions (
  id              text primary key,
  application_id  text references applications(id) on delete cascade,
  environment_id  integer references environments(id),
  env_type        text not null check (env_type in ('local', 'staging')),
  status          text not null default 'running'
                    check (status in ('running', 'completed', 'failed', 'stopped')),
  started_at      timestamptz default now(),
  completed_at    timestamptz,
  token_count     integer,
  feature_count   integer,
  page_count      integer,
  narrative       text
);

-- Features (session output)
create table features (
  id          serial primary key,
  session_id  text references sessions(id) on delete cascade,
  name        text not null,
  position    integer not null
);

-- Flows (feature output)
create table flows (
  id          serial primary key,
  feature_id  integer references features(id) on delete cascade,
  description text not null,
  risk        text not null check (risk in ('critical', 'standard')),
  position    integer not null
);

-- Session events (live log)
create table session_events (
  id          serial primary key,
  session_id  text references sessions(id) on delete cascade,
  event_type  text not null,  -- 'log' | 'feature_found' | 'nav' | 'complete' | 'error'
  message     text not null,
  metadata    jsonb,
  created_at  timestamptz default now()
);

-- Back-fill environment.last_session_id FK after sessions table exists
alter table environments
  add constraint fk_last_session
  foreign key (last_session_id) references sessions(id) on delete set null;
```

**Technical notes:**
- `session_events` serves double duty: it persists the log for viewing after the fact, and is the write side of the SSE stream.
- `features.position` and `flows.position` preserve the order Glass discovered them in.
- Application `id` is a user-readable slug (same as the current mock), not a UUID. Keep it consistent with the frontend.

**Apply with:**
```sh
psql "$DATABASE_URL" -f db/migrations/002_glass_core.sql
```

---

## Part 2 — Shared library

### 2.1 Database client

**New file:** `apps/application/src/lib/db.ts`

Mirrors the pattern in `apps/waitlist/src/lib/db.ts`. Re-export a pg Pool singleton pointed at `DATABASE_URL`.

**Technical note:** The waitlist already has a DB client. Do not share it across apps — each app gets its own pool instance with its own env var. They can point at the same Neon database but use separate connection pools.

### 2.2 Type definitions aligned to the database

**Modified file:** `apps/application/src/mockData.ts`

Add `'running'` to `SessionStatus`:
```typescript
export type SessionStatus = 'running' | 'completed' | 'failed' | 'stopped'
```

This is the only change to `mockData.ts`. The mock data stays; the types stay. The frontend will use these types against real API responses.

### 2.3 API response types

**New file:** `apps/application/src/lib/types.ts`

Define the shapes returned by each API route. These are the canonical wire types — they mirror `mockData.ts` interfaces but are decoupled from the mock so the frontend can import them cleanly once the mock is removed.

---

## Part 3 — API routes

All routes live inside `apps/application/src/app/api/`.

### 3.1 Applications CRUD

**New file:** `apps/application/src/app/api/applications/route.ts`

- `GET` — list all applications with their environments and latest session per environment
- `POST` — create application + environments; derive initials from name (same logic as `deriveInitials` in `ApplicationHome.tsx`)

**New file:** `apps/application/src/app/api/applications/[id]/route.ts`

- `GET` — single application with full data
- `PATCH` — update name, initials, environment URLs
- `DELETE` — cascade deletes environments + sessions + features + flows

**Technical note:** The current `deriveInitials` function lives in `ApplicationHome.tsx`. Extract it to `apps/application/src/lib/utils.ts` so it can be used in both the frontend and the API route.

### 3.2 Sessions list

**New file:** `apps/application/src/app/api/applications/[id]/sessions/route.ts`

- `GET` — all sessions for an application, ordered by `started_at` desc, each with features + flows

### 3.3 Session trigger

**New file:** `apps/application/src/app/api/applications/[id]/sessions/run/route.ts`

- `POST` — accepts `{ envType: 'local' | 'staging' }`
  1. Resolves the environment record for that app + envType
  2. Checks reachability (simple HTTP HEAD request to the URL, 5s timeout)
  3. If unreachable, returns `400` with `{ error: 'unreachable' }`
  4. Creates a session record with `status: 'running'`
  5. Fires off the agent in the background (non-blocking — use `void runAgent(sessionId)`)
  6. Returns `{ sessionId }` immediately

**Technical note:** The reachability check here should also update `environments.reachability` in the database before returning. The frontend already shows this signal — keep it live.

**Technical note on background execution:** In a serverless environment, `void runAgent()` only works if the response hasn't been sent. The correct pattern is:

```typescript
// In Next.js, waitUntil keeps the function alive after response
import { waitUntil } from '@vercel/functions'
waitUntil(runAgent(sessionId))
return NextResponse.json({ sessionId })
```

Requires `@vercel/functions` package. For local dev, the function just keeps running after the response and this works fine.

### 3.4 Session result

**New file:** `apps/application/src/app/api/sessions/[id]/route.ts`

- `GET` — full session with all features and flows, ordered by position

### 3.5 Session SSE stream

**New file:** `apps/application/src/app/api/sessions/[id]/stream/route.ts`

- `GET` — returns `text/event-stream`
  1. Subscribes to Redis channel `session:{id}:events`
  2. For each message received, writes `data: {json}\n\n` to the stream
  3. Sends a keepalive comment (`: keepalive\n\n`) every 15s
  4. On `complete` or `error` event, closes the stream

**Technical note:** Use Upstash Redis's `subscribe` (pub/sub). The agent publishes to the same channel as it runs. The SSE route subscribes and forwards.

**Technical note:** SSE requires `Cache-Control: no-cache` and `Connection: keep-alive` headers. Next.js streaming responses need `headers` set explicitly:
```typescript
return new Response(stream, {
  headers: {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  },
})
```

### 3.6 Session stop

**New file:** `apps/application/src/app/api/sessions/[id]/stop/route.ts`

- `POST` — sets a `stop` flag in Redis (`SET session:{id}:stop 1 EX 3600`)
  
The agent checks this flag between tool calls. If it sees it, it stops mid-run and writes a partial result.

---

## Part 4 — Session runner

**New file:** `apps/application/src/lib/session-runner.ts`

This is the orchestration layer. Called by the `run` API route, runs in the background.

```typescript
export async function runAgent(sessionId: string): Promise<void>
```

Responsibilities:
1. Load session + environment + application from DB
2. Publish `{ type: 'log', message: 'Starting Glass agent…' }` to Redis
3. Initialise Playwright MCP subprocess
4. Call the Anthropic API with the Glass system prompt and Playwright MCP tools
5. As Claude makes tool calls, intercept each one and publish a log event to Redis
6. Between tool calls, check the stop flag in Redis — if set, abort
7. When Claude returns its final output, parse the structured JSON
8. Write features + flows to the database
9. Update session record: `status`, `completed_at`, `token_count`, `feature_count`, `page_count`, `narrative`
10. Update `environments.last_session_id`
11. Publish `{ type: 'complete' }` to Redis
12. On any unhandled error, update session to `status: 'failed'`, publish `{ type: 'error', message: err.message }`

**Technical note on token counting:** The Anthropic API returns `usage.input_tokens` and `usage.output_tokens` in the stream's final event. Sum these and store as `token_count`.

**Technical note on page counting:** The agent needs to track distinct URLs visited. Intercept every `browser_navigate` tool call and add the URL to a Set. `session.page_count = urlSet.size` at the end.

---

## Part 5 — Playwright MCP integration

**New file:** `apps/application/src/lib/playwright-mcp.ts`

Responsible for starting the Playwright MCP subprocess and returning a set of tool definitions compatible with the Anthropic SDK's `tools` parameter.

```typescript
export async function createPlaywrightMCPTools(): Promise<{
  tools: Tool[]           // Anthropic-compatible tool definitions
  cleanup: () => void     // kills the subprocess
}>
```

**How it works:**
1. Spawn `npx @playwright/mcp@latest` as a child process
2. Communicate over stdio using the MCP protocol (JSON-RPC)
3. Translate MCP tool definitions into Anthropic tool format
4. Return tools + a cleanup function

**Tools exposed by Playwright MCP (the ones Glass needs):**
- `browser_navigate` — navigate to a URL
- `browser_snapshot` — read the full accessibility tree of the current page
- `browser_click` — click an element by accessibility ref
- `browser_type` — type into an input
- `browser_press_key` — keyboard interaction
- `browser_wait_for_url` — wait for navigation

**Tools Glass should NOT expose to Claude:**
- `browser_take_screenshot` — architectural decision, never
- `browser_pdf_save` — irrelevant
- `browser_file_chooser_*` — out of scope for MVP

**Technical note on MCP subprocess:** Use Node's `child_process.spawn`. Playwright MCP communicates over stdin/stdout with newline-delimited JSON. You write requests and read responses. The `@modelcontextprotocol/sdk` package handles the protocol framing — use it rather than implementing the protocol manually.

**Dependency additions:**
```json
"@playwright/mcp": "latest",
"@modelcontextprotocol/sdk": "latest",
"@anthropic-ai/sdk": "latest"
```

---

## Part 6 — Intelligence layer (the system prompt)

**New file:** `apps/application/src/lib/glass-prompt.ts`

This is the product. Everything else is infrastructure. The prompt determines the quality of Glass's output.

```typescript
export function buildSystemPrompt(appName: string, envUrl: string): string
```

The prompt must instruct Claude to:

1. **Start at the root URL.** Navigate to `envUrl` first.
2. **Explore systematically.** Don't just click things randomly. Identify the top-level feature areas first (the navigation structure), then explore each one in depth.
3. **Map flows, not pages.** A flow is a user action with an intent: "Add product to cart", not "Click the Add button". Name flows from the user's perspective.
4. **Classify risk correctly.** Critical = financial transactions, authentication, data deletion, permission changes, anything irreversible. Standard = everything else.
5. **Stop when done.** Do not explore infinitely. When you've visited every reachable feature area and enumerated its flows, return your final output.
6. **Return structured JSON.** The final output must be a JSON object matching the schema exactly — no markdown wrapping, no explanation text, just the JSON.

**Hard limits to include in the prompt:**
- Maximum 40 distinct pages
- If you encounter a login wall, stop and report `{ blocked: true, reason: 'auth_required' }`
- Do not submit forms that would create real data (orders, payments, account creation)

**Output schema the prompt must enforce:**
```typescript
{
  narrative: string,        // 3–5 sentence plain English summary
  features: [
    {
      name: string,
      flows: [
        {
          description: string,  // user-facing, starts with a verb
          risk: 'critical' | 'standard'
        }
      ]
    }
  ]
}
```

**Technical note:** Use Claude's tool use to enforce structured output — define a `report_findings` tool with the above JSON schema and instruct Claude to call it when done. This is more reliable than asking Claude to return JSON in its final message. When Claude calls `report_findings`, that's your structured output.

**Technical note on extended thinking:** For the initial structural analysis ("what are the top-level feature areas of this app?"), enabling extended thinking produces significantly better feature taxonomy. Add a `thinking` block to the initial Claude call. Subsequent exploration steps don't need it.

---

## Part 7 — Frontend wiring

### 7.1 Replace localStorage with API calls

**Modified file:** `apps/application/src/ApplicationHome.tsx`

The `useLocalStorage` hook and all state initialised from it gets replaced by API calls. Suggested approach:

- On mount, `GET /api/applications` to load the app list
- On app open, `GET /api/applications/[id]/sessions` to load session history
- On session open, `GET /api/sessions/[id]` to load the result
- On app create/edit/delete, call the corresponding API route and refresh local state

Keep React state as the in-memory cache — don't re-fetch on every render. Just load once per navigation event.

**What stays the same:**
- All UI components (`AppCard`, `ApplicationView`, `SessionResultView`, etc.) — their props don't change
- The `Screen` discriminated union — navigation logic stays identical
- `mockData.ts` types — the wire format from the API matches these exactly

**What changes:**
- `useLocalStorage` is removed
- Initial state is `[]` / loading, not `APPLICATIONS`
- Add loading and error states where the content renders (empty state covers most of this already)

### 7.2 Wire RunningSessionView to real SSE

**Modified file:** `apps/application/src/ApplicationHome.tsx`

`RunningSessionView` currently drives its own fake progression via `setTimeout`. Replace this with a real SSE connection.

The component receives a `sessionId` prop (returned by the `run` API call). It opens an `EventSource` to `/api/sessions/[sessionId]/stream` and:

- On `log` events: appends to a local log array (for the live log display)
- On `feature_found` events: adds a feature to the in-progress list
- On `complete`: fetches the final session from `/api/sessions/[sessionId]` and calls `onComplete`
- On `error`: transitions to failed state

**What stays the same:**
- The visual design of `RunningSessionView` — the feature list, the spinner, the elapsed timer
- The `onComplete(session)` callback contract — `handleRunComplete` in the shell doesn't change

**What changes:**
- The `RunPlan` / `buildRunPlan` / `generateNarrative` generation code is removed
- `useEffect` progression timers are removed
- `EventSource` replaces the fake timer loop
- Features appear in the list as the agent actually discovers them (published via Redis)

**Technical note:** `EventSource` is a native browser API, no library needed. Handle reconnection with `onerror` — if the stream drops, retry after 2s.

### 7.3 Handle the `running` session status in SessionRow

**Modified file:** `apps/application/src/ApplicationHome.tsx`

`SessionRow` currently handles `completed | failed | stopped`. Add `running` — show it with a pulsing indicator, same style as `run-status-badge` in the running session view.

If a user navigates to the sessions tab and sees a `running` session row, clicking it should navigate to the `running-session` screen (not the result view). This requires `goToSession` to check the session status and route accordingly.

---

## Part 8 — Environment variables

**Modified file:** `apps/application/.env.example`

```
DATABASE_URL=            # Neon pooled connection string
UPSTASH_REDIS_REST_URL=  # For SSE pub/sub and stop flag
UPSTASH_REDIS_REST_TOKEN=
ANTHROPIC_API_KEY=       # For the intelligence layer
```

**Technical note:** `ANTHROPIC_API_KEY` must never be exposed to the browser. It lives in API routes and the session runner only — never imported by any file under `src/app/` that runs client-side.

---

## Part 9 — Deferred (not MVP)

These are real requirements but explicitly out of scope for the first working version.

### Authentication
The agent needs credentials to test authenticated apps. Defer until the core exploration flow is solid on public/staging URLs.

When built: store credentials encrypted per environment (AES-256-GCM, key from env var). The session runner decrypts and injects them into the agent's initial context via the system prompt.

### Local environment support
Cloud agent cannot reach `localhost:3000`. Deferred.

When built: either (a) require users to expose local via Cloudflare Tunnel and provide the tunnel URL as the "local" URL, or (b) ship a local CLI/daemon that runs the agent on the user's machine and POSTs results to the Glass API.

### Drift detection
Comparing feature maps between sessions to produce the "Drift" signal. Currently static mock data.

When built: after a session completes, run a second Claude call that compares the new feature list against the previous session's features and returns `{ changed: Feature[], added: Feature[], removed: Feature[] }`. Store the diff. Use it to update the app card signal.

### Scheduling (Pro tier)
Cron-triggered sessions. Upstash QStash is the natural fit given the existing Upstash dependency.

When built: `POST /api/applications/[id]/schedule` creates a QStash schedule that calls `/api/applications/[id]/sessions/run` on the configured interval.

### User authentication
The Glass app itself has no login right now. Defer until everything else works.

When built: NextAuth.js with magic link email. Workspace concept maps to a user. Add `workspace_id` FK to `applications`.

---

## Files changed — complete index

| File | Status | Purpose |
|------|--------|---------|
| `db/migrations/002_glass_core.sql` | New | Full schema: applications, environments, sessions, features, flows, session_events |
| `apps/application/src/lib/db.ts` | New | pg Pool singleton |
| `apps/application/src/lib/utils.ts` | New | `deriveInitials` (extracted from ApplicationHome) |
| `apps/application/src/lib/types.ts` | New | Canonical wire types for API responses |
| `apps/application/src/lib/playwright-mcp.ts` | New | Playwright MCP subprocess wrapper, Anthropic tool translation |
| `apps/application/src/lib/glass-prompt.ts` | New | System prompt builder, `report_findings` tool schema |
| `apps/application/src/lib/session-runner.ts` | New | Orchestration: MCP + Claude + Redis pub/sub + DB writes |
| `apps/application/src/app/api/applications/route.ts` | New | GET list, POST create |
| `apps/application/src/app/api/applications/[id]/route.ts` | New | GET, PATCH, DELETE |
| `apps/application/src/app/api/applications/[id]/sessions/route.ts` | New | GET session list |
| `apps/application/src/app/api/applications/[id]/sessions/run/route.ts` | New | POST trigger run |
| `apps/application/src/app/api/sessions/[id]/route.ts` | New | GET session result |
| `apps/application/src/app/api/sessions/[id]/stream/route.ts` | New | GET SSE stream |
| `apps/application/src/app/api/sessions/[id]/stop/route.ts` | New | POST stop signal |
| `apps/application/src/mockData.ts` | Modified | Add `'running'` to `SessionStatus` |
| `apps/application/src/ApplicationHome.tsx` | Modified | Replace localStorage + fakes with API calls + SSE |
| `apps/application/.env.example` | Modified | Add `ANTHROPIC_API_KEY` |
| `apps/application/package.json` | Modified | Add `@anthropic-ai/sdk`, `@playwright/mcp`, `@modelcontextprotocol/sdk`, `@vercel/functions` |

---

*The product is the prompt. The rest is plumbing.*
