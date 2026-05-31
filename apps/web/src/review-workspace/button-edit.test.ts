import { buttonComponentMappingFixture } from '@designrail/shared';
import { describe, expect, it } from 'vitest';

import type { ComponentMappingResult, ReviewDecisionResult } from '../graphql/operations.js';

import {
  createButtonEditDraft,
  createSaveDecisionInput,
  LOCAL_REVIEWER_LABEL,
} from './button-edit.js';

const MAPPING: ComponentMappingResult = {
  ...buttonComponentMappingFixture,
  mappedTokens: buttonComponentMappingFixture.mappedTokens.map((token) => ({
    ...token,
    value: token.value ?? null,
    target: token.target ?? null,
  })),
  fallbackNotes: buttonComponentMappingFixture.fallbackNotes ?? null,
};

function editedDecision(): ReviewDecisionResult {
  return {
    id: 'decision.edited',
    mappingId: MAPPING.id,
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

describe('createButtonEditDraft', () => {
  it('seeds the draft from the mapping when there is no decision', () => {
    expect(createButtonEditDraft(MAPPING, null)).toEqual({
      confidence: 'HIGH',
      disabled: false,
      label: 'Save changes',
      notes: '',
      rationale: MAPPING.rationale,
      size: 'medium',
      variant: 'primary',
    });
  });

  it('prefers edited mapping values when the latest decision is EDITED', () => {
    expect(createButtonEditDraft(MAPPING, editedDecision())).toEqual({
      confidence: 'LOW',
      disabled: true,
      label: 'Publish changes',
      notes: 'Edited notes',
      rationale: 'Edited rationale',
      size: 'large',
      variant: 'warning',
    });
  });

  it('falls back to the mapping when a non-EDITED decision carries notes', () => {
    const draft = createButtonEditDraft(MAPPING, {
      id: 'decision.accepted',
      mappingId: MAPPING.id,
      status: 'ACCEPTED',
      reviewerLabel: 'Reviewer',
      editedMapping: null,
      notes: 'Looks good',
      createdAt: '2026-01-01T00:00:01.000Z',
    });

    expect(draft.notes).toBe('Looks good');
    expect(draft.variant).toBe('primary');
    expect(draft.label).toBe('Save changes');
  });

  it('uses safe defaults when no mapping exists', () => {
    expect(createButtonEditDraft(null, null)).toEqual({
      confidence: 'MEDIUM',
      disabled: false,
      label: '',
      notes: '',
      rationale: '',
      size: 'medium',
      variant: 'primary',
    });
  });
});

describe('createSaveDecisionInput', () => {
  const draft = createButtonEditDraft(MAPPING, editedDecision());

  it('omits the edited mapping for non-EDITED decisions', () => {
    expect(createSaveDecisionInput(MAPPING.id, 'ACCEPTED', draft)).toEqual({
      mappingId: MAPPING.id,
      status: 'ACCEPTED',
      reviewerLabel: LOCAL_REVIEWER_LABEL,
      notes: 'Edited notes',
    });
  });

  it('drops blank notes after trimming', () => {
    const input = createSaveDecisionInput(MAPPING.id, 'REJECTED', {
      ...draft,
      notes: '   ',
    });

    expect(input).not.toHaveProperty('notes');
  });

  it('builds a trimmed Button mapping edit for EDITED decisions', () => {
    const input = createSaveDecisionInput(MAPPING.id, 'EDITED', {
      ...draft,
      label: '  Publish changes  ',
      rationale: '  Edited rationale  ',
    });

    expect(input.editedMapping).toEqual({
      mappedProps: { variant: 'warning', size: 'large', disabled: true },
      mappedSlots: { default: 'Publish changes' },
      confidence: 'LOW',
      rationale: 'Edited rationale',
    });
  });
});
