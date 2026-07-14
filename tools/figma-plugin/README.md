# @designrail/figma-plugin

A credential-free Figma plugin that exports the selected component as a DesignRail fixture. The exported JSON is the same `figma-input.*.json` shape the mock fixtures use, so it flows through the existing pipeline (import, mapping, compliance review, human decision, export) with no special handling. A `figma` provenance block marks the intent as FIGMA-sourced in the review workspace.

The plugin makes no network requests and needs no token. The JSON leaves Figma only when you copy or download it.

## Build and load

```sh
pnpm --filter @designrail/figma-plugin build
```

Then in the Figma desktop app: **Plugins → Development → Import plugin from manifest…** and select `tools/figma-plugin/manifest.json`.

## Use

1. Select one supported component, component set, or instance. The current mapping registry supports Button, Input, and Card.
2. The panel shows the derived fixture: component type, source-unique example id, variants, states, props, tokens, and any extraction warnings. Copy and download stay disabled when the component type has no registered mapping.
3. **Copy JSON** or **Download**, save the file under `examples/` in this repo.
4. Run `pnpm design:verify` to verify import, mapping, and compliance review. Start or restart the API; it discovers provenance-carrying fixtures in `examples/` and persists their deterministic pipeline output for the review workspace.

## What it extracts

- **Component type and ids** from the node name (`Button/Primary` → `Button`, `example.button.primary`).
- **Variants and states** from variant group properties named `variant`/`appearance`/`style`/`type` and `state`/`interaction`; a differently named group is used with a warning.
- **Props** from component properties (Figma's `Name#id` keys are cleaned to camelCase); the first text layer becomes `label` when no text property exists.
- **Tokens** from variables bound to the selected node, best effort. Deep traversal and style-based tokens are not implemented yet.
- **Accessibility** label from the first text layer (falling back to the node name, with a warning) and a role only for component types with an unambiguous mapping.

Extraction is deliberately conservative: anything uncertain becomes a warning in the panel instead of an invented value, and the human review gate downstream stays the authority.
