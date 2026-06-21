---
title: Checkpoint 2 pipeline
description: The schema-driven, multi-component mapping pipeline behind DesignRail's review contract.
---

Checkpoint 2 turns the Checkpoint 1 contract from a single stubbed Button slice into a real,
deterministic pipeline that generalizes across components. It stays mock-mode first: no auth, no
real Figma API, and no AI service credentials are required. The GraphQL and SQLite contract from
Checkpoint 1 is unchanged — C2 fills in logic and data behind it.

## Component schema registry

`@designrail/schema` is the source of truth for the Shoelace components DesignRail can target.
Each `ShoelaceComponentSchema` records, for one component:

- `tag` (e.g. `sl-button`), `libraryVersion` (`shoelace@2.20.1`), and a `sourceUrl` for auditability.
- `props`, each with a `kind` (`enum` / `boolean` / `string` / `number`), allowed `values`, a
  `default`, the design-intent keys it maps from (`intentKeys`), and its export names
  (`htmlAttribute`, `reactProp`) so divergences like `help-text` vs `helpText` are explicit.
- `slots` (a `default` slot marks a component that carries text; its absence marks a childless
  component such as Input).
- `events`, modeled as `native` (e.g. `click`) or `custom` (e.g. `sl-input`) with a React handler name.

The registry currently covers **Button** and **Input**.

## Deterministic pipeline

The three tools are library-first and deterministic. Each is tested to reproduce the canonical
fixtures exported from `@designrail/shared`:

- `figma-import` validates a raw fixture against `mockFigmaFixtureSchema`, then normalizes it into a
  `ComponentIntent`.
- `component-mapper` resolves the component schema for the intent's `componentType` and derives a
  `ComponentMapping`: props are matched by `intentKeys` and coerced against the schema, the default
  slot (when present) is filled from the intent label, events and tokens are projected, and a
  `confidence` plus generated `rationale`/`fallbackNotes` summarize coverage gaps.
- `compliance-agent` emits schema-aware findings across accessibility, variant coverage, token
  usage, design-system alignment, and React readiness, in a stable order.

## Multi-example review

The API seeds Button and Input from the canonical registry (`EXAMPLE_REGISTRY`). Seed-owned rows
are upserted and seed findings are replaced on each boot, so re-seeding a local database refreshes
the mappings without stranding stale rows. Unchanged re-seeds leave review decisions, exports, and
instrumentation events untouched. If a seed-owned mapping's **content changes**, however, the prior
review no longer applies to it, so its decisions and exports are cleared and it returns to pending
for re-review — keeping the audit trail honest across versions.

Edited mappings are validated server-side before they are saved: `saveReviewDecision` coerces and
checks `editedMapping.mappedProps` against the target component's schema, rejecting unknown props or
values outside the schema (e.g. `variant: "bogus"`). This keeps invalid markup from being persisted
or exported even by a direct GraphQL caller.

The review UI lists examples from the `examples` query and lets reviewers switch between them. The
recommended-mapping display and the decision editor are both driven by the component schema, so the
same UI handles Button (with a default slot) and Input (childless, `help-text` props) without
component-specific code.

## Export

The export renderer is schema-driven: it allowlists and names attributes from the component schema
(`htmlAttribute` for HTML, `reactProp` for React) and renders childless components as
`<sl-input ...></sl-input>` in HTML and `<SlInput ... />` in React.

## Dashboard pending semantics

A mapping counts as pending when it has no decision yet or its latest decision is `PENDING`,
matching the review UI's default. DesignRail does not seed synthetic decisions; the metric reflects
real review state.
