# DesignRail Roadmap

DesignRail is currently optimized for a credential-free mock demo of the review workflow. The next loops should deepen real input coverage while keeping the review UI and GraphQL contract stable.

## Near Term

- Live Figma MCP adapter behind explicit configuration, normalizing into the same `ComponentIntent` shape as mock fixtures.
- More component mappings beyond Button, Input, and Card, starting with Badge, Dialog, and Spinner.
- Stronger accessibility checks for names, roles, keyboard expectations, and missing details.
- Review history and diffing so repeated accept/edit/reject decisions become visible product feedback.
- CI validation mode for fixture import, mapping, compliance review, GraphQL, and export generation.
- Hosted demo with mock data only, no external credentials, and resettable local review state.
- Demo video and screenshot set covering input intent, review/compliance, and generated output.

## Principles

- Mock mode remains the default path for local development, tests, docs, and demos.
- Real service integrations stay optional and isolated behind explicit configuration.
- Humans remain the approval gate; generated mappings are recommendations, not authoritative output.
- Design-system schemas, tokens, and deterministic checks define what can be exported safely.
