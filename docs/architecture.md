# DesignRail Architecture

DesignRail is a review-first design-to-engineering handoff system. The core idea is simple: generated implementation proposals should pass through deterministic checks and human approval before they become export-ready code or agent instructions.

## System Overview

The local demo runs a React/Vite review workspace and a Fastify/Apollo GraphQL API. Mock Figma-style JSON fixtures are normalized into component intent, mapped to Shoelace Web Components, reviewed for compliance, persisted through SQLite, and displayed in the review UI.

```text
Mock fixture -> ComponentIntent -> Shoelace mapping -> compliance findings -> human decision -> export
```

The review UI is the product surface. Importers, mapping logic, validators, persistence, and exports exist to make that review trustworthy.

## GraphQL Contract

GraphQL is the contract between the UI, API, persistence layer, and pipeline outputs. The UI reads:

- `examples` for the selector, decision status, and compliance summary.
- `reviewWorkspace(exampleId)` for source intent, proposed mapping, findings, the latest decision, full decision history, and exports.
- `dashboardMetrics` for aggregate review state.
- `complianceLedger` for every compliance finding across every example, most severe first, powering the Compliance Timeline tab's cross-component audit view.

The UI writes decisions and exports through mutations. It does not bypass GraphQL for persisted review decisions.

## Review Decision Model

Mappings start as `PENDING`. A reviewer can save:

- `ACCEPTED`: approve the recommended mapping.
- `REJECTED`: mark the proposal unsuitable and lock new exports.
- `EDITED`: save a human-adjusted mapping that can be exported.

Only the latest accepted or edited decision unlocks new exports. Historical exports remain visible as audit history when a later decision locks the gate.

Every saved decision is retained (never overwritten); the review UI's History tab surfaces the full per-mapping timeline, and EDITED entries can be expanded to diff the human-edited values against the originally recommended mapping.

## Deterministic Validator

DesignRail keeps the demo deterministic. Zod schemas validate raw mock fixtures, normalized component intent, mapping results, compliance findings, decisions, exports, and instrumentation events. The local pipeline commands reproduce fixture-backed outputs:

- `pnpm design:import`
- `pnpm design:map`
- `pnpm compliance:review`
- `pnpm design:verify`

The full `pnpm check` gate also covers secrets, mock-mode safety, types, lint, formatting, GraphQL, database drift, tests, compliance review, and design verification.

## Mock Adapter vs Future Figma MCP Adapter

Mock mode is the default and does not require credentials. The current adapter reads public-safe JSON fixtures from `examples/` and normalizes them into `ComponentIntent`.

A future Figma MCP/API adapter should sit at the same boundary. It can fetch real design nodes only when explicitly configured, but it must produce the same normalized contract before mapping, review, persistence, or export. That keeps real-service integration optional and prevents live credentials from becoming part of the demo path.

## Export Path

Exports are generated from the effective mapping selected by the latest review decision:

- Accepted mappings export the original recommendation.
- Edited mappings export the reviewer-adjusted mapping.
- Rejected or pending mappings cannot create new exports.

The current demo supports HTML, React, and Agent Brief output. Agent briefs give AI coding tools structured context without letting them skip the human review gate: each brief carries the mapping's props and slot, the authorizing review decision (status, reviewer, timestamp), a compliance summary, any blocking findings, and an explicit directive not to change the mapping without a new human review decision.

## Keeping Humans In Control

DesignRail treats AI-assisted implementation as a proposal workflow, not an autonomous code path. The architecture keeps humans in control by making the rationale, confidence, deterministic findings, editable mapping fields, saved reviewer decision, and export gate visible in one review surface.
