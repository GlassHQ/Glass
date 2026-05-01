# Glass — Implementation Task List

Ordered task list for the implement → test → fix loop.
Agent reads this at the start of each iteration. Human can inspect progress here.

**Status codes:**
- `[ ]` pending
- `[~]` in progress (agent is currently working on this)
- `[x]` complete (test passes)
- `[!]` blocked (see note — needs human input)

**PRD ref:** `REFERENCES/application/glass-implementation-prd.md`
**Test plan ref:** `REFERENCES/application/glass-test-plan.md`

---

## Phase 1 — Foundation

### TASK-001 · Database migration
**Status:** `[ ]`
**Depends on:** nothing
**Files to create:**
- `db/migrations/002_glass_core.sql`

**Test command:**
```sh
psql "$TEST_DATABASE_URL" -f db/migrations/002_glass_core.sql \
  && psql "$TEST_DATABASE_URL" -c "\dt" \
  && echo "✓ Migration applied"
```

**Acceptance:** Six tables exist with correct columns, FKs, and check constraints: `applications`, `environments`, `sessions`, `features`, `flows`, `session_events`. The `environments.last_session_id` FK resolves correctly. Re-running the migration fails gracefully (use `create table if not exists`).

**PRD ref:** Part 1.1

---

### TASK-002 · Database client
**Status:** `[ ]`
**Depends on:** TASK-001
**Files to create:**
- `apps/application/src/lib/db.ts`

**Test command:**
```sh
cd apps/application && bun test tests/integration/db-client.test.ts
```

**Acceptance:** `pool.query('SELECT 1')` resolves without error against `TEST_DATABASE_URL`. Pool is a singleton — importing `db.ts` twice returns the same instance.

**Test file to write:** `apps/application/tests/integration/db-client.test.ts`

**PRD ref:** Part 2.1

---

### TASK-003 · Shared types and utilities
**Status:** `[ ]`
**Depends on:** nothing
**Files to create:**
- `apps/application/src/lib/utils.ts` (extract `deriveInitials` from `ApplicationHome.tsx`)
- `apps/application/src/lib/types.ts` (wire types for API responses)

**Files to modify:**
- `apps/application/src/mockData.ts` — add `'running'` to `SessionStatus`
- `apps/application/src/ApplicationHome.tsx` — import `deriveInitials` from `lib/utils` instead of defining it inline

**Test command:**
```sh
cd apps/application && bun test tests/unit/utils.test.ts && bun run check-types
```

**Acceptance:** `deriveInitials` passes all cases in the unit test. TypeScript compiles clean after the import change. `SessionStatus` now includes `'running'`.

**Test file to write:** `apps/application/tests/unit/utils.test.ts`

**PRD ref:** Parts 2.1, 2.2, 7.3

---

## Phase 2 — API layer

### TASK-004 · Applications API — list and create
**Status:** `[ ]`
**Depends on:** TASK-002, TASK-003
**Files to create:**
- `apps/application/src/app/api/applications/route.ts`
- `apps/application/tests/api/applications.test.ts` (GET list + POST create cases only)

**Test command:**
```sh
cd apps/application && bun test tests/api/applications.test.ts --test-name-pattern "GET /api/applications|POST /api/applications"
```

**Acceptance:**
- `GET /api/applications` returns `[]` for empty DB, returns array with nested environments when populated
- `POST /api/applications` with valid body returns 201 + `{ id, name, initials, environments }`
- `POST` with duplicate id returns 409
- `POST` with missing name returns 400
- `initials` and `id` are correctly derived from `name`

**PRD ref:** Part 3.1

---

### TASK-005 · Applications API — get, update, delete
**Status:** `[ ]`
**Depends on:** TASK-004
**Files to modify:**
- `apps/application/src/app/api/applications/[id]/route.ts` (new file)
- `apps/application/tests/api/applications.test.ts` (add GET/PATCH/DELETE cases)

**Test command:**
```sh
cd apps/application && bun test tests/api/applications.test.ts
```

**Acceptance:**
- `GET /api/applications/[id]` returns full application or 404
- `PATCH` updates name, initials, environment URLs
- `PATCH` with empty name returns 400
- `DELETE` returns 200, subsequent GET returns 404, cascaded data is gone

**PRD ref:** Part 3.1

---

### TASK-006 · Sessions list and result APIs
**Status:** `[ ]`
**Depends on:** TASK-005
**Files to create:**
- `apps/application/src/app/api/applications/[id]/sessions/route.ts`
- `apps/application/src/app/api/sessions/[id]/route.ts`
- `apps/application/tests/api/sessions-get.test.ts`

**Test command:**
```sh
cd apps/application && bun test tests/api/sessions-get.test.ts
```

**Acceptance:**
- `GET /api/applications/[id]/sessions` returns sessions ordered by `started_at` desc with features + flows nested
- `GET /api/sessions/[id]` returns full session or 404
- A running session (no `completed_at`) returns 200 with `status: 'running'` and `narrative: null`
- Features are ordered by `position`, flows by `position` within feature

**PRD ref:** Parts 3.2, 3.3 (GET only)

---

### TASK-007 · Session trigger API
**Status:** `[ ]`
**Depends on:** TASK-006
**Files to create:**
- `apps/application/src/app/api/applications/[id]/sessions/run/route.ts`
- `apps/application/tests/api/sessions-run.test.ts`

**Test command:**
```sh
cd apps/application && bun test tests/api/sessions-run.test.ts
```

**Acceptance:**
- `POST` with valid `{ envType }` creates session record with `status: 'running'`, calls `runAgent` (spy), returns `{ sessionId }`
- `POST` where reachability check fails: returns 400 `{ error: 'unreachable' }`, updates `environments.reachability`, creates no session
- `POST` for unknown app returns 404
- `POST` for env type that doesn't exist on the app returns 400
- `runAgent` is called with the correct `sessionId` (mock it — do not call real Claude)

**PRD ref:** Part 3.3

---

### TASK-008 · SSE stream API
**Status:** `[ ]`
**Depends on:** TASK-007
**Files to create:**
- `apps/application/src/app/api/sessions/[id]/stream/route.ts`
- `apps/application/tests/api/sessions-stream.test.ts`

**Test command:**
```sh
cd apps/application && bun test tests/api/sessions-stream.test.ts
```

**Acceptance:**
- Response `Content-Type` is `text/event-stream`
- `Cache-Control: no-cache` and `Connection: keep-alive` headers are set
- Events published to Redis channel `session:{id}:events` appear in stream within 2s
- Stream closes after receiving a `{ type: 'complete' }` event
- Stream closes after receiving a `{ type: 'error' }` event
- Keepalive comment sent at least once within 20s
- Unknown session id returns 404 (not a stream)

**PRD ref:** Part 3.5

---

### TASK-009 · Session stop API
**Status:** `[ ]`
**Depends on:** TASK-008
**Files to create:**
- `apps/application/src/app/api/sessions/[id]/stop/route.ts`
- `apps/application/tests/api/sessions-stop.test.ts`

**Test command:**
```sh
cd apps/application && bun test tests/api/sessions-stop.test.ts
```

**Acceptance:**
- `POST /api/sessions/[id]/stop` sets Redis key `session:{id}:stop` with TTL
- Stopping an already-completed session returns 200 (idempotent)
- Unknown session id returns 404

**PRD ref:** Part 3.6

---

## Phase 3 — Agent core

### TASK-010 · Playwright MCP wrapper
**Status:** `[ ]`
**Depends on:** nothing (standalone library)
**Files to create:**
- `apps/application/src/lib/playwright-mcp.ts`
- `apps/application/tests/unit/playwright-mcp.test.ts`

**Dependencies to add:**
```sh
cd apps/application && bun add @playwright/mcp @modelcontextprotocol/sdk
```

**Test command:**
```sh
cd apps/application && bun test tests/unit/playwright-mcp.test.ts
```

**Acceptance:**
- `createPlaywrightMCPTools()` returns an array of Anthropic-compatible tool objects
- `browser_take_screenshot` is NOT in the returned tools list (hard architectural constraint)
- `browser_navigate`, `browser_snapshot`, `browser_click`, `browser_type` ARE present
- Each tool has a valid `input_schema` object
- `cleanup()` function is returned and callable without error

**PRD ref:** Part 5

---

### TASK-011 · Glass system prompt
**Status:** `[ ]`
**Depends on:** TASK-010
**Files to create:**
- `apps/application/src/lib/glass-prompt.ts`
- `apps/application/tests/unit/glass-prompt.test.ts`

**Dependencies to add:**
```sh
cd apps/application && bun add @anthropic-ai/sdk
```

**Test command:**
```sh
cd apps/application && bun test tests/unit/glass-prompt.test.ts
```

**Acceptance:**
- `buildSystemPrompt('my-app', 'https://staging.myapp.com')` returns a string
- Output contains the app name and URL
- Output contains the `report_findings` tool schema definition
- Output contains the word `critical` (risk classification instruction is present)
- Output contains a max-pages limit (40)
- Output does NOT contain the word `screenshot` (regression guard — this is the most important assertion)
- `report_findings` tool schema defines `narrative` (string) and `features` (array) fields

**PRD ref:** Part 6

---

### TASK-012 · Session runner
**Status:** `[ ]`
**Depends on:** TASK-002, TASK-009, TASK-010, TASK-011
**Files to create:**
- `apps/application/src/lib/session-runner.ts`
- `apps/application/tests/setup.ts`
- `apps/application/tests/integration/session-runner.test.ts`

**Test command:**
```sh
cd apps/application && bun test tests/integration/session-runner.test.ts
```

**Acceptance (all with mocked Claude + mocked Playwright MCP):**
- Happy path: session transitions `running → completed`, features + flows written to DB, `environments.last_session_id` updated, `completed_at` set, Redis `complete` event published
- `auth_required` signal from agent: session `status = 'failed'`, narrative mentions auth barrier, no features written
- Stop flag set mid-run: session `status = 'stopped'`, features discovered before stop are written, `completed_at` set
- Claude API error: session `status = 'failed'`, not left permanently in `'running'`
- Malformed `report_findings` JSON: session `status = 'failed'`, not left in `'running'`
- Token count from mock API `usage` response is written to `sessions.token_count`
- Distinct URLs visited across `browser_navigate` calls are counted and written to `sessions.page_count`

**PRD ref:** Part 4

---

## Phase 4 — Frontend wiring

### TASK-013 · Replace localStorage with API calls
**Status:** `[ ]`
**Depends on:** TASK-005, TASK-006
**Files to modify:**
- `apps/application/src/ApplicationHome.tsx`

**Test command:**
```sh
cd apps/application && bun run check-types && bunx playwright test tests/e2e/applications.spec.ts
```

**What changes:**
- Remove `useLocalStorage` hook and all usages
- Remove `APPLICATIONS` import (mock data no longer seeds the UI)
- On mount: `GET /api/applications` to load app list
- On app open: `GET /api/applications/[id]/sessions` to load sessions
- On create: `POST /api/applications` then refresh
- On save: `PATCH /api/applications/[id]` then refresh
- On delete: `DELETE /api/applications/[id]` then navigate away
- Add loading state (empty state already handles the zero-apps case visually)

**What does NOT change:** All UI components, the `Screen` discriminated union, all navigation functions.

**E2E test file to write:** `apps/application/tests/e2e/applications.spec.ts`
(Covers: add app → appears in list, edit app → name updates, delete app → gone)

**PRD ref:** Part 7.1

---

### TASK-014 · Wire RunningSessionView to real SSE
**Status:** `[ ]`
**Depends on:** TASK-007, TASK-008, TASK-013
**Files to modify:**
- `apps/application/src/ApplicationHome.tsx`

**Test command:**
```sh
cd apps/application && bun run check-types && bunx playwright test tests/e2e/session-flow.spec.ts
```

**What changes in RunningSessionView:**
- Remove `buildRunPlan`, `generateNarrative`, `RunPlan`, `FAIL_REASONS`, `RunPhase`, `getFeatureState` (all replaced by real data)
- Component now receives `sessionId: string` prop (returned from the run API)
- Opens `EventSource` to `/api/sessions/${sessionId}/stream`
- On `feature_found` event: adds feature to in-progress list
- On `log` event: appends to log state (displayed in the view)
- On `complete` event: fetches `GET /api/sessions/${sessionId}`, calls `onComplete(session)`
- On `error` event: transitions to failed state with error message
- `onError` reconnects after 2s

**What does NOT change:** Visual layout of RunningSessionView, elapsed timer, stop button, `onComplete` callback contract.

**Shell changes:** `goToRunSession` now also calls `POST /api/applications/[appId]/sessions/run` and navigates to the running screen with the returned `sessionId`.

**E2E test file to write:** `apps/application/tests/e2e/session-flow.spec.ts`
(Uses a mock SSE server that emits pre-scripted events — does not call real Claude)

**PRD ref:** Part 7.2

---

### TASK-015 · Handle 'running' session status in UI
**Status:** `[ ]`
**Depends on:** TASK-014
**Files to modify:**
- `apps/application/src/ApplicationHome.tsx`

**Test command:**
```sh
cd apps/application && bun run check-types && bunx playwright test tests/e2e/session-result.spec.ts
```

**What changes:**
- `SessionRow`: add visual treatment for `status === 'running'` (pulsing badge, same style as `run-status-badge`)
- `goToSession`: if the session's status is `'running'`, navigate to `running-session` screen instead of `session` screen. Requires fetching the session status first or passing it through the navigation.
- Session result topbar: if session status is `'failed'` or `'stopped'`, show the appropriate badge (already implemented visually, just ensure data flows correctly from API)

**E2E test file to write:** `apps/application/tests/e2e/session-result.spec.ts`
(Covers: feature expand/collapse, back navigation, running session row routes to running view)

**PRD ref:** Part 7.3

---

## Phase 5 — Test infrastructure

### TASK-016 · Playwright E2E config and fixture server
**Status:** `[ ]`
**Depends on:** nothing (infrastructure, can run before Phase 4)
**Files to create:**
- `apps/application/playwright.config.ts`
- `apps/application/tests/e2e/helpers/mock-sse-server.ts` (test double for SSE stream)
- `apps/application/tests/e2e/helpers/api-mock.ts` (intercept API calls in Playwright)

**Test command:**
```sh
cd apps/application && bunx playwright test --list
```

**Acceptance:** `playwright test --list` shows at least one test file. Config points at `http://localhost:3001` (dev server). `mock-sse-server` can emit a sequence of events on demand.

**PRD ref:** Test Plan Part 5

---

### TASK-017 · Eval fixture apps
**Status:** `[ ]`
**Depends on:** nothing
**Files to create:**
- `apps/application/tests/fixtures/apps/simple-shop/index.html` (product list, product detail, cart, checkout — 4 pages, full ARIA labels)
- `apps/application/tests/fixtures/apps/auth-wall/index.html` (landing + login form that never succeeds)
- `apps/application/tests/fixtures/apps/dashboard/index.html` (nav: users, reports, settings)
- `apps/application/tests/fixtures/apps/empty/index.html` (single page, no meaningful content)

**Test command:**
```sh
bunx serve apps/application/tests/fixtures/apps/simple-shop --port 4100 &
sleep 1
curl -s http://localhost:4100 | grep -q "role=" && echo "✓ ARIA roles present"
kill %1
```

**Acceptance:** Each fixture is serveable as static HTML. Every interactive element has an ARIA role, label, or accessible name — verifiable with `axe-core` or manual inspection. The simple-shop fixture has at least 4 distinct navigable pages.

**PRD ref:** Test Plan Part 4.1

---

### TASK-018 · Eval harness scaffolding
**Status:** `[ ]`
**Depends on:** TASK-011, TASK-017
**Files to create:**
- `apps/application/evals/run.ts`
- `apps/application/evals/scorer.ts`
- `apps/application/evals/fixtures/simple-shop.expected.ts`
- `apps/application/evals/fixtures/auth-wall.expected.ts`
- `apps/application/evals/fixtures/dashboard.expected.ts`
- `apps/application/evals/fixtures/empty.expected.ts`

**Test command:**
```sh
cd apps/application && bun run evals/run.ts --dry-run
```

**Acceptance:** `--dry-run` mode loads all expected specs and fixture definitions, validates their schema, and prints a run plan without actually calling Claude. No network calls in dry-run mode.

**PRD ref:** Test Plan Part 4.1, 4.2, 4.3

---

## Phase 6 — Integration and failure modes

### TASK-019 · DB integration tests
**Status:** `[ ]`
**Depends on:** TASK-001, TASK-002
**Files to create:**
- `apps/application/tests/integration/db-applications.test.ts`
- `apps/application/tests/integration/db-sessions.test.ts`
- `apps/application/tests/integration/db-session-events.test.ts`

**Test command:**
```sh
cd apps/application && bun test tests/integration/db-applications.test.ts tests/integration/db-sessions.test.ts tests/integration/db-session-events.test.ts
```

**Acceptance:** All cases from Test Plan Parts 2.1, 2.2, 2.3 pass against the test database.

**PRD ref:** Test Plan Part 2

---

### TASK-020 · Failure mode tests
**Status:** `[ ]`
**Depends on:** TASK-012
**Files to create:**
- `apps/application/tests/integration/failure-modes.test.ts`

**Test command:**
```sh
cd apps/application && bun test tests/integration/failure-modes.test.ts
```

**Acceptance:** All cases from Test Plan Part 6 pass. Most critical: no session is ever left permanently in `status = 'running'` after any failure scenario.

**PRD ref:** Test Plan Part 6

---

## Summary

| Phase | Tasks | Focus |
|-------|-------|-------|
| 1 — Foundation | 001–003 | DB, client, types |
| 2 — API layer | 004–009 | All API routes |
| 3 — Agent core | 010–012 | MCP, prompt, runner |
| 4 — Frontend | 013–015 | Replace mocks with real API |
| 5 — Test infra | 016–018 | E2E config, fixtures, eval harness |
| 6 — Integration | 019–020 | DB tests, failure modes |

**Total tasks:** 20
**Complete:** 0 / 20
