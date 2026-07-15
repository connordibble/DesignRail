---
title: ADR-0003 — In-browser demo engine over a hosted server
description: Why the public DesignRail demo runs the real GraphQL contract against WASM SQLite in the visitor's tab instead of a deployed API.
---

## Status

Accepted.

## Context

DesignRail needed a hosted demo a visitor can open without cloning the repository. The local stack is a Vite-built review console talking GraphQL to a Fastify/Apollo API that owns a SQLite database seeded from deterministic fixtures.

Hosting that stack as-is conflicts with the project's own production boundary: a public server would accept anonymous write mutations, share one database across every visitor, and require the identity, tenancy, rate-limiting, and observability work the README explicitly scopes out. Free-tier servers also cold-start slowly, and the demo's first audience is someone clicking a link once.

## Decision

- The hosted demo is a static build published to GitHub Pages; no DesignRail server runs on the internet.
- A demo build flag (`VITE_DESIGNRAIL_DEMO_MODE=true`) swaps Apollo's HTTP link for a `SchemaLink` executing the API's own typeDefs and resolvers in the browser.
- The API exposes this as `@designrail/api/engine`: the same repositories, drizzle migrations, seed registry, and fixture pipeline, constructed over a sql.js (WASM SQLite) database instead of better-sqlite3.
- The repository contract is typed against the driver-agnostic `DesignRailDatabase`; only migration tooling requires the better-sqlite3-backed `ServerDatabaseClient`.
- Node-only concerns (filesystem fixture discovery, file reads) stay in Node-only modules; browser-reachable modules must not import Node built-ins or native drivers.
- A parity test boots both drivers, replays the seed-and-ingest startup, and asserts the review workspaces are identical, so the demo cannot drift from the served API silently.

## Consequences

- Every visitor gets an isolated, disposable workspace: the decision gate stays writable without exposing shared state to defacement.
- The demo costs nothing to run, has no cold start, and adds no credential or network surface, keeping the public-safety rules intact.
- The GraphQL-as-contract claim is now demonstrated, not just documented: the same schema executes over HTTP locally and in-process in the demo.
- The demo bundle grows by the WASM SQLite runtime (~330 KB gzipped), which is acceptable for a portfolio surface.
- Demo persistence is per-tab and resets on reload; durable multi-user review remains out of scope, as before.

## Alternatives considered

- **Host the stack on a small VM or container** — rejected. Shared mutable demo state degrades publicly, anonymous mutations need abuse controls, and an always-on server costs money to avoid cold starts.
- **Per-session server-side databases** — rejected. Solves defacement but keeps the server, its costs, and its rate-limiting burden for no additional product proof.
- **Read-only hosted demo** — rejected. The human decision gate is the product; a demo that cannot accept, reject, or edit removes the thing worth demonstrating.
