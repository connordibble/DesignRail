# DesignRail

DesignRail is a full-stack internal tooling platform for design-to-engineering handoff. It ingests mock or optional real Figma input, normalizes it into component intent, maps it to Shoelace Web Components, runs compliance review, and presents everything in a React human-review UI.

The review UI is the product. Developers accept, reject, or edit mappings before exporting HTML or React examples, and review decisions are persisted and instrumented through a GraphQL API.

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
- `agents/SKILL.md` defines the end-to-end DesignRail workflow.
- Focused skill files in `agents/` guide product principles, design intake, schemas, mapping, review UI, GraphQL, instrumentation, compliance, Shoelace integration, AI boundaries, docs, and readiness.
- Hooks in `hooks/` run repeatable local checks for quality, secrets, and mock-mode safety.

Instructions guide the agent. Deterministic checks enforce quality.

## Mock-Mode Default

The default path uses generic mock design data. It must not require real Figma credentials, proprietary assets, internal URLs, or private company references. Optional real-service integration should be explicit, isolated, and safe to disable.
