# Glass — Product Definition
**Version 1.0 · April 2026**

---

## What Glass Is

Glass is a QA intelligence tool that keeps pace with AI-speed development.

It sits between your running application and your QA workflow — exploring what your product actually does and producing the structured test specifications that every other QA activity depends on.

Glass is not a test runner. It is not a repo analyser. It is not another AI chat interface you prompt manually. It is the QA layer that modern development teams are missing: always grounded in the real application, always producing something immediately useful.

---

## The Problem

AI has made developers dramatically faster. Features ship faster. PRs merge faster. Codebase changes compound faster.

QA has not kept up.

Test planning is still manual. Test specifications are still written from memory and intuition. Coverage is still guesswork. By the time a QA engineer has mapped what needs testing, the application has already moved.

The tools that exist today solve adjacent problems. Cursor and Claude Code help developers write and fix code — including test code — but they have no QA context, no product knowledge, no understanding of risk or coverage. They fix what you show them. They don't know what you're missing.

Glass solves the upstream problem. Before any test is written, before any automation is run, Glass answers the question every QA engineer has to answer from scratch every sprint: **what actually needs to be tested, and how?**

---

## Who Glass Is For

**Primary users:**

- **QA engineers and SDETs** who are responsible for test coverage but are overwhelmed by the pace of development. They need to produce test specifications, track what's covered, and hand off to automation — all faster than is currently possible.

- **Full-stack developers wearing a QA hat** — engineers on small teams who own quality without a dedicated QA function. They know they should be testing more rigorously but don't have the QA expertise or time to produce proper specifications from scratch.

**What they have in common:** They care about quality, they're technically capable, and they're losing ground to the speed of AI-assisted development. They are not looking for another report. They need something that does the work.

---

## What Glass Does

### Core action (MVP)

**Glass explores a running web application and generates structured manual test specifications.**

The user provides a URL. Glass navigates the application autonomously — mapping pages, interactions, user flows, and edge cases — using Playwright's accessibility tree (no screenshots, no pixel-based analysis). It thinks like a senior QA engineer: identifying critical paths, user journeys, boundary conditions, and areas of risk.

The output is a structured set of manual test specifications: human-readable, organised by feature area or user journey, with steps, expected outcomes, and the reasoning behind each scenario. These specs are immediately usable — by a human tester, by an automation agent, or as input for the next stage of the Glass pipeline.

### Why this unlocks everything

The test specification is the source of truth for QA. Once it exists:

- It can be passed to automation agents (including Playwright's Generator agent) to implement E2E tests without manual scripting
- It can be compared against new requirements and acceptance criteria to determine what has changed and what is at risk
- It becomes the baseline against which coverage is measured — not lines of code, but actual user journeys

Without it, every other QA activity starts from zero. With it, Glass has a foundation to build on.

---

## What Glass Does Not Do (MVP)

These are deliberate boundaries, not limitations. They define where Glass starts — not where it ends.

- **Glass does not write or run automated tests.** It produces specifications that automation agents can act on. The distinction matters: Glass owns the QA thinking, not the code generation.

- **Glass does not analyse existing test code.** It is not a test suite auditor. It does not read your repo, score your selectors, or report on your Playwright conventions.

- **Glass does not connect to Jira, Linear, or any ticket system.** Ingesting requirements and mapping coverage to acceptance criteria is a next-stage capability, not an MVP dependency.

- **Glass does not integrate with CI/CD pipelines.** There are no PR hooks, no pipeline gates, no per-merge triggers in the MVP.

- **Glass does not use screenshots or visual/pixel-based analysis.** All application understanding comes from the accessibility tree. This is a permanent architectural decision, not a temporary constraint.

---

## How It Works (Technical Overview)

Glass uses Playwright's Model Context Protocol (MCP) server as its browser automation layer. The MCP server exposes the application's accessibility tree to the Glass intelligence layer — structured, reliable, fast — without any dependency on visual rendering or fragile CSS selectors.

The Glass intelligence layer (built on an LLM) receives this structured application data and reasons about it the way a QA engineer would: identifying flows, inferring user intent, determining what's testable and what's risky.

The output is structured markdown — the same format that feeds directly into Playwright's Generator agent when automation is the next step.

The chain: **Glass Planner → structured spec → Playwright Generator → automated tests.**

Glass owns the first step. It makes every step after it better.

---

## What Success Looks Like

A QA engineer on a team of five points Glass at a staging URL on Monday morning. By the time their first standup starts, Glass has produced a complete set of test specifications for the current state of the application. They review, adjust for any domain knowledge Glass couldn't infer, and have a working test plan before anyone else has opened their laptop.

That same spec is passed to an automation agent in the afternoon. By end of day, a suite of E2E tests exists that didn't exist that morning.

Next sprint, a developer ships a new feature. The QA engineer points Glass at the changed area. Glass identifies what's new, what's different, and what the new specifications should be. Coverage stays current without starting from scratch.

That is the problem Glass solves. That is what done looks like.

---

## What Glass Is Not Trying To Be

- It is not a replacement for QA engineers. It is an amplifier.
- It is not a general-purpose AI coding assistant.
- It is not a test management platform (yet).
- It is not competing with Playwright, Cypress, or any test framework. It feeds them.
- It is not trying to do everything on day one.

---

## Next Capabilities (Post-MVP, In Order of Priority)

1. **Requirements ingestion** — ingest tickets, PRs, or acceptance criteria and determine what specifications need to change
2. **Coverage mapping** — show which user journeys have automated tests and which don't
3. **Change detection** — re-explore on a schedule or trigger, surface what's new or different
4. **Automation handoff** — direct integration with Playwright Generator agent to move from spec to test without leaving Glass

---

*Glass. The QA layer that keeps pace.*
