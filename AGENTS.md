# DesignRail Agent Instructions

## Project mission

DesignRail is a full-stack internal tooling platform for design-to-engineering handoff. It ingests mock or optional real Figma input, normalizes it into component intent, maps it to Shoelace Web Components, runs compliance review, and presents everything in a React human-review UI where developers accept, reject, or edit mappings before exporting HTML or React examples.

The review UI is the product. Pipeline scripts, importers, mapping logic, GraphQL resolvers, and AI helpers exist to support a clear, trustworthy review experience.

## Public-safety rules

- Do not include proprietary company references, private screenshots, internal URLs, or confidential design details.
- Keep mock data generic and public-safe.
- Do not commit secrets, tokens, personal data, private design files, or real customer content.
- Do not add hidden external service dependencies.
- Keep default examples useful without private credentials or private infrastructure.

## Mock-mode-first rules

- Mock mode must be the default path for local development, tests, docs, and demos.
- Real Figma input is optional and must be isolated behind explicit configuration.
- Never require real Figma credentials to run the review UI, quality gates, or README commands.
- Mock fixtures should exercise realistic variants, states, accessibility metadata, and edge cases.

## GraphQL-as-contract rules

- Treat the GraphQL schema as the contract between the review UI, persistence layer, and pipeline.
- Add or update schema fields before wiring UI or resolver behavior that depends on them.
- Keep GraphQL types aligned with normalized component intent, mapping decisions, compliance results, exports, and instrumentation events.
- Prefer typed resolvers and generated types when project tooling exists.
- Do not bypass GraphQL from the UI for persisted review decisions.

## Human-in-the-loop AI rules

- AI may suggest mappings, remediation steps, and documentation, but humans make review decisions.
- Every AI-assisted recommendation needs confidence, rationale, and editable output.
- Preserve accept, reject, and edit decisions with enough context to audit later.
- Make uncertainty explicit. Do not present generated mappings as authoritative truth.

## Code quality standards

- Prefer small, composable TypeScript modules.
- Prefer readable code over abstractions.
- Make every command in the README actually work.
- TypeScript must be strict.
- No `any` unless justified with a comment.
- Prefer explicit return types for exported functions.
- Validate external/mock input with a schema.
- Keep modules focused and testable.
- Use named exports.
- Avoid global state.
- Prefer pure functions for mapping/transformation logic.
- Keep framework-specific code in UI packages and portable logic in pipeline/API modules.

## Review UI standards

- Build for repeated internal use: scannable, efficient, accessible, and low-friction.
- The UI must support accept, reject, edit, compare, compliance review, and export flows.
- Show loading, empty, error, disabled, and optimistic/pending states where relevant.
- Web Component integration must handle Shoelace events intentionally.
- Styling should use design tokens and CSS custom properties.
- Do not hardcode colors or spacing where a token exists.

## Design-system standards

- Treat Figma input as design intent, not implementation truth.
- Normalize design data before mapping it to components.
- Keep token mapping explicit and auditable.
- Generate implementation plans before generating export examples.
- Compliance review should explain tradeoffs and remediation steps.

## Before finishing any task

Run or update the relevant deterministic checks:

- `pnpm typecheck`
- `pnpm lint`
- `pnpm format:check`
- `pnpm test`
- `pnpm graphql:check`, if GraphQL schema, resolvers, or UI data needs changed
- `pnpm db:check`, if persistence or migrations changed
- `pnpm mock-mode:check`
- `pnpm secrets:check`
- `pnpm compliance:review`, if design-system output or review rules changed
- README/docs commands, if changed

Use `pnpm check` or `hooks/pre-agent-finish.sh` for the full gate when practical.

## Versioning

- Use Conventional Commits for meaningful changes.
- `feat` implies minor, `fix` and `perf` imply patch, and `!` or `BREAKING CHANGE:` implies major.
- Keep commits focused so release intent remains understandable.
- Run `pnpm release:plan` before tagging a release.

Summarize:
- what changed
- how it was verified
- what remains
