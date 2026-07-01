# Contributing to DesignRail

Thanks for your interest in DesignRail. This guide covers local setup, the quality gate, and the
conventions that keep the repository releasable at all times. The short version: **instructions
guide the work, deterministic checks enforce quality** — get `pnpm check` green and you are most of
the way there.

## Prerequisites

- Node 20+ (`.nvmrc`)
- pnpm 10+
- `ripgrep` on your `PATH` (required by `hooks/no-secrets.sh` and `hooks/mock-mode-check.sh`)

## Local setup

```sh
pnpm install
pnpm dev      # apps/web (Vite, :5173) + apps/api (Fastify + Apollo, :4000) in parallel
pnpm docs:dev # Astro Starlight docs site
```

The default workflow is credential-free and deterministic — it runs entirely on mock fixtures with
no Figma token, AI key, or hosted database. Keep it that way (see [Mock-mode](#mock-mode-and-public-safety)).

## Quality gate

Run the full gate before opening a pull request:

```sh
pnpm check
```

`pnpm check` runs, in order: `secrets:check`, `mock-mode:check`, `typecheck`, `lint`,
`format:check`, `graphql:check`, `db:check`, `test`, `compliance:review`, and `design:verify`. Each
is also runnable on its own — see the [README](README.md#commands) for the individual scripts.

If you change a single area you can run the matching script directly (for example `pnpm test` or
`pnpm graphql:check`) while iterating, but the full `pnpm check` must pass before review.

## Branching and pull requests

- Branch from `main`. Use a descriptive, type-prefixed branch name (`feat/...`, `fix/...`,
  `docs/...`, `chore/...`).
- Keep pull requests focused and reviewable. Smaller is better.
- The [pull request template](.github/PULL_REQUEST_TEMPLATE.md) asks for a summary, the concrete
  changes, and how you verified them — fill it in.
- CI (the `check` and `codeql` workflows) must be green before merge.

## Commit conventions

DesignRail uses [Conventional Commits](https://www.conventionalcommits.org/) so release intent stays
explicit:

- `feat(...)` signals a minor version.
- `fix(...)` and `perf(...)` signal a patch version.
- `!` or `BREAKING CHANGE:` signals a major version.
- `docs`, `test`, `refactor`, `chore`, `ci`, `build`, and `style` do not signal a release unless
  marked breaking.

Run `pnpm release:plan` to inspect the next SemVer bump from commits since the last tag. To enforce
the format locally, install the hook:

```sh
cp hooks/commit-msg.sh .git/hooks/commit-msg && chmod +x .git/hooks/commit-msg
```

## Code standards

These mirror `AGENTS.md`, which is the canonical source:

- TypeScript is strict. No `any` without a justifying comment.
- Prefer small, composable, pure modules and named exports.
- Validate external and mock input with a Zod schema.
- Treat the GraphQL schema as the contract; do not bypass it for persisted review decisions.
- Use design tokens / CSS custom properties — do not hardcode colors or spacing where a token
  exists. Read `DESIGN.md` before UI work.
- AI-assisted output is always a reviewable recommendation with confidence and rationale, never
  presented as authoritative truth.

## Mock-mode and public safety

- Mock mode is the default for development, tests, docs, and demos.
- Real Figma / AI / database integrations are optional and must stay isolated behind explicit
  configuration. Never require them to run the review UI, the docs, or the quality gate.
- Do not commit secrets, tokens, personal data, private design files, internal URLs, or proprietary
  company references. Keep mock data generic and public-safe.

## How the project is organized for contributors

- `AGENTS.md` — product direction, public-safety rules, GraphQL contract, and verification
  expectations.
- `DESIGN.md` — UI direction for the React review experience.
- `agents/` — focused workflow and domain skill files.
- `hooks/` — the repeatable local checks wired into `pnpm check`.
- `docs/` — the Astro Starlight site, including ADRs under `docs/src/content/docs/decisions/`.

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
