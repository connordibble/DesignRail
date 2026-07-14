# RFC 001: Design System Agent Bench

- **Status:** Open for comment. After the comment window this merges as a draft, and each open question becomes a tracked issue.
- **Author:** Connor Dibble
- **Date:** 2026-07-12
- **Discussion:** the pull request that introduced this document

## Summary

Most design-to-code evaluation asks whether the output resembles the design. This benchmark asks whether the agent used the design system correctly.

Those are different questions with different failure modes. An agent can produce a pixel-plausible button that ignores the existing `sl-button`, hardcodes `#ef4444` instead of the danger token, invents a `size="xl"` that the component does not support, and drops the accessible name. Every visual-fidelity score would call that a success. A design-system team would call it a defect in four categories.

The Design System Agent Bench is a proposed set of small, objectively gradeable tasks that measure whether a coding agent, given design intent and an existing component system, produces implementation-ready code that complies with the system: correct component selection, valid API usage, token compliance, preserved accessibility, and escalation on ambiguity instead of invention.

DesignRail already contains most of the harness this requires. The fixtures are benchmark tasks, the compliance agent is a deterministic grader, and the review workspace records human corrections. This RFC proposes the missing piece: a defined task set, a scoring contract, and an experiment design. Nothing described below is built yet unless explicitly marked as existing.

## The Problem

Design-system teams adopting coding agents need an answer to a narrow question: does the agent make the system stronger or does it erode it? Erosion is quiet. It shows up as one-off components that shadow real ones, raw values where tokens belong, props that exist only in the generated code, and accessibility metadata that survives in the design file but not in the output. Each instance passes review as plausible. The accumulation is a second, undocumented design system.

Today there is no standard way to measure this. Teams evaluate agents by demo impression or by generic coding benchmarks, neither of which exercises the constraint that defines this work: the correct answer already exists in the system, and the agent's job is to find it and respect it.

## The Central Question

Given design intent and an existing component system, can an agent produce implementation-ready code that complies with the system rather than merely resembling the design?

Secondary questions the experiment design should answer:

1. How much does machine-readable system context (schemas, tokens, composition rules) improve compliance over prose instructions?
2. Which failure categories persist even with full context?
3. How consistent are results across repeated runs of the same task?
4. What does compliance cost in human corrections, wall-clock time, and model spend?

## Related Work

Design2Code and similar benchmarks measure visual reconstruction: how closely generated markup matches a screenshot. That work is useful and orthogonal. Reconstruction rewards resemblance, and resemblance is exactly the failure mode this benchmark is designed to catch. Agent coding benchmarks like SWE-bench measure task completion in existing codebases but do not model the design-system constraint, where a governing contract (components, tokens, accessibility behavior) defines correctness independent of whether the code runs. This bench sits in the gap: correctness defined by an external system contract, graded deterministically.

## Non-Goals

- **No composite quality score.** Version one reports dimensions separately. A single number would hide exactly the tradeoffs the bench exists to expose.
- **No leaderboard.** The initial goal is a repeatable local study design, not a public ranking of models.
- **No visual-fidelity scoring.** Whether the output looks right is a separate evaluation with different tooling (and prior art). Open question 3 asks whether it should ever join the core bench.
- **No agent framework.** The bench evaluates any agent that can receive a task and emit code. It does not prescribe how the agent works.

## What Already Exists

The bench is designed to fall out of DesignRail's existing pipeline rather than stand beside it:

| Bench requirement          | Existing DesignRail piece                                                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Task input format          | `examples/figma-input.*.json` fixtures validated by `mockFigmaFixtureSchema`                                                   |
| System contract            | `packages/schema` (per-component props, enum values, slots, events, parts) and `packages/design-tokens` (token → CSS variable) |
| Deterministic grader       | `tools/compliance-agent`, which already emits findings in all six categories below                                             |
| Output validation          | `componentMappingSchema` plus the typecheck/build gate                                                                         |
| Human-correction telemetry | Review decisions (accept, reject with rationale, edit with field-level diff) persisted through the GraphQL API                 |
| Run telemetry              | The instrumentation ledger (server and client events share one table)                                                          |

The honest gap: today's pipeline maps one component per fixture (Button, Input, Card). Tasks 4 and 8 below require composition (multiple components in one intent), which the mapper does not support yet. That is the largest engineering prerequisite this RFC surfaces.

## The First Ten Tasks

Each task is small enough to grade objectively. For every task the bench records the input, the expected implementation, the common failure it exists to catch, the deterministic checks that grade it, and what still requires human review.

### 1. Correct component selection

- **Input:** intent for a primary action button.
- **Expected:** `sl-button`, selected from the registry.
- **Common failure:** a styled `<div>` or a bespoke `<button>` with utility classes.
- **Deterministic checks:** emitted tags resolve through the schema registry; unregistered interactive elements are blockers.
- **Human review:** whether the chosen component is the right one when two registered components could plausibly serve the intent.

### 2. Variant mapping

- **Input:** intent with a visual "destructive" treatment.
- **Expected:** `variant="danger"`, an enum value the button schema declares.
- **Common failure:** custom red styling on the default variant.
- **Deterministic checks:** every prop value validates against the schema's enum values (the same check the mapping editor enforces today).
- **Human review:** whether the variant semantically matches the design intent, not just a legal value.

### 3. Token compliance

- **Input:** intent carrying a token reference such as `color.action.primary`.
- **Expected:** the mapped CSS custom property (`--sl-color-primary-600`) from the design-tokens package.
- **Common failure:** the raw hex value inlined.
- **Deterministic checks:** raw color/spacing literals in output are findings; token references must resolve through the token map.
- **Human review:** token choice when several tokens share a value.

### 4. Slot composition

- **Input:** intent for a card with header, body, and footer content.
- **Expected:** content routed through the schema-declared slots.
- **Common failure:** all content flattened into the default slot, or wrapper elements that bypass slots.
- **Deterministic checks:** slot names in output must exist in the schema's slot list.
- **Human review:** content ordering and semantics inside each slot.

### 5. Accessible name preservation

- **Input:** intent for an icon-only button with an accessible label in its accessibility metadata.
- **Expected:** the label survives to the output (`label` slot text or `aria-label`).
- **Common failure:** the icon renders, the name disappears.
- **Deterministic checks:** the accessibility check the compliance agent already runs; a missing accessible name on an interactive element is a blocker.
- **Human review:** whether the name is meaningful, not merely present.

### 6. Keyboard behavior through the component API

- **Input:** intent for a dismissible dialog.
- **Expected:** Escape handling and focus containment via the component's declared events (`sl-request-close`), not hand-rolled key listeners.
- **Common failure:** a manual `keydown` handler and a homemade focus trap beside a component that already does both.
- **Deterministic checks:** event wiring must use schema-declared events; raw key-listener registration on dialog internals is a finding.
- **Human review:** interaction feel and edge cases automated checks cannot see.

### 7. No invented API

- **Input:** intent that tempts extrapolation (for example, a size larger than any the system offers).
- **Expected:** the closest supported value, with the gap noted for review.
- **Common failure:** `size="xl"` emitted as if it existed.
- **Deterministic checks:** unknown props and unknown enum values against the schema are blockers (`DESIGN_SYSTEM_ALIGNMENT`).
- **Human review:** whether the near-miss substitution is acceptable or the gap is real product feedback.

### 8. Reuse over rebuild

- **Input:** intent for a pattern the system already covers (an input with label and helper text).
- **Expected:** the existing component, configured.
- **Common failure:** a rebuilt label-plus-input cluster from generic elements that shadows the real component.
- **Deterministic checks:** structural overlap between emitted generic markup and an existing component's anatomy (its declared parts) is a finding.
- **Human review:** judgment calls where partial reuse plus extension is legitimate.

### 9. Responsive intent without invented breakpoints

- **Input:** intent describing narrow-viewport behavior.
- **Expected:** the system's breakpoints and spacing tokens.
- **Common failure:** a novel `@media (max-width: 847px)` and pixel values with no token backing.
- **Deterministic checks:** breakpoint and spacing literals must resolve to system values.
- **Human review:** whether the responsive interpretation matches the design's intent.

### 10. Escalation on ambiguity

- **Input:** intent that underspecifies something consequential (a variant the system lacks, missing destructive-action copy).
- **Expected:** the agent flags the ambiguity for human review instead of guessing. In DesignRail terms: a mapping with lowered confidence and an explicit fallback note, not an invented answer.
- **Common failure:** silent invention with high stated confidence.
- **Deterministic checks:** fixtures with known ambiguities carry an expected-escalation marker; the bench checks whether the agent surfaced it.
- **Human review:** all of it. Escalation quality is the dimension most resistant to automation, and open question 4 is about exactly this.

## Scoring

Version one reuses DesignRail's existing finding contract instead of inventing a parallel rubric. Each task run produces compliance findings in the six categories the pipeline already grades:

| Category                  | What it grades in bench terms                               |
| ------------------------- | ----------------------------------------------------------- |
| `ACCESSIBILITY`           | Names, roles, required keyboard behavior (tasks 5, 6)       |
| `TOKEN_USAGE`             | Tokens over raw values (tasks 3, 9)                         |
| `VARIANT_COVERAGE`        | Variant and state mapping against declared values (task 2)  |
| `REACT_READINESS`         | Event wiring through declared component events (task 6)     |
| `DOCUMENTATION_READINESS` | Summary and rationale quality on the emitted mapping        |
| `DESIGN_SYSTEM_ALIGNMENT` | Component selection, invented API, reuse (tasks 1, 4, 7, 8) |

Severities keep their existing meanings (`BLOCKER`, `WARNING`, `INFO`), and a task's outcome derives from its findings:

- **Pass:** no blockers, no warnings.
- **Conditional:** warnings only.
- **Fail:** any blocker.

Two hard gates sit outside the findings: the emitted mapping must validate against `componentMappingSchema`, and the generated React example must typecheck and build.

Operational metrics are recorded per run and reported separately, never folded into the outcome:

- Human corrections before acceptance (count of reject and edit decisions in the review ledger).
- Time from task start to accepted output.
- Model and tool cost.
- Variance across repeated runs of the same task (run count is open question 5).

## Experiment Conditions

Three conditions to start. Each condition runs the same ten tasks.

- **A. Prompt only.** The agent receives the task intent and ordinary repository context.
- **B. Repository skill.** A adds focused design-system instructions and worked examples in prose, the way most teams write agent guidance today.
- **C. Machine-readable contract with deterministic validation.** B adds the component schemas, allowed props and enum values, token map, composition rules, and the automated checks as feedback. Condition C is DesignRail's thesis expressed as an experiment arm, and its tooling exists.

C almost certainly beats A, and confirming that would be worth little. The measurements worth having: the size of the B-to-C gap (prose guidance versus machine-readable contract), which failure categories survive even under C, and whether C reduces run-to-run variance.

Deferred conditions, once the first study completes: live Figma input via MCP instead of normalized fixtures, and the full human-review loop where escalations flow through the DesignRail workspace.

## Reference Fixture

One fixture specified end to end, in the same format the existing pipeline validates today. This is a composition task, so it depends on the mapper gap named above; it is written first anyway because a complete example constrains the design better than ten vague ones.

```json
{
  "$schema": "https://designrail.local/figma-input.schema.json",
  "version": "0.2.0",
  "exampleId": "example.dialog.destructive-confirm",
  "intentId": "intent.dialog.destructive-confirm",
  "component": "dialog",
  "componentType": "Dialog",
  "name": "Remove Account Confirmation",
  "summary": "A confirmation dialog for account removal. The destructive action is visually differentiated, keyboard accessible, and stays disabled until the user explicitly confirms intent.",
  "props": {
    "label": "Remove account",
    "confirmationRequired": true
  },
  "variants": ["destructive"],
  "states": ["closed", "open", "confirm-armed"],
  "tokens": [
    {
      "name": "color.feedback.danger",
      "value": "#ef4444",
      "target": "--sl-color-danger-600"
    },
    {
      "name": "spacing.dialog.body",
      "value": "16px",
      "target": "--sl-spacing-medium"
    }
  ],
  "accessibility": {
    "label": "Remove account",
    "role": "dialog",
    "required": false
  }
}
```

- **Allowed components:** `sl-dialog`, `sl-button`, `sl-checkbox`, `sl-alert`. (Dialog, checkbox, and alert schemas do not exist in the registry yet; authoring them is part of the delivery plan.)
- **Valid variants:** the confirm action must be `variant="danger"`; the cancel action must not be.
- **Required accessible behavior:** the dialog exposes the accessible name "Remove account"; Escape closes via `sl-request-close`; focus is contained by the component; initial focus lands on the non-destructive action.
- **Confirmation gate:** the destructive button is disabled until the confirmation checkbox is checked. The gate must use the button's declared `disabled` prop.
- **Forbidden implementations:** `window.confirm`; a `<div>` modal with a hand-rolled focus trap; raw `#ef4444` anywhere; an invented `confirm-required` prop on the dialog; suppressing Escape.
- **Expected escalation points:** the confirmation checkbox copy is not specified in the intent, and the intent does not say whether removal is reversible (which changes the warning copy). Both should surface as review notes, not invented answers.
- **Deterministic checks:** tag allowlist, prop and enum validation for all four components, token resolution, accessible-name presence, event wiring through declared events, no unknown props, build gate.

## Delivery Plan

Deliberately small, in order:

1. **v0 (exists today):** three single-component fixtures flow through import, mapping, compliance, and review, with findings and decisions persisted. This is the harness the bench builds on.
2. **v1:** author the Dialog, Checkbox, and Alert schemas; add composition support to the mapper; write the ten task fixtures with expected-escalation markers; build a small runner that executes conditions A, B, and C per task and stores results through the existing GraphQL contract.
3. **v1 report:** one results document with per-category outcomes, correction counts, and variance. No composite score.

Anything beyond that (more design-system adapters, Figma MCP input, hosted results) waits until v1 has produced a number worth arguing about.

## Open Questions

1. **Gradeability boundary.** Which of the ten tasks are fully deterministic, and which quietly depend on judgment? Task 8 (reuse over rebuild) is the most suspect: structural-overlap detection may need a human tiebreak more often than the design admits.
2. **Missing failure categories.** What design-system failures does this set not catch? Candidates: theming and dark-mode correctness, RTL behavior, motion and reduced-motion compliance, density modes.
3. **Visual fidelity.** Core bench, separate evaluation, or excluded entirely? Current position: separate, because it needs different tooling and rewards the wrong instinct when mixed with compliance.
4. **Scoring escalation.** An agent that escalates everything is useless; an agent that never escalates is dangerous. Escalation scoring probably needs precision and recall against known-ambiguity markers, and it is unclear what a good target looks like.
5. **Run count and variance.** How many repeated runs per task and condition before variance numbers mean anything, given cost?
6. **Contamination.** Public fixtures with published expected implementations will eventually appear in training data. Does the bench need a held-out fixture set, and who holds it?
7. **Adapters.** Which public design systems would make useful second adapters? The contract format wants systems with machine-readable component APIs; candidates and counter-arguments welcome.

## Feedback Requested

Specific critique is more useful than general encouragement:

1. Which scoring dimensions above are objectively gradeable, and which am I fooling myself about?
2. Which important design-system failure modes are missing from the task set?
3. Should visual fidelity join the core bench or stay a separate evaluation?
4. How should ambiguity handling be scored so that neither over- nor under-escalation wins?
5. Which public design systems would make useful initial adapters beyond Shoelace?

Comment on the PR that introduced this document, or open an issue referencing RFC 001.
