import { isSupportedComponentType } from '@designrail/schema/supported-component-types';
import type { MockFigmaFixture } from '@designrail/shared';

/**
 * Plain-data snapshot of a Figma node, built on the plugin main thread.
 * The serializer is a pure function of this shape so it can be unit-tested
 * against the shared fixture schema without the Figma runtime.
 */
export interface FigmaTokenSnapshot {
  name: string;
  value?: string;
  target?: string;
}

export interface FigmaNodeSnapshot {
  id: string;
  /** Canonical component or component-set name used for mapping. */
  name: string;
  /** Selected node name retained in provenance when it differs from the canonical name. */
  nodeName?: string;
  type: 'COMPONENT' | 'COMPONENT_SET' | 'INSTANCE';
  description?: string;
  fileKey?: string;
  /** Variant property name → declared values (component sets). */
  variantGroups?: Record<string, string[]>;
  /** Resolved property values on the selected node (variant + component properties). */
  properties?: Record<string, string | number | boolean>;
  /** Characters of the first TEXT descendant, when one exists. */
  primaryText?: string;
  /** Best-effort bound-variable references collected by the main thread. */
  tokens?: FigmaTokenSnapshot[];
}

export interface SerializedFixture {
  /** Suggested file name under examples/ (figma-input.<component>.<qualifier>.json). */
  fileName: string;
  fixture: MockFigmaFixture;
  /** Whether the current component type has a registered deterministic mapping. */
  canExport: boolean;
  /** Human-readable notes about fallbacks taken during extraction. */
  warnings: string[];
}

const FIXTURE_SCHEMA_URL = 'https://designrail.local/figma-input.schema.json';
const FIXTURE_VERSION = '0.2.0';

const VARIANT_GROUP_PATTERN = /^(variant|appearance|style|type)s?$/i;
const STATE_GROUP_PATTERN = /^(state|interaction)s?$/i;

/** Roles the pipeline can safely assume from a component type; anything else stays unset. */
const ROLE_BY_COMPONENT: Record<string, string> = {
  button: 'button',
  input: 'textbox',
  textfield: 'textbox',
  checkbox: 'checkbox',
  radio: 'radio',
  switch: 'switch',
  dialog: 'dialog',
  alert: 'alert',
};

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function stableSourceHash(value: string): string {
  let hash = 2_166_136_261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}

function pascalCase(value: string): string {
  return value
    .split(/[^a-zA-Z0-9]+/)
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function camelCase(value: string): string {
  const pascal = pascalCase(value);

  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/** Strip Figma's internal `Name#node:id` suffix from component property keys. */
function cleanPropertyKey(key: string): string {
  return camelCase(key.replace(/#.*$/, '').trim());
}

function pickGroup(
  groups: Record<string, string[]>,
  pattern: RegExp,
): { key: string; values: string[] } | null {
  for (const [key, values] of Object.entries(groups)) {
    if (pattern.test(key.trim())) {
      return { key, values };
    }
  }

  return null;
}

/**
 * Serialize a node snapshot into a DesignRail fixture. Total by construction:
 * every input produces a schema-valid fixture plus warnings for any fallback
 * taken, so reviewers can see what the extraction was unsure about.
 */
export function serializeFixture(snapshot: FigmaNodeSnapshot): SerializedFixture {
  const warnings: string[] = [];
  const segments = snapshot.name
    .split('/')
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
  const baseName = segments[0] ?? snapshot.name.trim();

  const componentType = pascalCase(baseName) || 'Component';
  const componentSlug = slugify(baseName) || 'component';
  const displayName = segments.length > 0 ? segments.join(' ') : snapshot.name.trim();
  const fileKey = snapshot.fileKey?.trim();
  const sourceNodeSlug = slugify(snapshot.id) || 'figma-node';
  const sourceSlug = `${sourceNodeSlug}-${stableSourceHash(`${fileKey ?? 'local-file'}:${snapshot.id}`)}`;

  const groups = snapshot.variantGroups ?? {};
  const properties = snapshot.properties ?? {};

  const variantGroup = pickGroup(groups, VARIANT_GROUP_PATTERN);
  const stateGroup = pickGroup(groups, STATE_GROUP_PATTERN);
  const fallbackGroup = Object.entries(groups).find(
    ([key]) => key !== variantGroup?.key && key !== stateGroup?.key,
  );

  let variants: string[] = [];
  if (variantGroup !== null) {
    variants = variantGroup.values.map((value) => value.toLowerCase());
  } else if (fallbackGroup !== undefined) {
    variants = fallbackGroup[1].map((value) => value.toLowerCase());
    warnings.push(
      `No variant group named variant/appearance/style/type; used "${fallbackGroup[0]}" instead.`,
    );
  }

  const states = stateGroup === null ? [] : stateGroup.values.map((value) => value.toLowerCase());

  // Qualifier for ids and the file name: the node's sub-name, else the resolved
  // variant value, else a stable fallback.
  const restSlug = slugify(segments.slice(1).join(' '));
  const variantValue = variantGroup !== null ? properties[variantGroup.key] : fallbackGroup?.[1][0];
  const qualifier =
    restSlug || slugify(typeof variantValue === 'string' ? variantValue : '') || 'export';
  const fixtureQualifier = `${qualifier}.${sourceSlug}`;

  if (fileKey === undefined || fileKey.length === 0) {
    warnings.push(
      'Figma file key unavailable; identifiers use a local-file fallback and should be reviewed before combining exports from multiple local files.',
    );
  }

  const canExport = isSupportedComponentType(componentType);
  if (!canExport) {
    warnings.push(
      `No Shoelace mapping is registered for component type "${componentType}"; export is disabled until the schema is extended or the component name is corrected.`,
    );
  }

  // Component properties become intent props; variant axes are represented by
  // variants/states above, so their keys are excluded here.
  const axisKeys = new Set(Object.keys(groups).map((key) => key.trim().toLowerCase()));
  const props: Record<string, string | number | boolean> = {};
  for (const [rawKey, value] of Object.entries(properties)) {
    const bareKey = rawKey.replace(/#.*$/, '').trim().toLowerCase();
    if (axisKeys.has(bareKey)) {
      continue;
    }

    props[cleanPropertyKey(rawKey)] = value;
  }

  const primaryText = snapshot.primaryText?.trim() ?? '';
  if (primaryText.length > 0 && props['label'] === undefined && props['text'] === undefined) {
    props['label'] = primaryText;
  }

  const tokens = (snapshot.tokens ?? [])
    .filter((token) => token.name.trim().length > 0)
    .map((token) => ({
      name: token.name.trim(),
      ...(token.value !== undefined && token.value.trim().length > 0
        ? { value: token.value.trim() }
        : {}),
      ...(token.target !== undefined && token.target.trim().length > 0
        ? { target: token.target.trim() }
        : {}),
    }));
  if (tokens.length === 0) {
    warnings.push(
      'No bound variables found on the selected node; tokens were left empty for the reviewer.',
    );
  }

  const accessibleLabel = primaryText.length > 0 ? primaryText : displayName;
  if (primaryText.length === 0) {
    warnings.push('No text layer found; the accessible label fell back to the node name.');
  }

  const role = ROLE_BY_COMPONENT[componentSlug];

  const description = snapshot.description?.trim() ?? '';
  const summary =
    description.length > 0
      ? description
      : `${displayName} exported from Figma via the DesignRail plugin.`;

  const fixture: MockFigmaFixture = {
    $schema: FIXTURE_SCHEMA_URL,
    version: FIXTURE_VERSION,
    figma: {
      nodeId: snapshot.id,
      nodeName: snapshot.nodeName?.trim() || snapshot.name,
      ...(fileKey === undefined || fileKey.length === 0 ? {} : { fileKey }),
    },
    exampleId: `example.${componentSlug}.${fixtureQualifier}`,
    intentId: `intent.${componentSlug}.${fixtureQualifier}`,
    component: componentSlug,
    componentType,
    name: displayName,
    summary,
    props,
    variants,
    states,
    tokens,
    accessibility: {
      label: accessibleLabel,
      ...(role === undefined ? {} : { role }),
      required: false,
    },
  };

  return {
    fileName: `figma-input.${componentSlug}.${fixtureQualifier}.json`,
    fixture,
    canExport,
    warnings,
  };
}
