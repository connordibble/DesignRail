import type { ShoelaceComponentSchema } from './core.js';
import { buttonSchema } from './shoelace/button.js';
import { cardSchema } from './shoelace/card.js';
import { inputSchema } from './shoelace/input.js';

const REGISTRY: ReadonlyMap<string, ShoelaceComponentSchema> = new Map([
  [buttonSchema.componentType, buttonSchema],
  [inputSchema.componentType, inputSchema],
  [cardSchema.componentType, cardSchema],
]);

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
