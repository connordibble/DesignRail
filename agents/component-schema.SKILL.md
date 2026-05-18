# Component Schema Skill

## Use when

Work changes normalized component intent, mapping result types, compliance result shapes, or export models.

## Goal

Keep component data stable, typed, versionable, and suitable for GraphQL and UI review.

## Rules

- Define explicit schemas for intent, mapping, compliance, decision, and export records.
- Validate external and mock input before it reaches mapping logic.
- Include IDs, source references, accessibility metadata, token references, state, variant, and confidence fields.
- Prefer additive schema changes. Document breaking changes.
- Keep schema names aligned across TypeScript and GraphQL.
