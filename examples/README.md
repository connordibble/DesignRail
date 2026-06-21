# Mock Figma Fixtures

This directory holds Figma-style component fixtures consumed by [tools/figma-import](../tools/figma-import/). Fixtures are **mock data only** — they do not require any Figma credentials or proprietary assets, and they back the default credential-free demo path.

## Naming

`figma-input.<component>.json` — one fixture per component. The Phase 1 target set is `button`, `card`, `input`, `badge`, `dialog`, and `spinner`.

The importer normalizes fixtures to `ComponentIntent` (see [packages/shared](../packages/shared/)). Fixtures should include realistic variants, states, accessibility metadata, and public-safe edge cases as they are added.

## Phase 1 status

Checkpoint 2 ships two fully-realized fixtures: `figma-input.button.json` (variants, states,
accessibility metadata, and tokens) and `figma-input.input.json` (label, placeholder, type,
required validation, and a deliberately unmapped token to exercise compliance). Each fixture
includes an `exampleId`/`intentId` and is normalized by [tools/figma-import](../tools/figma-import/)
into a `ComponentIntent`. Later checkpoints add Card, Badge, Dialog, and Spinner using the same
schema-driven pipeline.
