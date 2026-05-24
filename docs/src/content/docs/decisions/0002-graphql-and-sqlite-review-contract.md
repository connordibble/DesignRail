---
title: ADR-0002 — GraphQL and SQLite as the local review contract
description: Why DesignRail uses GraphQL over API-owned SQLite for the credential-free review workflow.
---

## Status

Accepted — Checkpoint 1, Phase 1.

## Context

DesignRail's first useful product surface is the review UI. It needs a stable way to read examples, mappings, compliance findings, review decisions, exports, and dashboard metrics without requiring external credentials.

The MVP also needs to stay easy to run in public: mock fixtures by default, no auth, no Figma token, no AI token, and no hosted database.

## Decision

- GraphQL is the contract between the review UI, API, local persistence, and pipeline outputs.
- SQLite is the default local persistence layer.
- Drizzle schema ownership lives in `apps/api`.
- Review decisions and instrumentation events are persisted through the API.
- Structured fields are stored as JSON text in C1.
- Mock mode remains the default path for development, tests, docs, and demos.

## Consequences

- The review UI can be built against a real API contract before the full Button UI flow exists.
- Local demos are credential-free and deterministic.
- SQLite files stay local-only under `apps/api/.data/`.
- JSON text columns are acceptable for C1 because Zod validates data at application boundaries.
- If structured querying over nested fields becomes important, we can promote selected JSON fields into first-class columns later.

## Alternatives considered

- **In-memory state only** — rejected. It would make review decisions and dashboard metrics feel disposable.
- **Postgres from day one** — rejected. It adds setup friction before the product contract is proven.
- **UI writes directly to SQLite** — rejected. It bypasses GraphQL and weakens the review audit boundary.
