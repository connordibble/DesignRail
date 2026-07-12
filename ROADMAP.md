# DesignRail Roadmap

DesignRail is currently optimized for a credential-free mock demo of the review workflow. The next loops should deepen real input coverage while keeping the review UI and GraphQL contract stable.

## Shipped

- Review console covering Dashboard, Compliance, Review, History, Exports, and Schema, responsive from phone widths to a three-column desktop workbench.
- Decision history with field-level diffs for edited mappings, and a required rationale on rejection.
- Cross-example compliance ledger ordered by severity.
- Export gate producing HTML, React, and reviewed Agent Brief output for accepted or edited mappings only.
- URL-persisted workspace state (`?view=`, `?example=`) so review context survives refresh, history navigation, and shared links.
- Client-side UI instrumentation recorded through the same GraphQL contract as server events.
- CI runs the full gate: fixture import, mapping, compliance review, GraphQL drift, tests, and README proof validation.
- Public proof kit: captioned interaction-capture demo video, poster, and workflow screenshots.

## Near Term

- Live Figma adapter (Plugin or REST API/MCP) behind explicit configuration, normalizing into the same `ComponentIntent` shape as mock fixtures.
- More component mappings beyond Button, Input, and Card, starting with Badge, Dialog, and Spinner.
- Stronger accessibility checks for names, roles, keyboard expectations, and missing details.
- Instrumentation views that summarize review throughput (time to decision, correction recurrence) from the recorded event ledger.
- Hosted demo with mock data only, no external credentials, and resettable local review state.

## Principles

- Mock mode remains the default path for local development, tests, docs, and demos.
- Real service integrations stay optional and isolated behind explicit configuration.
- Humans remain the approval gate; generated mappings are recommendations, not authoritative output.
- Design-system schemas, tokens, and deterministic checks define what can be exported safely.
