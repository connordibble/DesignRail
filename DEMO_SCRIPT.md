# DesignRail 90-Second Demo Script

## Setup

```sh
pnpm install
pnpm check
pnpm dev
```

Open `http://localhost:5173/`.

## Walkthrough

0:00-0:12 — Opening thesis: AI UI generation should not ship code directly. DesignRail turns design intent into reviewable implementation proposals with deterministic checks and human approval before export.

0:12-0:20 — Setup sentence: This is running locally with `pnpm dev`, using public mock fixtures and no Figma credentials or external AI services.

0:20-0:35 — Click **Load Button demo**. Call attention to the mock-mode badge, example status badges, and Source Intent panel with normalized design intent, accessibility metadata, variants, states, and token references.

0:35-0:55 — Inspect Recommended Mapping and Compliance. Show the Shoelace target, confidence, rationale, mapped props, deterministic findings, and remediation text.

0:55-1:08 — Click **Accept**. Emphasize that the review decision is persisted through GraphQL and becomes the export gate.

1:08-1:22 — Click **Exports**, then generate HTML, React, or Agent Brief output. Note that pending or rejected mappings cannot create new exports.

1:22-1:30 — Closing line: DesignRail is the control-plane layer for AI-native frontend platform work: schemas, validators, review decisions, and exports keep generated UI implementation auditable.

## Backup Beats

- Select Input to show a warning for an unmapped token.
- Reject Input to show the locked export gate and historical-export notice.
- Open Schema to show the intent and Shoelace contracts behind the UI.
