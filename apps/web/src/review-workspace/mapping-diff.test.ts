import { getComponentSchema } from '@designrail/schema';
import { buttonComponentMappingFixture, inputComponentMappingFixture } from '@designrail/shared';
import { describe, expect, it } from 'vitest';

import type { ComponentMappingResult } from '../graphql/operations.js';

import { computeMappingDiff } from './mapping-diff.js';

const buttonSchema = getComponentSchema('Button')!;
const inputSchema = getComponentSchema('Input')!;

const BUTTON_MAPPING: ComponentMappingResult = {
  ...buttonComponentMappingFixture,
  mappedTokens: buttonComponentMappingFixture.mappedTokens.map((token) => ({
    ...token,
    value: token.value ?? null,
    target: token.target ?? null,
  })),
  fallbackNotes: buttonComponentMappingFixture.fallbackNotes ?? null,
};

const INPUT_MAPPING: ComponentMappingResult = {
  ...inputComponentMappingFixture,
  mappedTokens: inputComponentMappingFixture.mappedTokens.map((token) => ({
    ...token,
    value: token.value ?? null,
    target: token.target ?? null,
  })),
  fallbackNotes: inputComponentMappingFixture.fallbackNotes ?? null,
};

describe('computeMappingDiff', () => {
  it('flags no rows as changed when the edited mapping matches the recommendation', () => {
    const rows = computeMappingDiff(buttonSchema, BUTTON_MAPPING, {
      mappedProps: BUTTON_MAPPING.mappedProps,
      mappedSlots: BUTTON_MAPPING.mappedSlots,
      confidence: BUTTON_MAPPING.confidence,
      rationale: BUTTON_MAPPING.rationale,
    });

    expect(rows.every((row) => !row.changed)).toBe(true);
  });

  it('flags only the props that differ', () => {
    const rows = computeMappingDiff(buttonSchema, BUTTON_MAPPING, {
      mappedProps: { variant: 'warning', size: 'large', disabled: true },
      confidence: 'HIGH',
      rationale: BUTTON_MAPPING.rationale,
    });
    const changedKeys = rows.filter((row) => row.changed).map((row) => row.key);

    expect(changedKeys).toEqual(expect.arrayContaining(['variant', 'size', 'disabled']));
  });

  it('diffs the slot label when the component has a default slot', () => {
    const rows = computeMappingDiff(buttonSchema, BUTTON_MAPPING, {
      mappedProps: BUTTON_MAPPING.mappedProps,
      mappedSlots: { default: 'Publish changes' },
      confidence: BUTTON_MAPPING.confidence,
      rationale: BUTTON_MAPPING.rationale,
    });

    expect(rows.find((row) => row.key === 'slot')).toMatchObject({
      recommendedValue: 'Save changes',
      editedValue: 'Publish changes',
      changed: true,
    });
  });

  it('omits the slot row for childless components', () => {
    const rows = computeMappingDiff(inputSchema, INPUT_MAPPING, {
      mappedProps: INPUT_MAPPING.mappedProps,
      confidence: INPUT_MAPPING.confidence,
      rationale: INPUT_MAPPING.rationale,
    });

    expect(rows.find((row) => row.key === 'slot')).toBeUndefined();
  });

  it('diffs confidence and rationale', () => {
    const rows = computeMappingDiff(buttonSchema, BUTTON_MAPPING, {
      mappedProps: BUTTON_MAPPING.mappedProps,
      confidence: 'LOW',
      rationale: 'A different rationale.',
    });

    expect(rows.find((row) => row.key === 'confidence')).toMatchObject({ changed: true });
    expect(rows.find((row) => row.key === 'rationale')).toMatchObject({ changed: true });
  });

  it('treats an omitted prop key in the edited mapping as unchanged', () => {
    const rows = computeMappingDiff(buttonSchema, BUTTON_MAPPING, {
      mappedProps: { variant: 'warning' },
      confidence: BUTTON_MAPPING.confidence,
      rationale: BUTTON_MAPPING.rationale,
    });

    expect(rows.find((row) => row.key === 'size')).toMatchObject({ changed: false });
    expect(rows.find((row) => row.key === 'disabled')).toMatchObject({ changed: false });
  });
});
