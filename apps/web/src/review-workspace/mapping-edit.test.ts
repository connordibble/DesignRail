import { getComponentSchema } from '@designrail/schema';
import { buttonComponentMappingFixture, inputComponentMappingFixture } from '@designrail/shared';
import { describe, expect, it } from 'vitest';

import type { ComponentMappingResult, ReviewDecisionResult } from '../graphql/operations.js';

import {
  canSaveMappingEdit,
  createMappingEditDraft,
  createSaveDecisionInput,
  LOCAL_REVIEWER_LABEL,
} from './mapping-edit.js';

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

function editedButtonDecision(): ReviewDecisionResult {
  return {
    id: 'decision.edited',
    mappingId: BUTTON_MAPPING.id,
    status: 'EDITED',
    reviewerLabel: 'Reviewer',
    editedMapping: {
      mappedProps: { variant: 'warning', size: 'large', disabled: true },
      mappedSlots: { default: 'Publish changes' },
      confidence: 'LOW',
      rationale: 'Edited rationale',
    },
    notes: 'Edited notes',
    createdAt: '2026-01-01T00:00:01.000Z',
  };
}

describe('createMappingEditDraft', () => {
  it('seeds the Button draft from the mapping when there is no decision', () => {
    expect(createMappingEditDraft(buttonSchema, BUTTON_MAPPING, null)).toEqual({
      props: { variant: 'primary', size: 'medium', disabled: false },
      slotLabel: 'Save changes',
      confidence: 'HIGH',
      rationale: BUTTON_MAPPING.rationale,
      notes: '',
    });
  });

  it('prefers edited mapping values when the latest decision is EDITED', () => {
    expect(createMappingEditDraft(buttonSchema, BUTTON_MAPPING, editedButtonDecision())).toEqual({
      props: { variant: 'warning', size: 'large', disabled: true },
      slotLabel: 'Publish changes',
      confidence: 'LOW',
      rationale: 'Edited rationale',
      notes: 'Edited notes',
    });
  });

  it('uses a null slot label for childless components like Input', () => {
    const draft = createMappingEditDraft(inputSchema, INPUT_MAPPING, null);

    expect(draft.slotLabel).toBeNull();
    expect(draft.props).toMatchObject({
      type: 'email',
      label: 'Email address',
      required: true,
      disabled: false,
    });
  });
});

describe('createSaveDecisionInput', () => {
  it('omits the edited mapping for non-EDITED decisions but keeps notes', () => {
    const draft = createMappingEditDraft(buttonSchema, BUTTON_MAPPING, editedButtonDecision());

    expect(createSaveDecisionInput(buttonSchema, BUTTON_MAPPING.id, 'ACCEPTED', draft)).toEqual({
      mappingId: BUTTON_MAPPING.id,
      status: 'ACCEPTED',
      reviewerLabel: LOCAL_REVIEWER_LABEL,
      notes: 'Edited notes',
    });
  });

  it('drops blank notes after trimming', () => {
    const draft = createMappingEditDraft(buttonSchema, BUTTON_MAPPING, null);
    const input = createSaveDecisionInput(buttonSchema, BUTTON_MAPPING.id, 'REJECTED', {
      ...draft,
      notes: '   ',
    });

    expect(input).not.toHaveProperty('notes');
  });

  it('builds a trimmed Button mapping edit for EDITED decisions', () => {
    const draft = createMappingEditDraft(buttonSchema, BUTTON_MAPPING, editedButtonDecision());
    const input = createSaveDecisionInput(buttonSchema, BUTTON_MAPPING.id, 'EDITED', {
      ...draft,
      slotLabel: '  Publish changes  ',
      rationale: '  Edited rationale  ',
    });

    expect(input.editedMapping).toEqual({
      mappedProps: { variant: 'warning', size: 'large', disabled: true },
      mappedSlots: { default: 'Publish changes' },
      confidence: 'LOW',
      rationale: 'Edited rationale',
    });
  });

  it('omits mappedSlots for childless components', () => {
    const draft = createMappingEditDraft(inputSchema, INPUT_MAPPING, null);
    const input = createSaveDecisionInput(inputSchema, INPUT_MAPPING.id, 'EDITED', {
      ...draft,
      rationale: 'Reviewed input',
    });

    expect(input.editedMapping?.mappedSlots).toBeUndefined();
    expect(input.editedMapping?.mappedProps).toMatchObject({ type: 'email', required: true });
  });
});

describe('canSaveMappingEdit', () => {
  it('requires a slot label (when present) and a rationale', () => {
    const draft = createMappingEditDraft(buttonSchema, BUTTON_MAPPING, null);

    expect(canSaveMappingEdit(draft)).toBe(true);
    expect(canSaveMappingEdit({ ...draft, slotLabel: '  ' })).toBe(false);
    expect(canSaveMappingEdit({ ...draft, rationale: '' })).toBe(false);
  });
});
