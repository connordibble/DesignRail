# DesignRail

[![check](https://github.com/connordibble/DesignRail/actions/workflows/check.yml/badge.svg)](https://github.com/connordibble/DesignRail/actions/workflows/check.yml)

DesignRail is a full-stack internal tooling platform for design-to-engineering handoff. It ingests mock or optional real Figma input, normalizes it into component intent, maps it to Shoelace Web Components, runs compliance review, and presents everything in a React human-review UI.

The review UI is the product. Developers accept, reject, or edit mappings before exporting HTML or React examples, and review decisions are persisted and instrumented through a GraphQL API.

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
  shared/             Cross-cutting domain types and Zod schemas (filled in C1)
  schema/             Shoelace component schemas (props, slots, variants, parts)
  design-tokens/      Design tokens → Shoelace CSS custom properties
tools/
  figma-import/       Mock Figma fixture → normalized ComponentIntent
  component-mapper/   Intent → deterministic Shoelace mapping
  compliance-agent/   Mapping + intent → structured compliance findings
examples/             Mock Figma fixtures (Button, Card, Input, Badge, Dialog, Spinner)
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

In this lightweight scaffold, scripts skip gracefully when the matching TypeScript tool is not present yet. Once implementation packages are added, the same script names become the deterministic gate for that code.

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
