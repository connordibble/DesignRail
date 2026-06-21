# DesignRail

[![check](https://github.com/connordibble/DesignRail/actions/workflows/check.yml/badge.svg)](https://github.com/connordibble/DesignRail/actions/workflows/check.yml)

DesignRail is a design-system handoff control plane for AI-assisted implementation. It ingests mock or optional real Figma input, normalizes it into component intent, maps that intent to Shoelace Web Components, runs compliance review, and records human review decisions before anything is treated as export-ready.

![DesignRail review workspace — source intent, recommended Shoelace mapping, and the schema-driven decision editor](assets/review-workspace.png)

DesignRail does not try to replace coding agents, IDEs, or Figma Dev Mode. It sits between design intent and implementation as the governed review layer: designers and developers can inspect mapping recommendations, see compliance findings, accept, reject, or edit decisions, and export implementation-ready HTML, React examples, or agent-ready briefs. Review decisions are persisted and instrumented through a GraphQL API so mapping quality can be audited over time.

## What DesignRail Is For

- Normalize Figma-style design data into reviewable component intent.
- Map design intent to a component-library schema, with Shoelace as the first target.
- Make accessibility, token usage, variant coverage, React readiness, documentation readiness, and design-system alignment visible before implementation.
- Preserve human decisions so accepted, rejected, and edited mappings are auditable.
- Export clean implementation examples and structured context that can be used in CLI, IDE, or agent-assisted coding workflows.
- Measure where design-to-engineering handoff succeeds or repeatedly needs correction.

## What DesignRail Is Not

- A one-click design-to-code generator.
- A replacement for engineers reviewing implementation details.
- A replacement for Figma, Dev Mode, or coding agents.
- A place for proprietary design files, private employer references, or real credentials in the default path.

## Quick start

```sh
pnpm install
pnpm check    # full quality gate: secrets, mock-mode, types, lint, format, tests
pnpm dev      # runs apps/web (Vite, :5173) and apps/api (Fastify+Apollo, :4000) in parallel
pnpm docs:dev # runs the Astro Starlight docs site
```

Prerequisites: Node 20+ (`.nvmrc`), pnpm 10+, `ripgrep` on PATH for `hooks/no-secrets.sh` and `hooks/mock-mode-check.sh`.

## Repository layout

```
apps/
  web/                React + Vite + Tailwind review UI
  api/                Fastify + Apollo GraphQL server
packages/
  shared/             Cross-cutting domain types and Zod schemas
  schema/             Shoelace component schemas (props, slots, events, parts) — source of truth for mapping
  design-tokens/      Design tokens → Shoelace CSS custom properties
tools/
  figma-import/       Mock Figma fixture → normalized ComponentIntent
  component-mapper/   Intent → deterministic, schema-driven Shoelace mapping
  compliance-agent/   Mapping + intent → structured compliance findings
examples/             Mock Figma fixtures (Button + Input now; Card/Badge/Dialog/Spinner planned)
docs/                 Astro + Starlight documentation site with ADRs
agents/               DesignRail-specific skill files
hooks/                Repeatable local quality, secrets, and mock-mode checks
```

## Commands

```sh
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
pnpm graphql:check
pnpm db:check
pnpm compliance:review
pnpm mock-mode:check
pnpm secrets:check
pnpm release:plan
pnpm check
```

Design workflow entry points:

```sh
pnpm design:import
pnpm design:map
```

The default workflow is credential-free and deterministic. Optional Figma API/MCP or AI-service integrations should be explicit additions, not requirements for local development.

## Phase 1 Contract

Checkpoint 1 defines the local review contract: shared Zod schemas, a GraphQL API, API-owned SQLite persistence through Drizzle, JSON tool-result envelopes, and persisted review decisions. The default database is local-only at `apps/api/.data/designrail.sqlite`. The API binds to localhost by default; set `HOST` and `DESIGNRAIL_ALLOW_NETWORK=true` only when intentionally exposing it beyond the local machine.

The review UI uses GraphQL for examples, component intent, mappings, compliance findings, review decisions, exports, and dashboard metrics. `reviewWorkspace(exampleId)` is the UI read model for the selected review target, with `dashboardMetrics` queried as a sibling top-level field when needed. Review/export mutations record instrumentation events internally. Tools and resolvers should exchange structured data, not markdown or stdout-shaped strings.

The web app points at `http://127.0.0.1:4000/graphql` by default. Set `VITE_DESIGNRAIL_GRAPHQL_URL` only when the local API is intentionally served from a different GraphQL URL.

## Agent-Assisted Development Model

DesignRail uses layered instructions:

- `AGENTS.md` defines product direction, public-safety rules, mock-mode defaults, GraphQL contracts, human-in-the-loop AI rules, and verification expectations.
- `DESIGN.md` defines the product UI direction for the React review experience.
- `agents/SKILL.md` defines the end-to-end DesignRail workflow.
- Focused skill files in `agents/` guide product principles, design intake, schemas, mapping, review UI, GraphQL, instrumentation, compliance, Shoelace integration, AI boundaries, docs, and readiness.
- Optional installed third-party skills live in `.agents/skills/` and support frontend quality checks without replacing DesignRail rules.
- Hooks in `hooks/` run repeatable local checks for quality, secrets, and mock-mode safety.

Instructions guide the agent. Deterministic checks enforce quality.

## Versioning

DesignRail uses Conventional Commits to keep release intent explicit:

- `feat(...)` signals a minor version.
- `fix(...)` and `perf(...)` signal a patch version.
- `!` or `BREAKING CHANGE:` signals a major version.
- `docs`, `test`, `refactor`, `chore`, `ci`, `build`, and `style` do not signal a release unless marked breaking.

Run `pnpm release:plan` to inspect the next SemVer bump from commits since the last tag. Install `hooks/commit-msg.sh` as `.git/hooks/commit-msg` to enforce commit messages locally.

## Mock-Mode Default

The default path uses generic mock design data. It must not require real Figma credentials, proprietary assets, internal URLs, or private company references. Optional real-service integration should be explicit, isolated, and safe to disable.
