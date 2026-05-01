# Glass — Test Plan
**Version 1.0 · May 2026 · Paired with: glass-implementation-prd.md**

---

## Testing philosophy

Glass has two fundamentally different kinds of code that need fundamentally different testing approaches:

**Deterministic code** (API routes, DB layer, session runner orchestration, frontend components) — standard unit and integration tests. Assert exact outputs. Automate everything.

**Non-deterministic code** (the Claude intelligence layer, the system prompt, the agent's exploration behaviour) — cannot be unit tested in the traditional sense. Requires an **eval suite**: known test applications with scored expected outputs. Run on a schedule, not in CI.

Do not try to make agent evals part of the PR gate. They are too slow, too expensive, and too variable. They belong in a separate evaluation pipeline.

---

## Testing stack

| Layer | Tool | Why |
|-------|------|-----|
| Unit + integration | `bun test` | Built-in, no config. Consistent with the rest of the monorepo. |
| API tests | `bun test` + `fetch()` | Against a real running test server. No mock framework. |
| Agent evals | Custom eval harness | `apps/application/evals/` — run manually or on a schedule. |
| E2E | Playwright | Already a dependency via `@playwright/mcp`. No extra install. |
| Test database | Neon branch | Separate branch of the same Neon project. Never the production DB. |

**Test script additions to `apps/application/package.json`:**
```json
"scripts": {
  "test":         "bun test",
  "test:watch":   "bun test --watch",
  "test:api":     "bun test tests/api/",
  "test:e2e":     "playwright test",
  "eval":         "bun run evals/run.ts"
}
```

---

## Test environment setup

### Test database

Use a Neon branch. Create it once:
```sh
# Neon CLI
neon branches create --name test --project-id <your-project-id>
```

Set `TEST_DATABASE_URL` in `.env.test`. The migration runs before the test suite:
```sh
psql "$TEST_DATABASE_URL" -f db/migrations/002_glass_core.sql
```

Add a `beforeAll` / `afterAll` in a shared test setup file that truncates all tables between test runs rather than dropping and recreating — faster.

**New file:** `apps/application/tests/setup.ts`
```typescript
import { pool } from '../src/lib/db'

export async function resetDb() {
  await pool.query(`
    truncate flows, features, session_events, sessions, environments, applications
    restart identity cascade
  `)
}
```

### Fixture applications

Small static HTML apps committed to the repo. The agent explores these during evals and E2E tests. They must be servable locally and have a predictable, known structure.

**New directory:** `apps/application/tests/fixtures/apps/`

| Fixture | What it is | Purpose |
|---------|-----------|---------|
| `simple-shop/` | 4 pages: product list, product detail, cart, checkout | Happy path eval — known features, known critical flows |
| `auth-wall/` | Landing page + login form that never succeeds | Tests `auth_required` detection |
| `dashboard/` | Admin UI with nav: users, reports, settings | Tests multi-feature mapping, critical flow classification (settings = critical) |
| `empty/` | Single page with no meaningful content | Tests graceful handling of apps with nothing to explore |

Each fixture is a directory of static HTML files. Served with:
```sh
bunx serve tests/fixtures/apps/simple-shop --port 4100
```

**Important:** Fixtures must have a complete, correct ARIA accessibility tree. If elements have no role, label, or name, the agent's `browser_snapshot` will not see them. This is intentional — it reflects the real constraint Glass operates under.

---

## Part 1 — Unit tests

### 1.1 `src/lib/utils.ts` — deriveInitials

**File:** `tests/unit/utils.test.ts`

```
deriveInitials('my-ecommerce-app')  → 'ME'
deriveInitials('admin portal')      → 'AP'
deriveInitials('SingleWord')        → 'SI'
deriveInitials('a')                 → 'A?' or however edge is handled — pick one behaviour and assert it
deriveInitials('')                  → '??'
deriveInitials('  spaces  ')        → handles trim
```

No external deps. These should be 10 lines total.

### 1.2 `src/lib/glass-prompt.ts` — buildSystemPrompt

**File:** `tests/unit/glass-prompt.test.ts`

```
buildSystemPrompt('my-app', 'https://staging.myapp.com')
  → contains 'my-app' in the output
  → contains 'https://staging.myapp.com' in the output
  → contains the report_findings tool schema
  → contains the word 'critical' (risk classification instruction)
  → contains the max-pages limit (40)
  → does not contain the word 'screenshot'  ← regression guard for the architectural constraint
```

The screenshot assertion is the most important one here. It's a cheap regression guard against someone accidentally adding screenshot instructions to the prompt.

### 1.3 `src/lib/session-runner.ts` — output parsing

The session runner receives Claude's `report_findings` tool call and parses the JSON into DB rows. Extract this parsing logic into a pure function and unit test it separately.

**New function to extract:** `parseAgentOutput(toolInput: unknown): ParsedSession`

**File:** `tests/unit/session-runner.test.ts`

```
valid output → returns { narrative, features, flows } correctly shaped
missing narrative field → throws with a clear message
features with no flows → handles gracefully (zero flows is valid)
risk value not in enum → defaults to 'standard', does not throw
unknown extra fields → ignored without error
empty features array → valid — some apps may have no discoverable features
```

### 1.4 `src/lib/playwright-mcp.ts` — tool filtering

Test that the MCP → Anthropic tool translation correctly strips disallowed tools.

**File:** `tests/unit/playwright-mcp.test.ts`

```
given a list of MCP tools that includes 'browser_take_screenshot'
  → translated Anthropic tools list does NOT include browser_take_screenshot
  → translated Anthropic tools list DOES include browser_navigate
  → translated Anthropic tools list DOES include browser_snapshot
  → tool input schemas are valid Anthropic tool schema objects
```

---

## Part 2 — Integration tests

These tests hit the real test database. Run `resetDb()` before each test.

### 2.1 Database — applications

**File:** `tests/integration/db-applications.test.ts`

```
insert application + environments
  → rows exist in both tables
  → environments.application_id FK is valid

update application name
  → name changes in applications table
  → initials updated

delete application
  → cascades to environments
  → cascades to sessions (if any)
  → cascades to features and flows

insert duplicate application id
  → throws unique constraint error
```

### 2.2 Database — session lifecycle

**File:** `tests/integration/db-sessions.test.ts`

```
create session with status 'running'
  → row exists, status = 'running', completed_at = null

complete session
  → status = 'completed', completed_at is set, token_count is set

insert features + flows for session
  → features ordered by position
  → flows ordered by position within feature
  → feature_count matches features.length

update environments.last_session_id
  → FK resolves correctly

delete session
  → cascades to features, flows, session_events
```

### 2.3 Database — session events

**File:** `tests/integration/db-session-events.test.ts`

```
insert multiple events for a session
  → events persist with correct session_id
  → created_at ordering is stable
  → metadata JSONB round-trips without data loss

query events for a session ordered by created_at
  → correct order
```

### 2.4 Session runner — with mocked Claude and Playwright MCP

The full `runAgent` function is integration-tested with:
- Real test database
- Mocked Anthropic API (returns a pre-scripted `report_findings` call)
- Mocked Playwright MCP subprocess (returns pre-scripted accessibility snapshots)

**File:** `tests/integration/session-runner.test.ts`

```
happy path — agent runs to completion
  → session status transitions: running → completed
  → features and flows written to DB
  → narrative written to DB
  → environments.last_session_id updated
  → Redis events published (use Upstash test instance or mock Redis)
  → completed_at is set
  → token_count matches mock Claude usage response

agent returns auth_required signal
  → session status = 'failed'
  → narrative contains 'auth_required'
  → no features written

stop flag set mid-run
  → agent stops after the current tool call completes (not mid-call)
  → session status = 'stopped'
  → features discovered before stop are written
  → completed_at is set

Claude API returns an error (network failure, 529 overload)
  → session status = 'failed'
  → error message written to narrative
  → no partial features written (all-or-nothing at the DB level)

Claude returns malformed JSON in report_findings
  → session status = 'failed'
  → session is not left in 'running' state indefinitely
```

The last assertion — **no session left permanently in 'running' state** — is the most operationally important. A stuck running session blocks the UI and confuses users. This must be tested explicitly.

---

## Part 3 — API contract tests

These tests run against a real Next.js test server. Start it before the suite:

```sh
# In test setup
const server = await startTestServer()  // wraps `next start` on a random port
```

Or use Next.js's `createServer` utility for in-process testing.

All API tests use the test database and reset between each test.

### 3.1 Applications API

**File:** `tests/api/applications.test.ts`

```
POST /api/applications
  → 201, returns { id, name, initials, environments }
  → id is correctly derived from name (slug)
  → initials are correctly derived
  → duplicate id returns 409

GET /api/applications
  → 200, returns array
  → empty workspace returns []
  → returns environments nested on each application
  → returns last_session data if sessions exist

GET /api/applications/[id]
  → 200 with full application data
  → unknown id returns 404

PATCH /api/applications/[id]
  → updates name and initials
  → updates environment URLs
  → unknown id returns 404
  → empty name returns 400

DELETE /api/applications/[id]
  → 200
  → subsequent GET returns 404
  → cascaded data is gone (verify via direct DB query)
```

### 3.2 Session trigger API

**File:** `tests/api/sessions-run.test.ts`

Mock `runAgent` so it doesn't actually call Claude. Test the API contract only.

```
POST /api/applications/[id]/sessions/run  { envType: 'staging' }
  → 200, returns { sessionId }
  → session record created in DB with status 'running'
  → runAgent was called with the correct sessionId (spy)

POST with envType 'local' where URL is localhost
  → reachability check fails
  → returns 400 { error: 'unreachable' }
  → no session record created
  → environments.reachability updated to 'unreachable' in DB

POST for unknown application id
  → 404

POST for valid app with no environment of that type
  → 400
```

### 3.3 Session result API

**File:** `tests/api/sessions-get.test.ts`

```
GET /api/sessions/[id]
  → 200, returns session with features and flows nested
  → features ordered by position
  → flows ordered by position within each feature
  → unknown id returns 404
  → running session returns 200 with status 'running' and null narrative
```

### 3.4 SSE stream API

**File:** `tests/api/sessions-stream.test.ts`

SSE tests require reading a streaming response. Use `fetch()` with a `ReadableStream` reader.

```
GET /api/sessions/[id]/stream
  → response Content-Type is 'text/event-stream'
  → keepalive comment sent within 15 seconds
  → events published to Redis appear in stream within 2 seconds
  → stream closes after 'complete' event received
  → stream closes after 'error' event received
  → unknown session id returns 404 (not a stream)
```

### 3.5 Session stop API

**File:** `tests/api/sessions-stop.test.ts`

```
POST /api/sessions/[id]/stop
  → 200
  → Redis stop flag is set
  → subsequent runAgent iteration checks flag and halts

POST for a session that is already 'completed'
  → 200 (idempotent — stopping an already-stopped session is fine)

POST for unknown session id
  → 404
```

---

## Part 4 — Agent evaluation suite

The eval suite tests the Glass intelligence layer — the system prompt and Claude's exploration behaviour — against the fixture apps. Not in CI. Run manually or on a schedule before releases.

**New directory:** `apps/application/evals/`

### 4.1 Eval harness

**New file:** `apps/application/evals/run.ts`

The harness:
1. Starts each fixture app on a local port
2. Runs a real Glass session against it (real Claude, real Playwright MCP)
3. Collects the session output
4. Scores it against an expected spec
5. Prints a report

```
bun run eval                    # run all evals
bun run eval --fixture simple-shop   # run one
bun run eval --model claude-opus-4-7 # override model
```

### 4.2 Expected specs

For each fixture app, define what a correct Glass run should produce.

**New file:** `apps/application/evals/fixtures/simple-shop.expected.ts`

```typescript
export const expected = {
  features: [
    { name: 'Product Catalogue', minFlows: 2 },
    { name: 'Shopping Cart',     minFlows: 2, hasCritical: true },
    { name: 'Checkout',          minFlows: 2, hasCritical: true },
  ],
  minFeatureCount: 3,
  maxPageCount: 10,
  narrative: {
    minLength: 100,  // chars
    mustContain: [], // no hardcoded strings — narratives vary
  },
}
```

Specs use **minimum counts and boolean assertions**, not exact matches. Claude will not find the same flows in the same words every run. Assert coverage properties, not exact output.

### 4.3 Scoring

**New file:** `apps/application/evals/scorer.ts`

Score each eval run:

| Check | Points |
|-------|--------|
| All expected features found (by semantic name match) | 30 |
| Critical flows correctly flagged | 20 |
| No critical flows incorrectly flagged as standard | 20 |
| `minFlows` met for each feature | 15 |
| Narrative length within bounds | 5 |
| Page count within `maxPageCount` | 5 |
| No `browser_take_screenshot` tool called | 10 (pass/fail) |
| Session completed within token budget (80k) | 5 (bonus) |

**Pass threshold: 70/100.** Below 70, the system prompt needs work before the build ships.

The screenshot check is always scored as a binary — calling it once is a complete failure regardless of other scores.

### 4.4 Semantic name matching

Features won't be named exactly "Shopping Cart" every run. Use a simple embedding similarity or a Claude judge call:

```typescript
async function featureNamesMatch(found: string, expected: string): Promise<boolean> {
  // Use Claude haiku with a simple prompt: "Do these refer to the same feature? yes/no"
  // Cheap — haiku, single token output
}
```

### 4.5 Eval fixtures — specific cases to cover

```
simple-shop eval
  → finds Product Catalogue, Cart, Checkout
  → Checkout and Cart have critical flows
  → does not visit more than 10 pages

auth-wall eval
  → returns { blocked: true, reason: 'auth_required' } OR session.status = 'failed'
  → does not invent fake features for pages it never accessed
  → narrative mentions the authentication barrier

dashboard eval
  → finds Settings or System Configuration feature
  → classifies settings flows as critical
  → finds at least 4 feature areas

empty eval
  → does not loop infinitely
  → returns within 60 seconds
  → feature_count = 0
  → narrative acknowledges limited content
  → session status is 'completed', not 'failed'
```

---

## Part 5 — E2E tests

Playwright tests against the running Glass application. Cover the full user journey — from adding an app to viewing a session result.

**New file:** `apps/application/tests/e2e/session-flow.spec.ts`

These tests mock the session runner at the API layer — they don't invoke Claude. The SSE stream is provided by a test double that publishes fake events on a schedule.

```
Add application
  → fill name + staging URL → submit
  → application appears on home screen
  → application card shows 'Never' for last session

Navigate to application
  → click card → lands on Environments tab
  → environment card shows the URL
  → environment card shows 'Reachable' (after the reachability check on add)
  → Run session button is present

Run session
  → click Run session on staging environment card
  → navigates to running session screen
  → env chip shows correct environment
  → 'running' badge pulses
  → features appear in the list as SSE events arrive
  → elapsed timer increments
  → Stop session button is present

Stop session
  → click Stop
  → status badge changes to 'stopped'
  → View results button appears
  → click View results → navigates to session result view
  → narrative is present
  → stat cards show feature count, page count, tokens
  → features expand/collapse

Complete session
  → mock SSE stream sends all features + complete event
  → View results button appears
  → session appears in Sessions tab with status 'completed'
  → environment card last session timestamp updates

Failed session
  → mock SSE stream sends error event mid-run
  → failed feature row shows ✗
  → error note card shows failure reason
  → session appears in Sessions tab with status 'failed'

Delete application
  → navigate to app Settings tab
  → click Delete → confirm
  → navigates back to Applications list
  → application no longer present
```

**New file:** `apps/application/tests/e2e/session-result.spec.ts`

```
Feature map interaction
  → all features collapsed by default except first
  → click feature header → expands flows
  → critical flows show red badge
  → standard flows show standard badge
  → clicking again collapses

Back navigation
  → from session result → back to sessions tab
  → from sessions tab → back to application view
  → from application view → back to applications list
  → browser back button — note: does not work (no URL routing), assert it stays on same screen

Running session re-entry
  → if a session with status 'running' is in the sessions list
  → clicking it navigates to the running session view, not the result view
```

---

## Part 6 — Failure mode tests

Explicit tests for the ways the system can fail in production. Most of these belong in the integration test suite.

**File:** `tests/integration/failure-modes.test.ts`

```
Database unavailable during session run
  → session runner catches DB error
  → attempts to update session status to 'failed' in DB
  → if that also fails, publishes error event to Redis so the frontend knows
  → does not leave the Playwright MCP subprocess running

Redis unavailable during session run
  → session runner continues running (Redis is streaming only, not write-critical)
  → session result is still written to DB at the end
  → frontend's SSE stream will show nothing, but result is accessible via GET /api/sessions/[id]

Playwright MCP subprocess crashes mid-session
  → session runner detects the subprocess exit
  → session status = 'failed'
  → partial features discovered before crash are NOT written (all-or-nothing)

Claude API returns a 529 (overloaded) during a run
  → session runner does NOT immediately fail
  → retries with exponential backoff, max 3 attempts
  → if all retries fail, session = 'failed'

Claude exceeds max token budget (80k) before calling report_findings
  → system prompt instructs Claude to call report_findings with whatever it has at this point
  → if Claude ignores this and runs out of tokens, session runner catches the context-length error
  → session status = 'failed' with a clear narrative message

Session left in 'running' state for more than 30 minutes
  → this is a hung session (crashed before cleanup)
  → a background cleanup job (or a check on GET /api/sessions/[id]) marks it 'failed'
  → UI does not show a permanently spinning session
```

---

## Part 7 — What not to test

**The Anthropic SDK internals.** Don't test that `anthropic.messages.create()` returns a message. That's Anthropic's responsibility.

**Playwright MCP internals.** Don't test that `browser_navigate` actually navigates a browser. That's Playwright's responsibility.

**React rendering correctness.** Don't test that `SessionResultView` renders a div. Trust the component structure. Test behaviour (expand/collapse), not markup.

**The exact narrative text.** Never assert `session.narrative === 'some string'`. Narratives vary. Assert `narrative.length > 50` or assert that it contains the app name.

**Every possible SQL query.** Test the public API of each module, not the internal queries. If `createApplication()` works correctly, the SQL it uses is an implementation detail.

**The visual appearance of the UI.** No pixel snapshots, no screenshot assertions. Glass's own architectural constraint applies here too.

---

## Files changed — complete index

| File | Status | Purpose |
|------|--------|---------|
| `apps/application/tests/setup.ts` | New | Shared test helpers, `resetDb()` |
| `apps/application/tests/unit/utils.test.ts` | New | `deriveInitials` unit tests |
| `apps/application/tests/unit/glass-prompt.test.ts` | New | Prompt content assertions, screenshot regression guard |
| `apps/application/tests/unit/session-runner.test.ts` | New | `parseAgentOutput` pure function tests |
| `apps/application/tests/unit/playwright-mcp.test.ts` | New | Tool filtering, screenshot tool exclusion |
| `apps/application/tests/integration/db-applications.test.ts` | New | Application + environment CRUD against test DB |
| `apps/application/tests/integration/db-sessions.test.ts` | New | Session lifecycle against test DB |
| `apps/application/tests/integration/db-session-events.test.ts` | New | Event persistence |
| `apps/application/tests/integration/session-runner.test.ts` | New | Full runner with mocked Claude + Playwright |
| `apps/application/tests/integration/failure-modes.test.ts` | New | Resilience: DB down, Redis down, crashes, hung sessions |
| `apps/application/tests/api/applications.test.ts` | New | Applications CRUD API contract |
| `apps/application/tests/api/sessions-run.test.ts` | New | Session trigger API contract |
| `apps/application/tests/api/sessions-get.test.ts` | New | Session result API contract |
| `apps/application/tests/api/sessions-stream.test.ts` | New | SSE stream API contract |
| `apps/application/tests/api/sessions-stop.test.ts` | New | Stop signal API contract |
| `apps/application/tests/e2e/session-flow.spec.ts` | New | Full user journey E2E |
| `apps/application/tests/e2e/session-result.spec.ts` | New | Session result view interactions |
| `apps/application/tests/fixtures/apps/simple-shop/` | New | Eval fixture: simple e-commerce app |
| `apps/application/tests/fixtures/apps/auth-wall/` | New | Eval fixture: login-gated app |
| `apps/application/tests/fixtures/apps/dashboard/` | New | Eval fixture: admin dashboard |
| `apps/application/tests/fixtures/apps/empty/` | New | Eval fixture: no meaningful content |
| `apps/application/evals/run.ts` | New | Eval harness entry point |
| `apps/application/evals/scorer.ts` | New | Scoring logic |
| `apps/application/evals/fixtures/simple-shop.expected.ts` | New | Expected spec for simple-shop |
| `apps/application/evals/fixtures/auth-wall.expected.ts` | New | Expected spec for auth-wall |
| `apps/application/evals/fixtures/dashboard.expected.ts` | New | Expected spec for dashboard |
| `apps/application/evals/fixtures/empty.expected.ts` | New | Expected spec for empty |
| `apps/application/package.json` | Modified | Add test scripts |
| `apps/application/.env.test` | New | `TEST_DATABASE_URL` and test Redis creds |
| `playwright.config.ts` (root or app level) | New | Playwright E2E config pointing at test server |

---

## CI pipeline shape

```
PR gate (fast, < 2 min)
  bun run check-types
  bun test tests/unit/

Merge to main (medium, < 10 min)
  bun test tests/unit/
  bun test tests/integration/    ← test DB
  bun test tests/api/            ← test server
  playwright test                ← E2E with mocked runner

Weekly / pre-release (slow, ~20 min, costs real tokens)
  bun run eval                   ← real Claude, real Playwright MCP
  threshold check: score >= 70 on all fixtures
```

---

*Test the plumbing deterministically. Evaluate the intelligence continuously.*
