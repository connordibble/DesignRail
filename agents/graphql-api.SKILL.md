# GraphQL API Skill

## Use when

Work changes GraphQL schema, resolvers, generated types, persisted review decisions, or UI data access.

## Goal

Use GraphQL as the contract between the review UI, persistence layer, pipeline, and instrumentation.

## Rules

- Update schema before implementing UI or resolver behavior that depends on it.
- Model component intent, mappings, compliance findings, decisions, exports, and events explicitly.
- Keep resolver inputs validated and public-safe.
- Persist review decisions through GraphQL mutations.
- Avoid UI-side persistence paths that bypass the API contract.
- Run `pnpm graphql:check` for schema or resolver changes.
