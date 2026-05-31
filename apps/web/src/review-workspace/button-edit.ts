import type {
  JsonValue,
  MappingConfidence,
  MappingEdit,
  ReviewDecisionStatus,
} from '@designrail/shared';

import type {
  ComponentMappingResult,
  ReviewDecisionResult,
  SaveReviewDecisionInput,
} from '../graphql/operations.js';

export interface ButtonEditDraft {
  confidence: MappingConfidence;
  disabled: boolean;
  label: string;
  notes: string;
  rationale: string;
  size: string;
  variant: string;
}

export const LOCAL_REVIEWER_LABEL = 'Local reviewer';

export const BUTTON_VARIANT_OPTIONS = [
  'default',
  'primary',
  'success',
  'neutral',
  'warning',
  'danger',
  'text',
] as const;
export const BUTTON_SIZE_OPTIONS = ['small', 'medium', 'large'] as const;
export const MAPPING_CONFIDENCE_OPTIONS: MappingConfidence[] = ['HIGH', 'MEDIUM', 'LOW'];

export function createButtonEditDraft(
  mapping: ComponentMappingResult | null,
  latestDecision: ReviewDecisionResult | null,
): ButtonEditDraft {
  if (mapping === null) {
    return {
      confidence: 'MEDIUM',
      disabled: false,
      label: '',
      notes: latestDecision?.notes ?? '',
      rationale: '',
      size: 'medium',
      variant: 'primary',
    };
  }

  const editedMapping = latestDecision?.status === 'EDITED' ? latestDecision.editedMapping : null;
  const mappedProps = editedMapping?.mappedProps ?? mapping.mappedProps;
  const mappedSlots = editedMapping?.mappedSlots ?? mapping.mappedSlots;

  return {
    confidence: editedMapping?.confidence ?? mapping.confidence,
    disabled: getJsonBooleanValue(mappedProps, 'disabled', false),
    label: getJsonStringValue(mappedSlots, 'default', mapping.targetComponent),
    notes: latestDecision?.notes ?? '',
    rationale: editedMapping?.rationale ?? mapping.rationale,
    size: getJsonStringValue(mappedProps, 'size', 'medium'),
    variant: getJsonStringValue(mappedProps, 'variant', 'primary'),
  };
}

export function createSaveDecisionInput(
  mappingId: string,
  status: ReviewDecisionStatus,
  draft: ButtonEditDraft,
): SaveReviewDecisionInput {
  const notes = draft.notes.trim();
  const base = {
    mappingId,
    status,
    reviewerLabel: LOCAL_REVIEWER_LABEL,
    ...(notes.length === 0 ? {} : { notes }),
  };

  if (status !== 'EDITED') {
    return base;
  }

  return {
    ...base,
    editedMapping: createButtonMappingEdit(draft),
  };
}

function createButtonMappingEdit(draft: ButtonEditDraft): MappingEdit {
  return {
    mappedProps: {
      variant: draft.variant,
      size: draft.size,
      disabled: draft.disabled,
    },
    mappedSlots: {
      default: draft.label.trim(),
    },
    confidence: draft.confidence,
    rationale: draft.rationale.trim(),
  };
}

function getJsonStringValue(
  record: Record<string, JsonValue>,
  key: string,
  fallback: string,
): string {
  const value = record[key];

  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function getJsonBooleanValue(
  record: Record<string, JsonValue>,
  key: string,
  fallback: boolean,
): boolean {
  const value = record[key];

  return typeof value === 'boolean' ? value : fallback;
}
