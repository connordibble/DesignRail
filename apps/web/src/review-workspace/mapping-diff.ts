import {
  getDefaultSlotLabel,
  hasDefaultSlot,
  listEditableProps,
  type ShoelaceComponentSchema,
} from '@designrail/schema';
import type { JsonValue, MappingEdit } from '@designrail/shared';

import type { ComponentMappingResult } from '../graphql/operations.js';

export interface MappingDiffRow {
  /** Prop name, or `slot` | `confidence` | `rationale` for the fixed rows. */
  key: string;
  label: string;
  recommendedValue: string;
  editedValue: string;
  changed: boolean;
}

/** Diff a recommended mapping against an EDITED decision's mapping, in the same field order as MappingEditor. */
export function computeMappingDiff(
  schema: ShoelaceComponentSchema,
  recommendedMapping: ComponentMappingResult,
  editedMapping: MappingEdit,
): MappingDiffRow[] {
  const rows: MappingDiffRow[] = [];

  if (hasDefaultSlot(schema)) {
    const recommendedValue = formatDiffValue(recommendedMapping.mappedSlots['default']);
    const editedValue = formatDiffValue(
      editedMapping.mappedSlots?.['default'] ?? recommendedMapping.mappedSlots['default'],
    );
    rows.push({
      key: 'slot',
      label: getDefaultSlotLabel(schema),
      recommendedValue,
      editedValue,
      changed: recommendedValue !== editedValue,
    });
  }

  for (const prop of listEditableProps(schema)) {
    const recommendedValue = formatDiffValue(recommendedMapping.mappedProps[prop.name]);
    const editedValue = formatDiffValue(
      editedMapping.mappedProps?.[prop.name] ?? recommendedMapping.mappedProps[prop.name],
    );
    rows.push({
      key: prop.name,
      label: humanizeLabel(prop.name),
      recommendedValue,
      editedValue,
      changed: recommendedValue !== editedValue,
    });
  }

  const recommendedConfidence = recommendedMapping.confidence;
  const editedConfidence = editedMapping.confidence ?? recommendedMapping.confidence;
  rows.push({
    key: 'confidence',
    label: 'Confidence',
    recommendedValue: recommendedConfidence,
    editedValue: editedConfidence,
    changed: recommendedConfidence !== editedConfidence,
  });

  const recommendedRationale = recommendedMapping.rationale;
  const editedRationale = editedMapping.rationale ?? recommendedMapping.rationale;
  rows.push({
    key: 'rationale',
    label: 'Rationale',
    recommendedValue: recommendedRationale,
    editedValue: editedRationale,
    changed: recommendedRationale !== editedRationale,
  });

  return rows;
}

function formatDiffValue(value: JsonValue | undefined): string {
  if (value === undefined) {
    return 'Not set';
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (value === null) {
    return 'null';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
}

/** Turn a camelCase prop name into a human label (e.g. `helpText` → `Help Text`). */
function humanizeLabel(name: string): string {
  const spaced = name.replace(/([a-z0-9])([A-Z])/g, '$1 $2');

  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
