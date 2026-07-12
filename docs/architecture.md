# DesignRail Architecture

DesignRail is a review-first design-to-engineering handoff system. A generated component proposal must pass deterministic checks and receive an explicit human decision before it can produce new export-ready code or agent instructions.

## System overview

The local demo runs a React/Vite review console and a Fastify/Apollo GraphQL API. Public mock Figma-style fixtures are normalized into component intent, mapped to Shoelace Web Components, reviewed for compliance, persisted in SQLite, and presented for developer review.

```text
Mock fixture -> ComponentIntent -> Shoelace mapping -> compliance findings -> human decision -> export
```

The review console is the product surface. Importers, schemas, validators, persistence, and export generators exist to make that review understandable and auditable.

## GraphQL contract

GraphQL is the contract between the UI, API, persistence layer, and deterministic pipeline outputs. The UI reads:

- `examples` for selector state, latest decision status, and compliance summaries.
- `reviewWorkspace(exampleId)` for intent, proposal, findings, latest decision, decision history, and exports.
- `dashboardMetrics` for aggregate review state.
- `complianceLedger` for cross-example findings ordered by severity.

The UI writes through three mutations:

- `saveReviewDecision` persists an accepted, rejected, or edited decision.
- `exportMapping` creates output only when the latest decision opens the export gate.
- `recordUiEvent` records namespaced `ui.*` client events in the same instrumentation ledger used by server-side decision and export events.

`RecordUiEventInput` accepts a name, optional example ID, and JSON metadata. The API validates the `ui.*` namespace, stores the event with entity type `UI`, and returns the persisted instrumentation event. The web client sends these events without blocking the review flow; telemetry failure cannot prevent navigation, review, or export.

## URL state

The browser URL is the public state contract for workspace navigation:

```text
?view=<dashboard|compliance|review|history|exports|schema>&example=<example-id>
```

The web client validates both values, falls back to Review for unknown views, and replaces invalid example IDs after the example list resolves. User navigation pushes history entries, while corrections replace the current entry. Back, forward, refresh, and shared links therefore restore the same view and example. Multi-field actions such as **Load Button demo** write one atomic history entry.

## Review decision model

Mappings begin as `PENDING`. A reviewer can save:

- `ACCEPTED`: approve the recommended mapping.
- `REJECTED`: mark the proposal unsuitable, provide a required rationale, and lock new exports.
- `EDITED`: save a schema-valid human adjustment that can be exported.

Every decision is appended rather than overwritten. Rejection rationale is stored in the decision notes field and appears in the audit history. Edited decisions retain the adjusted mapping, and the History view computes a field-level diff against the original recommendation.

Only the latest accepted or edited decision unlocks new exports. Historical exports remain visible as audit records if a later decision locks the gate.

## Deterministic validator

Zod schemas validate raw fixtures, normalized intent, mapping results, findings, decisions, exports, and instrumentation events. These commands reproduce fixture-backed outputs:

- `pnpm design:import`
- `pnpm design:map`
- `pnpm compliance:review`
- `pnpm design:verify`

The full `pnpm check` gate also covers secrets, mock-mode safety, types, lint, formatting, GraphQL drift, database drift, tests, compliance review, and design verification.

## Export path

Exports use the effective mapping authorized by the latest review decision:

- Accepted mappings export the original recommendation.
- Edited mappings export the reviewer-adjusted mapping.
- Rejected or pending mappings cannot create new exports.

The demo supports HTML, React, and Agent Brief output. Agent briefs carry the mapping, authorizing decision, compliance summary, blocking findings, and an instruction not to change the mapping without another human review decision.

## Mock adapter and production boundary

Mock mode is the default and does not require credentials. The current adapter reads public JSON fixtures from `examples/` and emits `ComponentIntent`.

A future Figma MCP or API adapter belongs at the same boundary. It may fetch live design nodes only under explicit configuration, and it must normalize them into the existing contract before mapping, compliance, persistence, or export. A hosted system would additionally require identity, authorization, tenancy, durable storage, rate limits, and operational telemetry; those concerns are intentionally outside the local demo.

## Keeping humans in control

DesignRail treats AI-assisted implementation as a proposal workflow. Confidence, rationale, deterministic findings, editable fields, saved decisions, and the export gate stay visible in the same review surface. Generated output is never the authority; the recorded human decision is.
