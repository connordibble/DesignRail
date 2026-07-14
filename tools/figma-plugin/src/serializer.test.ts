import { mockFigmaFixtureSchema } from '@designrail/shared';
import { describe, expect, it } from 'vitest';

import { serializeFixture, slugify, type FigmaNodeSnapshot } from './serializer.js';

const BUTTON_SET: FigmaNodeSnapshot = {
  id: '12:34',
  name: 'Button',
  type: 'COMPONENT_SET',
  description: 'A primary action button with size and disabled state intent.',
  fileKey: 'demo-file-key',
  variantGroups: {
    Variant: ['Primary', 'Neutral'],
    State: ['Default', 'Hover', 'Focus', 'Disabled'],
  },
  properties: {
    Variant: 'Primary',
    State: 'Default',
    'Label#101:2': 'Save changes',
    Disabled: false,
  },
  primaryText: 'Save changes',
  tokens: [{ name: 'color.action.primary', value: '#2563eb', target: '--sl-color-primary-600' }],
};

describe('@designrail/figma-plugin serializer', () => {
  it('serializes a component set into a schema-valid fixture', () => {
    const { canExport, fileName, fixture, warnings } = serializeFixture(BUTTON_SET);

    expect(() => mockFigmaFixtureSchema.parse(fixture)).not.toThrow();
    expect(fileName).toBe('figma-input.button.primary.12-34-e3595fff.json');
    expect(fixture.exampleId).toBe('example.button.primary.12-34-e3595fff');
    expect(fixture.intentId).toBe('intent.button.primary.12-34-e3595fff');
    expect(fixture.componentType).toBe('Button');
    expect(fixture.variants).toEqual(['primary', 'neutral']);
    expect(fixture.states).toEqual(['default', 'hover', 'focus', 'disabled']);
    expect(fixture.summary).toBe('A primary action button with size and disabled state intent.');
    expect(canExport).toBe(true);
    expect(warnings).toEqual([]);
  });

  it('carries figma provenance so the importer marks the intent FIGMA-sourced', () => {
    const { fixture } = serializeFixture(BUTTON_SET);

    expect(fixture.figma).toEqual({
      nodeId: '12:34',
      nodeName: 'Button',
      fileKey: 'demo-file-key',
    });
  });

  it('maps component properties into props and keeps variant axes out', () => {
    const { fixture } = serializeFixture(BUTTON_SET);

    expect(fixture.props).toEqual({ label: 'Save changes', disabled: false });
  });

  it('derives ids from slash-named components', () => {
    const { fixture, fileName } = serializeFixture({
      id: '9:1',
      name: 'Icon Button / Small · Ghost',
      type: 'COMPONENT',
    });

    expect(() => mockFigmaFixtureSchema.parse(fixture)).not.toThrow();
    expect(fixture.componentType).toBe('IconButton');
    expect(fixture.exampleId).toMatch(/^example\.[a-z0-9-]+\.[a-z0-9-]+\.[a-z0-9-]+$/);
    expect(fixture.exampleId).toBe('example.icon-button.small-ghost.9-1-aab3d2d5');
    expect(fileName).toBe('figma-input.icon-button.small-ghost.9-1-aab3d2d5.json');
  });

  it('falls back with warnings when text, tokens, and variant groups are missing', () => {
    const { fixture, warnings } = serializeFixture({
      id: '3:3',
      name: 'Card',
      type: 'INSTANCE',
    });

    expect(() => mockFigmaFixtureSchema.parse(fixture)).not.toThrow();
    expect(fixture.exampleId).toBe('example.card.export.3-3-1b19dfa5');
    expect(fixture.variants).toEqual([]);
    expect(fixture.states).toEqual([]);
    expect(fixture.accessibility.label).toBe('Card');
    expect(fixture.summary).toBe('Card exported from Figma via the DesignRail plugin.');
    expect(warnings.length).toBeGreaterThanOrEqual(2);
  });

  it('uses a non-standard variant group with a warning and no role for unknown components', () => {
    const { canExport, fixture, warnings } = serializeFixture({
      id: '5:5',
      name: 'Banner',
      type: 'COMPONENT_SET',
      variantGroups: { Size: ['Small', 'Large'] },
      properties: { Size: 'Small' },
      primaryText: 'Deploys are paused',
    });

    expect(() => mockFigmaFixtureSchema.parse(fixture)).not.toThrow();
    expect(fixture.variants).toEqual(['small', 'large']);
    expect(fixture.accessibility.role).toBeUndefined();
    expect(fixture.accessibility.label).toBe('Deploys are paused');
    expect(warnings.some((warning) => warning.includes('"Size"'))).toBe(true);
    expect(warnings.some((warning) => warning.includes('No Shoelace mapping'))).toBe(true);
    expect(canExport).toBe(false);
  });

  it('drops empty token values and targets instead of failing validation', () => {
    const { fixture } = serializeFixture({
      ...BUTTON_SET,
      tokens: [
        { name: 'color.action.primary', value: '', target: '--sl-color-primary-600' },
        { name: '  ', value: '#fff' },
      ],
    });

    expect(() => mockFigmaFixtureSchema.parse(fixture)).not.toThrow();
    expect(fixture.tokens).toEqual([
      { name: 'color.action.primary', target: '--sl-color-primary-600' },
    ]);
  });

  it('slugifies arbitrary node names safely', () => {
    expect(slugify('Button / Primary (v2)')).toBe('button-primary-v2');
    expect(slugify('  ')).toBe('');
  });

  it('includes figma source identity in ids and file names', () => {
    const first = serializeFixture(BUTTON_SET);
    const second = serializeFixture({ ...BUTTON_SET, id: '12:35' });
    const otherFile = serializeFixture({ ...BUTTON_SET, fileKey: 'other-file' });

    expect(
      new Set([first.fixture.exampleId, second.fixture.exampleId, otherFile.fixture.exampleId]),
    ).toHaveLength(3);
    expect(new Set([first.fileName, second.fileName, otherFile.fileName])).toHaveLength(3);
  });
});
