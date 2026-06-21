import {
  coerceEnumValue,
  getComponentSchema,
  hasDefaultSlot,
  type ShoelaceComponentSchema,
  type ShoelaceProp,
} from '@designrail/schema';
import {
  componentMappingSchema,
  FIXTURE_TIMESTAMP,
  type ComponentIntent,
  type ComponentMapping,
  type JsonValue,
  type MappingConfidence,
  type Metadata,
  type TokenReference,
} from '@designrail/shared';

export const TOOL_NAME = '@designrail/component-mapper';
export const TOOL_VERSION = '0.2.0';

const SLOT_SOURCE_KEYS = ['label', 'text', 'content'] as const;

export interface MapComponentInput {
  intent: ComponentIntent;
}

interface MappingGaps {
  enumGaps: string[];
  variantGaps: string[];
  tokenGaps: string[];
  unmappedProps: string[];
}

export function mapComponent({ intent }: MapComponentInput): ComponentMapping {
  const schema = getComponentSchema(intent.componentType);

  if (schema === null) {
    throw new Error(`No Shoelace schema registered for component type "${intent.componentType}".`);
  }

  const consumedIntentKeys = new Set<string>();
  const enumGaps: string[] = [];
  const mappedProps: Metadata = {};

  for (const prop of schema.props) {
    const resolved = resolveIntentValue(prop, intent.props, consumedIntentKeys);

    if (resolved !== undefined) {
      const value = coercePropValue(prop, resolved, enumGaps);

      if (value !== undefined) {
        mappedProps[prop.name] = value;
        continue;
      }
    }

    if (prop.default !== undefined) {
      mappedProps[prop.name] = prop.default;
    }
  }

  const mappedSlots = resolveSlots(schema, intent, consumedIntentKeys);
  const mappedTokens = resolveTokens(intent.tokenRefs);
  const gaps: MappingGaps = {
    enumGaps,
    variantGaps: resolveVariantGaps(schema, intent.variants),
    tokenGaps: intent.tokenRefs.filter((token) => token.target === undefined).map((t) => t.name),
    unmappedProps: Object.keys(intent.props).filter((key) => !consumedIntentKeys.has(key)),
  };

  return componentMappingSchema.parse({
    id: deriveMappingId(intent.id),
    intentId: intent.id,
    targetLibrary: 'SHOELACE',
    targetComponent: schema.tag,
    mappedProps,
    mappedEvents: resolveEvents(schema),
    mappedSlots,
    mappedTokens,
    confidence: resolveConfidence(gaps),
    rationale: buildRationale(schema, mappedProps, mappedSlots),
    fallbackNotes: buildFallbackNotes(gaps),
    createdAt: FIXTURE_TIMESTAMP,
  });
}

function resolveIntentValue(
  prop: ShoelaceProp,
  props: Metadata,
  consumed: Set<string>,
): JsonValue | undefined {
  for (const key of prop.intentKeys) {
    const value = props[key];

    if (value !== undefined) {
      consumed.add(key);
      return value;
    }
  }

  return undefined;
}

function coercePropValue(
  prop: ShoelaceProp,
  value: JsonValue,
  enumGaps: string[],
): JsonValue | undefined {
  switch (prop.kind) {
    case 'enum': {
      const coerced = coerceEnumValue(prop, String(value));

      if (coerced === null) {
        enumGaps.push(`${prop.name}=${String(value)}`);
        return undefined;
      }

      return coerced;
    }
    case 'boolean':
      return typeof value === 'boolean' ? value : String(value) === 'true';
    case 'number': {
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : undefined;
    }
    default:
      return String(value);
  }
}

function resolveSlots(
  schema: ShoelaceComponentSchema,
  intent: ComponentIntent,
  consumed: Set<string>,
): Metadata {
  if (!hasDefaultSlot(schema)) {
    return {};
  }

  for (const key of SLOT_SOURCE_KEYS) {
    const value = intent.props[key];

    if (typeof value === 'string' && value.length > 0) {
      consumed.add(key);
      return { default: value };
    }
  }

  return { default: intent.accessibility.label ?? intent.componentName };
}

function resolveTokens(tokenRefs: TokenReference[]): TokenReference[] {
  return tokenRefs
    .filter((token) => token.target !== undefined)
    .map((token) => ({ name: token.name, target: token.target as string }));
}

function resolveEvents(schema: ShoelaceComponentSchema): Metadata {
  const events: Metadata = {};

  for (const event of schema.events) {
    events[event.designEvent] = event.shoelaceEvent ?? event.designEvent;
  }

  return events;
}

function resolveVariantGaps(schema: ShoelaceComponentSchema, variants: string[]): string[] {
  const variantProp = schema.props.find((prop) => prop.name === 'variant');

  if (variantProp === undefined) {
    return [];
  }

  return variants.filter((variant) => coerceEnumValue(variantProp, variant) === null);
}

function resolveConfidence(gaps: MappingGaps): MappingConfidence {
  if (gaps.enumGaps.length > 0) {
    return 'LOW';
  }

  if (gaps.variantGaps.length > 0 || gaps.tokenGaps.length > 0 || gaps.unmappedProps.length > 0) {
    return 'MEDIUM';
  }

  return 'HIGH';
}

function buildRationale(
  schema: ShoelaceComponentSchema,
  mappedProps: Metadata,
  mappedSlots: Metadata,
): string {
  const propList = Object.entries(mappedProps)
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(', ');
  const base = `Design intent maps to Shoelace ${schema.tag}: ${propList === '' ? 'no props' : propList}.`;
  const slotText = mappedSlots['default'];

  return typeof slotText === 'string' ? `${base} Default slot text "${slotText}".` : base;
}

function buildFallbackNotes(gaps: MappingGaps): string {
  const notes: string[] = [];

  if (gaps.enumGaps.length > 0) {
    notes.push(`Values outside the Shoelace schema: ${gaps.enumGaps.join(', ')}.`);
  }

  if (gaps.variantGaps.length > 0) {
    notes.push(
      `Unsupported design variants: ${gaps.variantGaps.join(', ')}. Choose a supported Shoelace variant.`,
    );
  }

  if (gaps.tokenGaps.length > 0) {
    notes.push(
      `Unmapped design tokens without a Shoelace target: ${gaps.tokenGaps.join(', ')}. Alias them before relying on themed values.`,
    );
  }

  if (gaps.unmappedProps.length > 0) {
    notes.push(`Design props without a Shoelace mapping: ${gaps.unmappedProps.join(', ')}.`);
  }

  return notes.length === 0
    ? 'All design intent resolved cleanly; adjust Shoelace token aliases if brand values diverge.'
    : notes.join(' ');
}

function deriveMappingId(intentId: string): string {
  const slug = intentId.replace(/^intent\./, '');

  return `mapping.${slug}.shoelace`;
}
