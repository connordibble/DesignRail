# Agent Instructions

DesignRail uses layered instructions so agent behavior stays consistent while deterministic checks enforce quality.

## Layers

1. `AGENTS.md`  
   Repo-wide product direction, safety rules, architecture contracts, and verification expectations.

2. `agents/SKILL.md`  
   End-to-end DesignRail workflow across intake, mapping, review, persistence, export, and instrumentation.

3. Specific skill files  
   Focused instructions for product principles, schemas, review UI, GraphQL, Shoelace integration, AI boundaries, compliance, docs, and readiness.

4. Hooks and scripts  
   Repeatable local gates for type safety, linting, tests, GraphQL, mock mode, secrets, and compliance.

5. Optional third-party skills  
   Installed skills in `.agents/skills/` can support React performance, view transitions, and UI reviews. They do not override DesignRail rules.

## When to use each skill

- Any repo task: start with `AGENTS.md`.
- Product behavior, prioritization, or UX tradeoffs: use `agents/product-principles.SKILL.md`.
- End-to-end platform work: use `agents/SKILL.md`.
- Mock or optional real Figma input: use `agents/design-intake.SKILL.md`.
- Normalized component intent models: use `agents/component-schema.SKILL.md`.
- Shoelace selection, variant mapping, or token translation: use `agents/component-mapping.SKILL.md`.
- Human-review flows: use `agents/review-ui.SKILL.md`.
- GraphQL schema, resolvers, or persisted decisions: use `agents/graphql-api.SKILL.md`.
- Metrics or event tracking: use `agents/instrumentation.SKILL.md`.
- Compliance reports or approval status: use `agents/compliance-review.SKILL.md`.
- React and Shoelace component integration: use `agents/react-shoelace-integration.SKILL.md`.
- AI calls, prompts, or service boundaries: use `agents/ai-service-boundary.SKILL.md`.
- README, architecture notes, or portfolio narrative: use `agents/docs-writing.SKILL.md`.
- Release, CI, governance, or production gap analysis: use `agents/production-readiness.SKILL.md`.

Prefer the smallest relevant skill set. If a task crosses layers, read the end-to-end skill first, then the focused skill files needed for the implementation.

## Third-party skill guidance

- Use `.agents/skills/vercel-react-best-practices` when implementing or reviewing React performance-sensitive UI.
- Use `.agents/skills/vercel-react-view-transitions` only after core review flows are stable and motion has a clear product purpose.
- Use `.agents/skills/web-design-guidelines` for optional UI audits, not deterministic gates.
- Keep project-specific rules in `agents/` to avoid instruction drift.
