# AI Service Boundary Skill

## Use when

Work introduces or changes AI prompts, model calls, generated recommendations, or fallback behavior.

## Goal

Keep AI assistance optional, auditable, and safely separated from deterministic product logic.

## Rules

- Mock or deterministic behavior must remain the default path.
- AI calls require explicit configuration and must not run silently.
- Validate AI inputs and outputs with schemas.
- Store confidence, rationale, and uncertainty with recommendations.
- Never let AI directly accept, reject, or export a mapping.
- Keep prompts free of proprietary data and secrets.
