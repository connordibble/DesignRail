---
version: alpha
name: DesignRail UI Direction
description: "A precise internal review interface for design-to-engineering handoff. The visual language is inspired by disciplined product tools, but is DesignRail-specific: graphite surfaces, crisp typography, sparse blue-violet accent, strong semantic status colors, dense review panels, and code-first affordances. The interface should feel like a serious platform senior engineers would use daily, not a marketing page or decorative demo."

colors:
  accent: "#6f7dfb"
  accent-hover: "#8490ff"
  accent-soft: "#20264f"
  canvas: "#08090b"
  shell: "#0d0f12"
  panel: "#12151a"
  panel-raised: "#171b22"
  panel-hover: "#1c212a"
  border: "#252b35"
  border-strong: "#343c49"
  text: "#eef2f7"
  text-muted: "#a8b0bd"
  text-subtle: "#737c8b"
  code-bg: "#0b0e13"
  code-border: "#222936"
  success: "#2fb56f"
  warning: "#d7a53f"
  danger: "#e15d5d"
  info: "#63a4ff"
  edited: "#b68cff"
  light-canvas: "#f7f8fb"
  light-panel: "#ffffff"
  light-border: "#dfe4ec"
  light-text: "#151922"

typography:
  ui:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    letterSpacing: "0"
  mono:
    fontFamily: "JetBrains Mono, Geist Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    letterSpacing: "0"
  sizes:
    page-title: "24px"
    section-title: "15px"
    body: "14px"
    body-small: "13px"
    caption: "12px"
    code: "12.5px"

radii:
  xs: "4px"
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "12px"

spacing:
  xxs: "4px"
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
---

# DesignRail Design Direction

DesignRail should feel like a real internal platform for senior engineers reviewing design-system mappings. The UI is precise, dense, calm, and operational. It should reward repeated use: clear information hierarchy, keyboard-friendly review actions, trustworthy status, and code previews that feel production-adjacent.

This file is not a clone of any product. It borrows the broad discipline of minimal internal tools, then adapts it to DesignRail's domain: design intent, Shoelace mappings, compliance findings, human decisions, exports, and instrumentation.

## Product Feel

DesignRail is:

- Quiet and technical.
- Dense but not cramped.
- Confident without being flashy.
- Built around review, correction, and auditability.
- Mock-mode credible, not fake-demo theatrical.

DesignRail is not:

- A marketing landing page.
- A decorative dashboard.
- A chat-first AI interface.
- A clone of another product's brand, fonts, logo, or exact palette.
- A pile of cards pretending to be workflow.

## Visual Principles

### Review First

Every screen should answer:

- What did the design input intend?
- What did the mapper recommend?
- Why did it recommend that?
- What compliance risks exist?
- What decision did the developer make?
- What can be exported safely?

Avoid decorative sections that do not help answer one of those questions.

### Dense, Legible Panels

Use split panes, tables, lists, and structured panels. Cards are allowed for repeated items, metrics, and contained tools, but page sections should not become nested card stacks.

Panel density should feel like an engineering console:

- Labels are short.
- Values align.
- Findings are grouped by severity.
- IDs and component names use mono.
- Decision status is always visible.

### Sparse Accent

Use the accent color for primary actions, selected navigation, focus rings, and active review state. Do not flood large surfaces with accent color.

Semantic colors are more important than brand color:

- Success: accepted, passing, export ready.
- Warning: needs review, partial mapping, missing docs.
- Danger: blocker, rejected, inaccessible.
- Info: generated recommendation, imported source.
- Edited: human correction.

### Professional Motion

Motion is optional. Use it only to preserve spatial continuity or confirm state changes. Default to no animation in critical review surfaces. Always respect reduced motion.

## Layout System

### App Shell

The primary UI should use a durable internal-tool shell:

- Left navigation rail: product areas and example selector.
- Top utility row: environment badge, mock-mode status, search/filter, quality indicators.
- Main workbench: review content.
- Right detail rail when useful: compliance, history, or export preview.

Recommended desktop layout:

```text
+--------------+----------------------------------------------+--------------------+
| Nav / Mock   | Review Workbench                             | Compliance / Export|
| Examples     | Intent -> Mapping -> Decision                | Findings / Preview |
+--------------+----------------------------------------------+--------------------+
```

Mobile and narrow tablet layouts can stack sections, but the desktop experience is the portfolio-critical path.

### Core Screens

- Dashboard: instrumentation summary, recent decisions, warning trends.
- Review: selected mock example, source intent, mapping recommendation, compliance findings, editable decision.
- Export: accepted/edited mappings with HTML and React examples.
- Docs/Schema view: compact reference for component intent and Shoelace schema support.

### Responsive Behavior

- Desktop: 3-column workbench is preferred.
- Tablet: collapse right rail below the main workbench.
- Mobile: single-column, review actions sticky at bottom.
- Code blocks should scroll horizontally instead of wrapping into unreadable output.

## Surface And Color

Default UI uses a dark graphite shell because code, status, and dense review panels read well there. Avoid pure black. Keep contrast high and borders visible.

Use light surfaces only for code-export previews or documentation examples when that improves readability. If light mode is added later, it must be complete and tested, not an afterthought.

### Surface Hierarchy

| Level | Token | Use |
|---|---|---|
| 0 | `canvas` | App background |
| 1 | `shell` | Sidebar, top utility area |
| 2 | `panel` | Main panes and tables |
| 3 | `panel-raised` | Active panel, editor, preview |
| 4 | `panel-hover` | Hovered rows, selected list item |

Borders, not heavy shadows, create depth. Use `border` for default separation and `border-strong` for active/selected states.

## Typography

Use a system sans or Inter-compatible stack. Do not depend on proprietary fonts. Letter spacing is `0`.

| Role | Size | Weight | Use |
|---|---:|---:|---|
| Page title | 24px | 600 | Current workflow or selected example |
| Section title | 15px | 600 | Panel headings |
| Body | 14px | 400 | Main UI text |
| Body small | 13px | 400 | Secondary labels and helper text |
| Caption | 12px | 500 | Metadata, status labels, table headers |
| Code | 12.5px | 400 | HTML, React, IDs, token names |

Use mono only where it carries meaning: component IDs, token paths, GraphQL fields, generated code, and event names.

## Component Patterns

### Navigation Rail

The nav rail should be compact and utilitarian:

- Product mark and `Mock mode` badge at the top.
- Main areas: Dashboard, Review, Exports, Schema, Docs.
- Mock examples: Button, Card, Input, Badge, Dialog, Spinner.
- Selected item uses subtle accent text and left border or inset rail.

Do not use oversized icons or marketing-style navigation.

### Example Selector

The example selector is part of the product flow, not a demo dropdown. It should show:

- Component name.
- Input source: mock or configured external source.
- Mapping status: pending, accepted, rejected, edited.
- Compliance count by severity.

### Review Workbench

The review workbench is the main product surface. It should contain:

- Source intent summary.
- Deterministic mapping recommendation.
- Confidence and rationale.
- Editable mapping controls.
- Decision toolbar.
- Code preview.

Prefer side-by-side comparison on desktop:

```text
Source Intent        Recommended Mapping        Decision / Export
```

### Compliance Findings

Findings should be structured, not prose-heavy:

- Severity badge.
- Category: accessibility, tokens, variants, React readiness, docs, alignment.
- Short finding.
- Remediation.
- Linked field or mapping path when possible.

Use semantic color only on the severity marker, not the entire row.

### Decision Controls

Accept, reject, and edit are primary workflow actions. They must be obvious, keyboard reachable, and auditable.

States:

- Pending: no decision yet.
- Accepted: deterministic recommendation approved.
- Rejected: recommendation unsuitable.
- Edited: human changed the mapping.
- Exported: accepted or edited mapping generated code.

Never make export available for rejected or undecided mappings.

### Code Preview

Code preview should look like an engineering artifact:

- Tabs for HTML and React.
- Copy action.
- Export status.
- Stable monospace.
- No syntax theme that overwhelms the app.
- Generated comments only when they clarify review context.

### Dashboard Metrics

Keep metrics plain and operational:

- Accepted mappings.
- Rejected mappings.
- Edited mappings.
- Export-ready mappings.
- Common compliance warnings.

Avoid vanity charts. Prefer small trend tables, severity lists, and counts that tell whether mapping quality is improving.

## Tailwind And Shoelace Guidance

Tailwind should express layout, spacing, and app-specific composition. Shoelace should provide accessible primitives where appropriate.

Use CSS custom properties for design tokens and Shoelace alignment:

- Define DesignRail tokens once.
- Map token values to Shoelace variables where useful.
- Do not scatter hardcoded colors through component examples.
- Keep wrappers thin and typed.

Buttons, tabs, dialogs, badges, inputs, spinners, and tooltips should align with Shoelace behavior, but the surrounding review workflow should remain DesignRail-specific.

## Accessibility

Minimum expectations:

- Keyboard access for all review actions.
- Visible focus rings.
- Clear disabled states with explanation where needed.
- Color is never the only status signal.
- Code preview remains readable at smaller widths.
- Reduced motion is respected.
- Error states explain what failed and how to retry.

Target the kind of accessibility discipline expected in an internal platform owned by senior frontend engineers.

## Content Voice

Use direct operational language:

- "Mapping recommended"
- "Accepted by reviewer"
- "Missing accessible name"
- "Token fallback used"
- "Export ready"

Avoid hype:

- "AI magic"
- "Perfect conversion"
- "One-click production"
- "Autonomous design implementation"

AI-assisted output should always read as a recommendation that can be reviewed and changed.

## Anti-Patterns

Do not build:

- Hero sections inside the app.
- Oversized marketing cards.
- Decorative gradient backgrounds.
- Copycat branding, logos, colors, or proprietary fonts from another company.
- Chat UI as the primary review workflow.
- Hidden persistence outside GraphQL.
- Export actions before human decision.
- Dense animation before dense clarity.

## Implementation Checklist

Before UI work is considered complete:

- The screen works with mock data and no external credentials.
- Primary review actions are visible without scrolling on desktop.
- Loading, empty, error, disabled, pending, saved, and rejected states exist where relevant.
- Compliance findings are structured and scannable.
- The UI uses tokens or CSS custom properties for repeated colors and spacing.
- GraphQL is the source of persisted decision state.
- Code preview is readable and export eligibility is clear.
- `pnpm check` passes.

## Relationship To Inspiration

DesignRail may be inspired by the precision of modern product tools, including publicly observable dark internal-tool aesthetics. It must not copy another product's brand system, proprietary typefaces, exact token palette, logo, layout signatures, or marketing language.

The goal is authenticity: a focused engineering product with its own review workflow, not a visual impression of someone else's app.
