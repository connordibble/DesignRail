# DesignRail 90-Second Demo Script

## Setup

```sh
pnpm install
pnpm check
pnpm dev
```

Open `http://localhost:5173/`. The default path uses public mock fixtures and no Figma credentials or external AI service.

## Walkthrough

**0:00–0:10: State the boundary.** DesignRail does not ship generated UI directly. It turns design intent into a component proposal that a developer can inspect, correct, and authorize.

**0:10–0:24: Open Compliance.** Show the cross-example ledger ordered by severity. Point out that each finding includes a category, path, explanation, and remediation rather than a pass/fail badge alone.

**0:24–0:42: Require a rejection rationale.** Return to Review, choose Input, and click **Reject**. The export gate is visible before the decision. Show that **Confirm rejection** stays disabled until the reviewer enters a reason, then cancel to keep the prepared demo data unchanged.

**0:42–0:57: Audit an edit.** Choose Card, open History, expand **View diff**, and compare the human-edited values with the mapper's recommendation. Decisions are appended instead of overwritten.

**0:57–1:18: Export reviewed context.** Click **Load Button demo**, open Exports, and select **Agent Brief**. If the Button mapping is pending, accept it first. Show that the brief carries the authorized mapping, reviewer decision, compliance summary, and instruction not to bypass the human gate.

**1:18–1:30: Close on the contract.** The UI, API, and SQLite store share one GraphQL contract. Mock input is replaceable; the normalized intent, review decision, and export gate stay the same.

## Capture checklist

- Keep the browser at 1280 × 720 with no private tabs, notifications, or credentials visible.
- Use the committed mock fixtures only.
- Capture Compliance, the rejection rationale state, History diffing, and Agent Brief export.
- Burn concise captions into the video or ship the matching `assets/designrail-demo.vtt` track.
- Encode H.264 MP4 with the `moov` atom before `mdat` and keep the file under 20 MiB.
