# React Shoelace Integration Skill

## Use when

Work changes React usage of Shoelace Web Components, custom wrappers, events, or token styling.

## Goal

Integrate Shoelace components in React cleanly, accessibly, and with design-token discipline.

## Rules

- Register Shoelace components explicitly.
- Handle Web Component events intentionally and with typed boundaries.
- Use CSS custom properties and design tokens for styling.
- Show relevant variants, disabled, loading, focus, and validation states.
- Keep wrappers small. Do not hide important Shoelace behavior behind broad abstractions.
- Keep React-specific code out of mapping and schema modules.
