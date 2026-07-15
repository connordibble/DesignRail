---
title: 'ADR-0003: The fixture file is the Figma adapter boundary'
description: Why real Figma input enters DesignRail as a provenance-carrying fixture file instead of a live API integration.
---

## Status

Accepted, with the plugin shipping as the first adapter. A credentialed REST/MCP adapter remains open work tracked in issue #9.

## Context

DesignRail's default workflow is credential-free and deterministic: mock fixtures in `examples/` flow through import, mapping, compliance review, and human decision. The roadmap calls for real Figma input without compromising that default. Issue #9 frames the requirement as a boundary problem: real Figma must be opt-in, isolated, safe to disable, and never required to run the UI, the docs, or the quality gate.

There are three candidate shapes for that boundary:

1. A live REST API adapter in the importer, driven by `FIGMA_ACCESS_TOKEN` and file/node ids.
2. An MCP integration that reads design context from a running Figma session.
3. A Figma plugin that exports design intent as a file the existing importer already understands.

## Decision

The interchange contract is the fixture file itself. Real Figma input enters DesignRail as a `figma-input.*.json` document validated by the same `mockFigmaFixtureSchema` as hand-authored mocks, carrying an optional `figma` provenance block (`nodeId`, `nodeName`, `fileKey`) and never a credential. When provenance is present, the normalizer marks the intent `FIGMA` with a `FIGMA_NODE` source reference; everything downstream (mapping, compliance, review, persistence, export) is unchanged.

The first adapter that produces these files is a Figma plugin (`tools/figma-plugin`). It runs inside Figma with `networkAccess: none`, serializes the selected component through a pure, schema-tested function, and hands the JSON to the user through copy or download. The user carries the file into the repo; nothing else crosses the boundary.

## Consequences

- The credential-free default survives untouched. The plugin needs no token, the gate needs no secrets, and `pnpm check` exercises the adapter contract through the serializer tests alone.
- Provenance-carrying fixtures in `examples/` are ingested at API startup: the server runs the same deterministic pipeline (normalize, map, compliance) and persists the result as a reviewable FIGMA-sourced example. Hand-authored mocks stay owned by the seed registry, ingestion refuses an example id already owned by a mock, and re-ingestion never touches review decisions or exports.
- Adapters are interchangeable by construction. A future REST/MCP adapter emits the same fixture shape with the same provenance block, and the pipeline cannot tell the difference. The open questions for that adapter shrink to fetching and normalization, because the contract is already proven.
- The human stays in the transfer loop. A file the user copies is a file the user can read, which fits the product's review-first posture better than a background sync.
- The costs are real: exports are manual and single-node, there is no live re-sync when the design changes, and extraction happens with the plugin's conservative heuristics (fallbacks surface as warnings for the reviewer rather than silent guesses). Those limits are acceptable for a review tool whose unit of work is one component decision at a time.

## Revisit when

Batch export, live re-sync, or organization-wide ingestion becomes a requirement. Any of those forces the credentialed adapter in issue #9, which this boundary was designed to slot in without schema changes.
