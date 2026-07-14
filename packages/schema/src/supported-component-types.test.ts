import { describe, expect, it } from 'vitest';

import { listComponentSchemas } from './registry.js';
import {
  SUPPORTED_COMPONENT_TYPES,
  isSupportedComponentType,
} from './supported-component-types.js';

describe('supported component types', () => {
  it('stays in sync with the schema registry', () => {
    // The plugin bundle cannot import the registry (it pulls in zod), so this
    // dependency-free list mirrors it. Adding a schema without updating the list
    // would silently make the plugin refuse to export the new component type.
    const registryTypes = listComponentSchemas()
      .map((schema) => schema.componentType)
      .sort();

    expect([...SUPPORTED_COMPONENT_TYPES].sort()).toEqual(registryTypes);
  });

  it('answers membership for known and unknown types', () => {
    expect(isSupportedComponentType('Button')).toBe(true);
    expect(isSupportedComponentType('Banner')).toBe(false);
  });
});
