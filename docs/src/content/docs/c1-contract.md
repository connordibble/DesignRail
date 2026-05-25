---
title: Checkpoint 1 contract
description: The typed GraphQL, tool, and SQLite boundary for DesignRail's local MVP.
---

Checkpoint 1 establishes the local contract that later UI work builds on. It is still mock-mode first: no auth, no real Figma API, and no AI service credentials are required.

## Shared domain model

`@designrail/shared` owns Zod schemas and TypeScript types for:

- examples
- normalized component intent
- component mappings
- compliance findings
- review decisions
- export results
- instrumentation events
- dashboard metrics

Anything crossing a tool, API, or persistence boundary should validate against these schemas.

## GraphQL API

The API exposes the Phase 1 review contract:

- `examples`
- `componentIntent(exampleId)`
- `mapping(exampleId)`
- `compliance(mappingId)`
- `reviewDecisions`
- `dashboardMetrics`
- `saveReviewDecision(input)`
- `exportMapping(input)`

The review UI should use GraphQL for persisted decisions and exports. It should not bypass the API to write SQLite directly.
List queries are bounded, and the API applies basic query guardrails before resolver execution.

## Persistence

SQLite is local and credential-free. The default database path is `apps/api/.data/designrail.sqlite`, which is ignored by Git.

Drizzle schema ownership lives in `apps/api/src/db/schema.ts`. Migrations live in `apps/api/drizzle/`. Structured fields are stored as JSON text in C1 to keep the persistence layer simple while preserving typed application boundaries.

Core lookup paths have explicit indexes for example-to-intent, intent-to-mapping, mapping-to-findings, review decisions, exports, and instrumentation events.

## Tools

The import, mapping, and compliance tools are library-first. Library functions return domain objects, while CLI output is wrapped in a versioned JSON envelope:

- `figma-import` outputs a valid `ComponentIntent`
- `component-mapper` outputs a valid `ComponentMapping`
- `compliance-agent` outputs valid `ComplianceFinding[]`

The CLIs are thin wrappers around those library functions.
