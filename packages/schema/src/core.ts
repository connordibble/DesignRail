import { z } from 'zod';

export const PACKAGE_NAME = '@designrail/schema';

/**
 * Shoelace release these schemas describe. Recorded for auditability — Shoelace 2.x is in
 * maintenance ("sunset") as of 2.20.1, so mappings should be traceable to a known version.
 */
export const SHOELACE_LIBRARY_VERSION = 'shoelace@2.20.1';

export const shoelacePropKindSchema = z.enum(['enum', 'boolean', 'string', 'number']);

export const shoelacePropSchema = z.object({
  /** The Shoelace property name (camelCase). */
  name: z.string().min(1),
  /** The HTML attribute used in static markup (kebab-case where it differs, e.g. `help-text`). */
  htmlAttribute: z.string().min(1),
  /** The React wrapper prop name (camelCase, e.g. `helpText`). */
  reactProp: z.string().min(1),
  kind: shoelacePropKindSchema,
  /** Allowed values for `enum` props. */
  values: z.array(z.string().min(1)).optional(),
  /** Default value Shoelace applies when the prop is omitted. */
  default: z.union([z.string(), z.number(), z.boolean()]).optional(),
  /** Whether reviewers may edit this prop in the review UI. */
  editable: z.boolean(),
  /** Design-intent property names that resolve to this prop, in priority order. */
  intentKeys: z.array(z.string().min(1)),
});

export const shoelaceSlotSchema = z.object({
  /** Slot name; `default` denotes the unnamed text slot. */
  name: z.string().min(1),
  description: z.string().min(1),
});

export const shoelaceEventKindSchema = z.enum(['native', 'custom']);

export const shoelaceEventSchema = z.object({
  /** Design-intent event name (e.g. `click`, `input`). */
  designEvent: z.string().min(1),
  /** `native` DOM events vs Shoelace `custom` events. */
  kind: shoelaceEventKindSchema,
  /** The emitted event name (`sl-input`); omitted for native events whose name equals `designEvent`. */
  shoelaceEvent: z.string().min(1).optional(),
  /** The React wrapper handler prop (e.g. `onClick`, `onSlInput`). */
  reactHandler: z.string().min(1),
});

export const shoelaceComponentSchemaSchema = z.object({
  /** Intent `componentType` this schema maps from (e.g. `Button`). */
  componentType: z.string().min(1),
  /** Shoelace custom-element tag (e.g. `sl-button`). */
  tag: z.string().min(1),
  libraryVersion: z.string().min(1),
  sourceUrl: z.string().url(),
  props: z.array(shoelacePropSchema),
  slots: z.array(shoelaceSlotSchema),
  events: z.array(shoelaceEventSchema),
  parts: z.array(z.string().min(1)),
  /** Whether this component must carry an accessible name (interactive controls) vs a container. */
  requiresAccessibleName: z.boolean(),
});

export type ShoelacePropKind = z.infer<typeof shoelacePropKindSchema>;
export type ShoelaceProp = z.infer<typeof shoelacePropSchema>;
export type ShoelaceSlot = z.infer<typeof shoelaceSlotSchema>;
export type ShoelaceEvent = z.infer<typeof shoelaceEventSchema>;
export type ShoelaceComponentSchema = z.infer<typeof shoelaceComponentSchemaSchema>;

export const DEFAULT_SLOT_NAME = 'default';

export interface DefinePropInput {
  name: string;
  kind: ShoelacePropKind;
  values?: string[];
  default?: string | number | boolean;
  editable?: boolean;
  htmlAttribute?: string;
  reactProp?: string;
  intentKeys?: string[];
}

/** Build a validated {@link ShoelaceProp}; export names and intent keys default to the prop name. */
export function defineProp(input: DefinePropInput): ShoelaceProp {
  return shoelacePropSchema.parse({
    name: input.name,
    htmlAttribute: input.htmlAttribute ?? input.name,
    reactProp: input.reactProp ?? input.name,
    kind: input.kind,
    ...(input.values === undefined ? {} : { values: input.values }),
    ...(input.default === undefined ? {} : { default: input.default }),
    editable: input.editable ?? true,
    intentKeys: input.intentKeys ?? [input.name],
  });
}

export interface DefineComponentSchemaInput {
  componentType: string;
  tag: string;
  sourceUrl: string;
  props: ShoelaceProp[];
  slots: ShoelaceSlot[];
  events: Array<{
    designEvent: string;
    kind: ShoelaceEventKind;
    shoelaceEvent?: string;
    reactHandler: string;
  }>;
  parts: string[];
  libraryVersion?: string;
  /** Defaults to `true`; set `false` for container components that need no accessible name. */
  requiresAccessibleName?: boolean;
}

export type ShoelaceEventKind = z.infer<typeof shoelaceEventKindSchema>;

/** Build a validated {@link ShoelaceComponentSchema}; `libraryVersion` defaults to {@link SHOELACE_LIBRARY_VERSION}. */
export function defineComponentSchema(input: DefineComponentSchemaInput): ShoelaceComponentSchema {
  return shoelaceComponentSchemaSchema.parse({
    componentType: input.componentType,
    tag: input.tag,
    libraryVersion: input.libraryVersion ?? SHOELACE_LIBRARY_VERSION,
    sourceUrl: input.sourceUrl,
    props: input.props,
    slots: input.slots,
    events: input.events.map((event) =>
      shoelaceEventSchema.parse(
        event.shoelaceEvent === undefined
          ? event
          : { ...event, shoelaceEvent: event.shoelaceEvent },
      ),
    ),
    parts: input.parts,
    requiresAccessibleName: input.requiresAccessibleName ?? true,
  });
}

export function listEditableProps(schema: ShoelaceComponentSchema): ShoelaceProp[] {
  return schema.props.filter((prop) => prop.editable);
}

export function getProp(schema: ShoelaceComponentSchema, name: string): ShoelaceProp | null {
  return schema.props.find((prop) => prop.name === name) ?? null;
}

export function hasDefaultSlot(schema: ShoelaceComponentSchema): boolean {
  return schema.slots.some((slot) => slot.name === DEFAULT_SLOT_NAME);
}

/** Return `value` (case-insensitively matched to a canonical enum value) when valid, else `null`. */
export function coerceEnumValue(prop: ShoelaceProp, value: string): string | null {
  if (prop.kind !== 'enum' || prop.values === undefined) {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  return prop.values.find((allowed) => allowed.toLowerCase() === normalized) ?? null;
}
