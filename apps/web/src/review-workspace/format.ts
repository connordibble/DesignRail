import type { JsonValue } from '@designrail/shared';

export function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

/** Turn a camelCase prop name into a human label (e.g. `helpText` → `Help Text`). */
export function humanizeLabel(name: string): string {
  const spaced = name.replace(/([a-z0-9])([A-Z])/g, '$1 $2');

  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function formatMappedValue(value: JsonValue): string {
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (value === null) {
    return 'null';
  }

  if (typeof value === 'object') {
    return formatJson(value);
  }

  return String(value);
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Request failed.';
}
