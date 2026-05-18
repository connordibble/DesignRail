# DesignRail End-To-End Workflow

## Purpose

Build and maintain the full DesignRail workflow from design intake through human review, persistence, instrumentation, and export.

## Inputs

- Mock Figma-style fixtures by default.
- Optional real Figma input behind explicit configuration.
- Design-token definitions and component intent schemas.
- Shoelace Web Component mapping rules.
- Compliance rules and remediation guidance.
- GraphQL schema, persisted review decisions, and instrumentation events.
- React review UI state and export targets.

## Required workflow

1. Ingest mock input first; wire optional real Figma paths only through explicit configuration.
2. Validate input and normalize it into component intent.
3. Map intent to Shoelace components, variants, states, events, tokens, and accessibility requirements.
4. Run compliance review and produce risks, remediation, and approval status.
5. Expose intent, mappings, compliance results, decisions, exports, and events through GraphQL.
6. Present mappings in the React review UI for human accept, reject, or edit decisions.
7. Persist review decisions and instrument meaningful workflow events.
8. Export HTML or React examples only from approved or edited decisions.
9. Update docs with workflow rationale, limits, and verification commands.

## Quality rules

- Do not invent unsupported component variants.
- Do not silently drop accessibility metadata.
- Do not hardcode visual values if a token exists.
- Do not bypass the review UI for persisted decisions.
- Do not let AI make final acceptance decisions.
- Prefer "implementation recommendation" language over "perfect conversion."
- Make uncertainty explicit in generated reports.
- Keep GraphQL as the UI/API contract.

## Output expectations

Every mapped item should include:

- Component intent summary.
- Selected Shoelace component and fallback.
- Variant, state, token, event, and accessibility mapping.
- Confidence and rationale.
- Compliance findings and remediation.
- Human decision state.
- Export readiness.
