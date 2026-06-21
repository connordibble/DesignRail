import { describe, expect, it } from 'vitest';

import {
  PACKAGE_NAME,
  SHOELACE_LIBRARY_VERSION,
  coerceEnumValue,
  defineProp,
  getComponentSchema,
  getDefaultSlotLabel,
  getProp,
  hasDefaultSlot,
  listComponentSchemas,
  listEditableProps,
  shoelaceComponentSchemaSchema,
} from './index.js';

describe('@designrail/schema', () => {
  it('exports a package marker', () => {
    expect(PACKAGE_NAME).toBe('@designrail/schema');
  });

  it('registers valid Button, Input, and Card schemas keyed by component type', () => {
    const schemas = listComponentSchemas();

    expect(schemas.map((schema) => schema.componentType)).toEqual(['Button', 'Input', 'Card']);

    for (const schema of schemas) {
      expect(() => shoelaceComponentSchemaSchema.parse(schema)).not.toThrow();
      expect(schema.libraryVersion).toBe(SHOELACE_LIBRARY_VERSION);
    }
  });

  it('resolves schemas by intent component type', () => {
    expect(getComponentSchema('Button')?.tag).toBe('sl-button');
    expect(getComponentSchema('Input')?.tag).toBe('sl-input');
    expect(getComponentSchema('Card')?.tag).toBe('sl-card');
    expect(getComponentSchema('Unknown')).toBeNull();
  });

  it('marks interactive controls as requiring an accessible name and containers as not', () => {
    expect(getComponentSchema('Button')?.requiresAccessibleName).toBe(true);
    expect(getComponentSchema('Input')?.requiresAccessibleName).toBe(true);
    expect(getComponentSchema('Card')?.requiresAccessibleName).toBe(false);
  });

  it('treats Button as having a default slot and Input as childless', () => {
    const button = getComponentSchema('Button');
    const input = getComponentSchema('Input');
    const card = getComponentSchema('Card');

    expect(button).not.toBeNull();
    expect(input).not.toBeNull();
    expect(card).not.toBeNull();
    expect(hasDefaultSlot(button!)).toBe(true);
    expect(hasDefaultSlot(input!)).toBe(false);
    expect(hasDefaultSlot(card!)).toBe(true);
    expect(getDefaultSlotLabel(button!)).toBe('Label');
    expect(getDefaultSlotLabel(card!)).toBe('Content');
  });

  it('records diverging export names for input help text', () => {
    const input = getComponentSchema('Input');
    const helpText = input === null ? null : getProp(input, 'helpText');

    expect(helpText?.htmlAttribute).toBe('help-text');
    expect(helpText?.reactProp).toBe('helpText');
  });

  it('defaults prop export names and intent keys to the prop name', () => {
    const prop = defineProp({ name: 'disabled', kind: 'boolean', default: false });

    expect(prop).toMatchObject({
      htmlAttribute: 'disabled',
      reactProp: 'disabled',
      intentKeys: ['disabled'],
      editable: true,
    });
  });

  it('coerces enum values case-insensitively and rejects unknown values', () => {
    const button = getComponentSchema('Button');
    const variant = button === null ? null : getProp(button, 'variant');

    expect(variant).not.toBeNull();
    expect(coerceEnumValue(variant!, 'Primary')).toBe('primary');
    expect(coerceEnumValue(variant!, 'secondary')).toBeNull();
  });

  it('exposes editable props for the review editor', () => {
    const button = getComponentSchema('Button');

    expect(button).not.toBeNull();
    expect(listEditableProps(button!).map((prop) => prop.name)).toContain('variant');
  });
});
