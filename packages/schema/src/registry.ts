import type { ShoelaceComponentSchema } from './core.js';
import { buttonSchema } from './shoelace/button.js';
import { cardSchema } from './shoelace/card.js';
import { inputSchema } from './shoelace/input.js';
import type { SupportedComponentType } from './supported-component-types.js';

const SCHEMAS = {
  Button: buttonSchema,
  Input: inputSchema,
  Card: cardSchema,
} satisfies Record<SupportedComponentType, ShoelaceComponentSchema>;

const REGISTRY: ReadonlyMap<string, ShoelaceComponentSchema> = new Map(Object.entries(SCHEMAS));

/** Resolve the Shoelace schema for an intent `componentType`, or `null` when unsupported. */
export function getComponentSchema(componentType: string): ShoelaceComponentSchema | null {
  return REGISTRY.get(componentType) ?? null;
}

/** Resolve the Shoelace schema by custom-element tag (e.g. `sl-input`), or `null` when unsupported. */
export function getComponentSchemaByTag(tag: string): ShoelaceComponentSchema | null {
  return [...REGISTRY.values()].find((schema) => schema.tag === tag) ?? null;
}

export function listComponentSchemas(): ShoelaceComponentSchema[] {
  return [...REGISTRY.values()];
}
