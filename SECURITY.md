# Security Policy

DesignRail is a credential-free, mock-mode-first project, so its default attack surface is small by
design. Real Figma, AI, or database integrations are optional and isolated behind explicit
configuration. Even so, security reports are welcome and taken seriously.

## Reporting a vulnerability

Please **do not** open a public issue for security problems.

Instead, use GitHub's private vulnerability reporting:

1. Go to the **Security** tab of this repository.
2. Choose **Report a vulnerability**.
3. Describe the issue, the impact, and steps to reproduce.

If private reporting is unavailable to you, email the maintainer at **cdibb44@gmail.com** with the
same detail.

You can expect an initial acknowledgement within a few days. Please allow reasonable time for a fix
before any public disclosure.

## Scope

In scope:

- The review API, GraphQL contract, and persistence layer (`apps/api`).
- The review UI (`apps/web`).
- The deterministic pipeline tools (`tools/figma-import`, `tools/component-mapper`,
  `tools/compliance-agent`) and shared schemas (`packages/`).
- The optional credentialed integrations, when enabled.

Out of scope:

- Issues that require running the project outside its documented, isolated network posture
  (the API binds to localhost unless `DESIGNRAIL_ALLOW_NETWORK=true` is set deliberately).
- Vulnerabilities in third-party dependencies that are already tracked upstream — though reports
  that show concrete impact here are still appreciated.

## Built-in safeguards

Several controls run on every change as part of `pnpm check`:

- `hooks/no-secrets.sh` screens the tree for tokens, keys, and credential-shaped strings.
- `hooks/mock-mode-check.sh` keeps the credential-free path as the default.
- CodeQL and Dependabot run in CI for static analysis and dependency hygiene.

Please never commit secrets, tokens, private design files, or real customer content. The default
path must keep working without any real credentials.
