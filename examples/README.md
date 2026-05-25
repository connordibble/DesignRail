# Mock Figma Fixtures

This directory holds Figma-style component fixtures consumed by [tools/figma-import](../tools/figma-import/). Fixtures are **mock data only** — they do not require any Figma credentials or proprietary assets, and they back the default credential-free demo path.

## Naming

`figma-input.<component>.json` — one fixture per component. The Phase 1 target set is `button`, `card`, `input`, `badge`, `dialog`, and `spinner`.

The importer normalizes fixtures to `ComponentIntent` (see [packages/shared](../packages/shared/)). Fixtures should include realistic variants, states, accessibility metadata, and public-safe edge cases as they are added.

## Phase 1 status

Checkpoint 1 includes one Button fixture (`figma-input.button.json`) for the typed contract and local persistence path. Later checkpoints flesh out Button variants/states first, then add Card, Input, Badge, Dialog, and Spinner.
