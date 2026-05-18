# Mock Figma Fixtures

This directory holds Figma-style component fixtures consumed by [tools/figma-import](../tools/figma-import/). Fixtures are **mock data only** — they do not require any Figma credentials or proprietary assets, and they back the default credential-free demo path.

## Naming

`figma-input.<component>.json` — one fixture per component covered by Phase 1: `button`, `card`, `input`, `badge`, `dialog`, `spinner`.

Phase 1 ships realistic variants, states, and accessibility metadata for these six components; the importer normalizes them to `ComponentIntent` (see [packages/shared](../packages/shared/)).

## Phase 1 status

Checkpoint 0 lands one stub fixture (`figma-input.button.json`). Checkpoint 2 fleshes out the Button fixture with realistic variants/states; Checkpoint 4 adds Card, Input, Badge, Dialog, and Spinner.
