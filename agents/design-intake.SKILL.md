# Design Intake Skill

## Use when

Work touches mock fixtures, optional real Figma input, parsing, validation, or normalization.

## Goal

Convert raw Figma-style JSON into normalized component intent.

## Rules

- Validate input with Zod.
- Mock fixtures are the default source for local development, tests, and docs.
- Real Figma input must be optional, explicit, and isolated behind configuration.
- Do not pass raw Figma-shaped data directly into implementation logic.
- Preserve accessibility metadata.
- Preserve design-token references.
- Make unsupported or ambiguous design properties explicit.
- Output normalized JSON that is stable and easy to test.
- Keep sample data generic and public-safe.
