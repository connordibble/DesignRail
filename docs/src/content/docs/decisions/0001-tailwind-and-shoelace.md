---
title: ADR-0001 — Tailwind for chrome, Shoelace CSS variables for components
description: How Tailwind utilities and Shoelace Web Components share the review UI without fighting over Shadow DOM.
---

## Status

Accepted — Checkpoint 0, Phase 1.

## Context

The review UI mixes two styling systems:

1. **App chrome** — layout, panels, buttons, headers, toolbars. These elements live in the regular DOM.
2. **Shoelace Web Components** — `<sl-button>`, `<sl-input>`, `<sl-dialog>`, etc. Their internals live inside Shadow DOM.

Tailwind utility classes do not reach into Shadow DOM. CSS custom properties declared on or above a Shoelace element **do** pierce Shadow DOM and are how Shoelace exposes its theme contract.

If we tried to style Shoelace internals with Tailwind (via `::part` selectors and hacks), we would couple the review UI to Shoelace's private structure, complicate auditing of which design tokens actually applied, and create fragile per-component overrides.

## Decision

- **Tailwind styles only app chrome** — the React UI's layout, navigation, panels, dashboards, and any non-Shoelace primitives.
- **Shoelace components are themed through CSS custom properties**, derived from `@designrail/design-tokens` (`packages/design-tokens`).
- Token definitions live as JSON in `tokens.json` and are projected to CSS custom properties on `:root` (or a theme wrapper) in `apps/web`. The names map onto Shoelace's `--sl-*` variables where one exists.
- App chrome may consume the same tokens, either through CSS variables or through Tailwind's `theme.extend` block. Either way, the **token JSON is the single source of truth**.

## Consequences

- The chrome-vs-component boundary is explicit and reviewable. A reader can ask: "is this rendered Shoelace? then it's themed via tokens. is this app chrome? then it's Tailwind."
- Adding a new Shoelace component does not require a Tailwind plugin rewrite; it requires a token mapping entry.
- The compliance agent can audit "did this mapping reach into Shadow DOM through unsupported parts?" because we have a documented rule for what is and is not allowed.
- Tailwind's preflight is left **on** for app chrome. Preflight cannot enter Shadow DOM so it does not affect Shoelace internals.

## Alternatives considered

- **Tailwind everywhere via `::part`** — rejected. Fragile, hard to audit, couples us to Shoelace internals.
- **No Tailwind; plain CSS modules + tokens** — rejected for Phase 1. Cleaner token story but slower to build the review UI surface area inside a portfolio timeline.
