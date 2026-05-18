---
title: DesignRail
description: Design-to-engineering handoff review platform.
---

DesignRail is an internal tooling platform that closes the design-to-engineering handoff gap. It ingests Figma-style component data, maps design intent to [Shoelace](https://shoelace.style/) Web Components, runs deterministic compliance review, and presents everything in a React human-review UI where developers accept, reject, or correct mappings before exporting HTML and React examples.

## Phase 1 scope

The Phase 1 MVP is credential-free by default: mock Figma fixtures, deterministic mapping rules, and SQLite-backed review decisions. Real Figma API and Claude API integrations are explicit opt-ins layered on after the MVP is stable.

The first vertical slice is **Button**, end to end: fixture → normalized intent → Shoelace mapping → compliance findings → GraphQL → persisted review decision → React review UI → HTML/React export → dashboard counters update.

## Architecture

- **apps/web** — React + Vite review UI
- **apps/api** — Fastify + Apollo GraphQL server; SQLite via Drizzle lands in Checkpoint 1
- **packages/shared** — domain types and Zod schemas
- **packages/schema** — Shoelace component schemas (props, slots, variants, parts)
- **packages/design-tokens** — design tokens that map to Shoelace CSS custom properties
- **tools/figma-import**, **tools/component-mapper**, **tools/compliance-agent** — typed pipeline libraries, CLI is a thin wrapper

GraphQL is the single contract between UI and persistence. AI proposes; humans review; deterministic checks enforce quality.

## Architecture decisions

Architectural decisions are recorded in the **Architecture Decisions** section in the sidebar.
