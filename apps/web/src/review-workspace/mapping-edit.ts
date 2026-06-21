import {
  hasDefaultSlot,
  listEditableProps,
  type ShoelaceComponentSchema,
} from '@designrail/schema';
import type {
  JsonValue,
  MappingConfidence,
  MappingEdit,
  Metadata,
  ReviewDecisionStatus,
} from '@designrail/shared';

import type {
  ComponentMappingResult,
  ReviewDecisionResult,
  SaveReviewDecisionInput,
} from '../graphql/operations.js';

export const LOCAL_REVIEWER_LABEL = 'Local reviewer';
export const MAPPING_CONFIDENCE_OPTIONS: MappingConfidence[] = ['HIGH', 'MEDIUM', 'LOW'];

export type MappingPropValue = string | boolean;

export interface MappingEditDraft {
  /** Editable Shoelace prop values keyed by prop name. */
  props: Record<string, MappingPropValue>;
  /** Default-slot text, or `null` when the component has no default slot. */
  slotLabel: string | null;
  confidence: MappingConfidence;
  rationale: string;
  notes: string;
}

/** Build the editor draft for a component, preferring the latest EDITED decision's values. */
export function createMappingEditDraft(
  schema: ShoelaceComponentSchema,
  mapping: ComponentMappingResult | null,
  latestDecision: ReviewDecisionResult | null,
): MappingEditDraft {
  const editedMapping = latestDecision?.status === 'EDITED' ? latestDecision.editedMapping : null;
  const sourceProps: Metadata = editedMapping?.mappedProps ?? mapping?.mappedProps ?? {};
  const sourceSlots: Metadata = editedMapping?.mappedSlots ?? mapping?.mappedSlots ?? {};

  const props: Record<string, MappingPropValue> = {};
  for (const prop of listEditableProps(schema)) {
    const value = sourceProps[prop.name];

    if (prop.kind === 'boolean') {
      props[prop.name] = typeof value === 'boolean' ? value : booleanDefault(prop.default);
    } else {
      props[prop.name] =
        value === undefined || value === null ? stringDefault(prop.default) : String(value);
    }
  }

  return {
    props,
    slotLabel: hasDefaultSlot(schema) ? getSlotText(sourceSlots) : null,
    confidence: editedMapping?.confidence ?? mapping?.confidence ?? 'MEDIUM',
    rationale: editedMapping?.rationale ?? mapping?.rationale ?? '',
    notes: latestDecision?.notes ?? '',
  };
}

/** Whether an EDITED decision can be saved from the current draft. */
export function canSaveMappingEdit(draft: MappingEditDraft): boolean {
  const slotReady = draft.slotLabel === null || draft.slotLabel.trim().length > 0;

  return slotReady && draft.rationale.trim().length > 0;
}

export function createSaveDecisionInput(
  schema: ShoelaceComponentSchema,
  mappingId: string,
  status: ReviewDecisionStatus,
  draft: MappingEditDraft,
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
    editedMapping: createMappingEdit(schema, draft),
  };
}

function createMappingEdit(schema: ShoelaceComponentSchema, draft: MappingEditDraft): MappingEdit {
  const mappedProps: Metadata = {};

  for (const prop of listEditableProps(schema)) {
    const value = draft.props[prop.name];

    if (prop.kind === 'boolean') {
      mappedProps[prop.name] = Boolean(value);
      continue;
    }

    if (prop.kind === 'number') {
      const numeric = Number(value);
      if (Number.isFinite(numeric)) {
        mappedProps[prop.name] = numeric;
      }
      continue;
    }

    const text = String(value).trim();
    if (text.length > 0) {
      mappedProps[prop.name] = text;
    }
  }

  const edit: MappingEdit = {
    mappedProps,
    confidence: draft.confidence,
    rationale: draft.rationale.trim(),
  };

  if (draft.slotLabel !== null) {
    edit.mappedSlots = { default: draft.slotLabel.trim() };
  }

  return edit;
}

function getSlotText(slots: Metadata): string {
  const value = slots['default'];

  return typeof value === 'string' ? value : '';
}

function booleanDefault(value: JsonValue | undefined): boolean {
  return typeof value === 'boolean' ? value : false;
}

function stringDefault(value: JsonValue | undefined): string {
  return value === undefined || value === null || typeof value === 'object' ? '' : String(value);
}
