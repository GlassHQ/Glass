# Glass — Claude Code Briefing
**Date: April 2026 · Status: Ready to build**

This document captures all product, architecture, and UI decisions made in the planning session. Use it as the source of truth when building Glass. Do not deviate from the decisions recorded here without flagging it explicitly.

---

## What Glass Is

Glass is a QA intelligence tool that explores running web applications and produces a structured understanding of what the application does — its features, flows, and risk areas — at the application and feature level (not test case level).

It is not a test runner, not a repo analyser, not a test case management tool. It is the upstream QA layer that feeds everything else.

**The core action:** Point Glass at a URL. Glass explores the application using Playwright MCP (accessibility tree only — no screenshots ever, under any circumstance). Glass returns a feature map and a narrative summary of what it found.

---

## Technical Architecture

### Browser automation
- Playwright MCP server is the browser automation layer
- Glass reads the accessibility tree exclusively — no screenshots, no visual/pixel analysis
- This is a permanent architectural constraint, not a temporary one
- Playwright v1.56+ required (for agent support)

### Intelligence layer
- LLM (Claude) receives structured accessibility data from Playwright MCP
- Reasons about the application like a senior QA engineer
- Identifies features, user journeys, critical paths, and risk areas
- Outputs structured markdown

### Session output format
Each session produces two things:
1. A narrative summary — plain English description of the application, its complexity, notable areas
2. A feature map — structured list of features, each with flows and a risk signal (critical / standard)

### No test case output
The MVP does not produce test cases, steps, or expected outcomes. Features and flows only. This is a deliberate scope decision.

---

## Data Model

### Workspace
Top level. A user belongs to one workspace.

### Application
- Name
- Icon initials (derived from name)
- Created at
- Schedule settings (see Scheduling section)
- Has many: Environments, Sessions

### Environment
- Type: `local` | `staging`
- URL
- Reachability status: `reachable` | `auth_required` | `unreachable`
- Last session reference
- Schedule override (if app-level schedule is off)

### Session
- ID
- Application ID
- Environment ID
- Status: `running` | `completed` | `failed` | `stopped`
- Started at / completed at
- Token count (tracked and displayed)
- Feature count
- Page count
- Output: narrative summary (string) + feature map (structured JSON)

### Feature (session output)
- Name
- Flows: array of { description, risk: `critical` | `standard` }

---

## UI Structure & Views

### Navigation hierarchy
```
Home (Applications list)
  └── Application view
        ├── Environments tab
        └── Sessions tab
              └── Session result view
```

### 1. Home — Applications list

The primary landing view. Shows all applications as cards.

**Application card anatomy:**
- Left border colour = urgency signal: red (alert), amber (warning), none (ok)
- Header: icon initials, app name, URLs, environment chips
- Three signal columns (always in this order):
  1. **Last session** — time since last session, which env. Colour: warning if >7 days, ok if recent
  2. **Drift** — changes detected since last session. Colour: alert if changes exist, muted if none
  3. **Risk** — critical flows flagged by Glass. Colour: alert if 3+, warning if 1-2, ok if none
- Footer: schedule status + Run now button + View last session button

**Card border logic:**
- Red left border: drift changes exist OR 3+ critical flows
- Amber left border: 1-2 critical flows, no drift
- No accent border: all clear

**Free vs Pro on the card:**
- Free: footer shows "Manual run" with grey dot, Pro lock badge on schedule
- Pro: footer shows schedule cadence (e.g. "Daily · 08:00") with green dot, no lock badge

### 2. Application view — Environments tab

Two environment cards side by side: Local and Staging.

Each card shows:
- Environment label and name
- URL in monospace
- Reachability status with colour dot
- Last session timestamp
- Run session button (primary)
- Edit URL button (secondary)

No compare view. The compare feature has been explicitly removed from scope.

### 3. Application view — Sessions tab

List of all sessions for this application across both environments.

Each session row shows:
- Environment pill (local = green, staging = purple)
- Date and time
- Feature count, page count, status
- Token count (monospace)
- Chevron to open result

### 4. Session result view

Accessed by clicking a session row. Back button returns to session list.

Layout (top to bottom):
1. Result topbar — back button, session date/env, token count pill
2. Narrative summary card — Glass's plain English description of the application
3. Stats row — 3 metric cards: Features, Pages, Tokens
4. Feature map — one collapsible section per feature, flows listed inside with risk badges

**Feature section:**
- Header: feature name, flow count, chevron
- Rows: flow description + risk badge (critical = red, standard = blue)
- Collapsed by default except the first feature

### 5. Active session view (running state)

Shown when a session is in progress.

Layout:
1. Topbar — "Session running", environment URL, Stop button
2. Running card — progress bar + live log
3. Stats row — feature count, page count, token count (all update in real time)

**Live log format:**
```
HH:MM:SS  message text
```
Log entries are colour coded:
- Purple: feature identified, session started
- Green: navigation completed, accessibility read
- Default: general exploration steps

---

## Scheduling

### Free tier
- Manual run only
- Run Now button always visible
- No schedule configuration available
- Upgrade nudge in sidebar pointing to Pro

### Pro tier
- Application-level schedule: on/off toggle
  - When ON: all environments inherit the schedule, per-environment controls are hidden
  - When OFF: each environment exposes its own schedule control
- Schedule options: daily (with time), weekly (with day + time)
- Schedule shown in card footer with green active dot

---

## Tier System

### Free
- Manual session triggering only
- Full access to session output (feature map + narrative)
- Full session history
- Token count visible always

### Pro
- Everything in Free
- Application-level auto-run schedules
- Per-environment schedule overrides when app-level schedule is off

### Tier UI behaviour
- Tier pill in sidebar top right: "Free" (grey) or "Pro" (purple)
- Free users see upgrade nudge box at sidebar bottom
- Pro lock badges appear on schedule controls for Free users
- No features are hidden — Free users see what Pro unlocks, just can't use it

---

## Design System

### Colours (key values)
- Primary accent: `#7F77DD` (purple)
- Purple light fill: `#EEEDFE`
- Purple text: `#534AB7`
- Purple dark text: `#3C3489`
- Alert red: `#E24B4A` / `#A32D2D`
- Warning amber: `#BA7517` / `#854F0B`
- OK green: `#639922` / `#3B6D11`
- Local env pill: green (`#E1F5EE` / `#0F6E56`)
- Staging env pill: purple (`#EEEDFE` / `#534AB7`)

### Typography
- System font stack: `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- Monospace: `'SF Mono', 'Fira Code', monospace` — used for URLs, token counts, log output
- Two weights only: 400 (regular), 500 (medium/bold)
- No weights above 500

### Layout
- Border radius: 8px (components), 12px (cards)
- Borders: `0.5px solid` throughout — tertiary (`#e0e0da`) default, secondary (`#c0c0ba`) hover/emphasis
- Card left accent borders (urgency): `3px solid` — the only place 3px is used
- No shadows except on the outermost app container
- No gradients anywhere

### Spacing
- Card padding: `14px 16px`
- Content area padding: `20px`
- Gap between cards: `12px`
- Signal columns: `10px 14px`

---

## Explicit Out of Scope (MVP)

Do not build these. Do not add them "just in case."

- Test case generation (steps, expected outcomes)
- Test case editing interface
- Test suite analysis or repo reading
- Jira / Linear / GitHub integration
- CI/CD pipeline integration
- Environment comparison view
- Screenshot or visual analysis of any kind
- User authentication beyond basic session (build this last)
- Team/multi-user features

---

## Files Already Produced

- `glass-product-definition.md` — full product definition document
- `glass_home_view.html` — interactive HTML mockup of the home view (reference for UI implementation)

The home view mockup is the design reference for the application card component, tier toggle behaviour, signal colours, and schedule state display. Match it closely.

---

## Where to Start

Suggested build order:

1. Data models and basic API routes (Application, Environment, Session)
2. Playwright MCP integration — connect to a URL, read accessibility tree, return structured data
3. LLM layer — take accessibility data, produce feature map + narrative summary
4. Session runner — orchestrate MCP + LLM, persist output, track tokens
5. Home view — application cards with signal logic
6. Application view — environments + session history
7. Session result view — narrative + feature map display
8. Live session view — real-time log + stats
9. Scheduling (Pro) — last, after core flow is solid

---

*Built by a QA engineer who got tired of falling behind.*
