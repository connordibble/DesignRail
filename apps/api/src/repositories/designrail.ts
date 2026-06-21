import { randomUUID } from 'node:crypto';

import {
  coerceEnumValue,
  getComponentSchemaByTag,
  hasDefaultSlot,
  type ShoelaceComponentSchema,
  type ShoelaceProp,
} from '@designrail/schema';
import {
  EXAMPLE_REGISTRY,
  componentIntentSchema,
  componentMappingSchema,
  complianceFindingSchema,
  dashboardMetricsSchema,
  exampleSchema,
  exportResultSchema,
  instrumentationEventSchema,
  isExportableStatus,
  mappingEditSchema,
  reviewDecisionSchema,
  type ComponentIntent,
  type ComponentMapping,
  type ComplianceFinding,
  type DashboardMetrics,
  type Example,
  type ExportFormat,
  type ExportResult,
  type InstrumentationEntityType,
  type InstrumentationEvent,
  type JsonValue,
  type MappingEdit,
  type Metadata,
  type ReviewDecision,
  type ReviewDecisionStatus,
} from '@designrail/shared';
import { count, desc, eq, inArray, sql } from 'drizzle-orm';

import {
  componentIntents,
  componentMappings,
  complianceFindings,
  examples,
  exports,
  instrumentationEvents,
  reviewDecisions,
  type DatabaseClient,
} from '../db/index.js';

import { renderExportContent } from './export-renderer.js';

const DEFAULT_LIST_LIMIT = 50;
const MAX_LIST_LIMIT = 200;

export interface PaginationInput {
  limit?: number;
}

export interface SaveReviewDecisionInput {
  id?: string;
  mappingId: string;
  status: ReviewDecisionStatus;
  reviewerLabel: string;
  editedMapping?: MappingEdit;
  notes?: string;
  createdAt?: string;
}

export interface RecordInstrumentationEventInput {
  id?: string;
  name: string;
  entityType: InstrumentationEntityType;
  entityId: string;
  timestamp?: string;
  metadata?: Metadata;
}

export interface CreateExportInput {
  id?: string;
  mappingId: string;
  format: ExportFormat;
  createdAt?: string;
}

export interface ReviewWorkspace {
  example: Example;
  intent: ComponentIntent | null;
  mapping: ComponentMapping | null;
  complianceFindings: ComplianceFinding[];
  latestDecision: ReviewDecision | null;
  exports: ExportResult[];
}

export type CreateExportOutcome =
  | {
      ok: true;
      exportResult: ExportResult;
    }
  | {
      ok: false;
      code: 'MAPPING_NOT_EXPORTABLE';
      message: string;
    };

function nowIso(): string {
  return new Date().toISOString();
}

function createId(prefix: string): string {
  return `${prefix}.${randomUUID()}`;
}

function normalizeLimit(limit: number | undefined, fallback = DEFAULT_LIST_LIMIT): number {
  if (limit === undefined) {
    return fallback;
  }

  if (!Number.isInteger(limit) || limit < 1) {
    return fallback;
  }

  return Math.min(limit, MAX_LIST_LIMIT);
}

function parseJsonText(value: string): unknown {
  return JSON.parse(value) as unknown;
}

function stringifyJson(value: unknown): string {
  const serialized = JSON.stringify(value);

  if (serialized === undefined) {
    throw new Error('Value is not JSON serializable.');
  }

  return serialized;
}

function toComponentIntent(row: typeof componentIntents.$inferSelect): ComponentIntent {
  return componentIntentSchema.parse({
    id: row.id,
    exampleId: row.exampleId,
    source: row.source,
    sourceRefs: parseJsonText(row.sourceRefsJson),
    componentName: row.componentName,
    componentType: row.componentType,
    summary: row.summary,
    props: parseJsonText(row.propsJson),
    variants: parseJsonText(row.variantsJson),
    states: parseJsonText(row.statesJson),
    tokenRefs: parseJsonText(row.tokenRefsJson),
    accessibility: parseJsonText(row.accessibilityJson),
    createdAt: row.createdAt,
  });
}

function toComponentMapping(row: typeof componentMappings.$inferSelect): ComponentMapping {
  const mapping = {
    id: row.id,
    intentId: row.intentId,
    targetLibrary: row.targetLibrary,
    targetComponent: row.targetComponent,
    mappedProps: parseJsonText(row.mappedPropsJson),
    mappedEvents: parseJsonText(row.mappedEventsJson),
    mappedSlots: parseJsonText(row.mappedSlotsJson),
    mappedTokens: parseJsonText(row.mappedTokensJson),
    confidence: row.confidence,
    rationale: row.rationale,
    createdAt: row.createdAt,
  };

  return componentMappingSchema.parse(
    row.fallbackNotes === null ? mapping : { ...mapping, fallbackNotes: row.fallbackNotes },
  );
}

function toComplianceFinding(row: typeof complianceFindings.$inferSelect): ComplianceFinding {
  const finding = {
    id: row.id,
    mappingId: row.mappingId,
    category: row.category,
    severity: row.severity,
    message: row.message,
    remediation: row.remediation,
    blocking: row.blocking,
    createdAt: row.createdAt,
  };

  return complianceFindingSchema.parse(
    row.path === null ? finding : { ...finding, path: row.path },
  );
}

function toReviewDecision(row: typeof reviewDecisions.$inferSelect): ReviewDecision {
  const decision = {
    id: row.id,
    mappingId: row.mappingId,
    status: row.status,
    reviewerLabel: row.reviewerLabel,
    createdAt: row.createdAt,
  };

  return reviewDecisionSchema.parse({
    ...decision,
    ...(row.editedMappingJson === null
      ? {}
      : { editedMapping: parseJsonText(row.editedMappingJson) }),
    ...(row.notes === null ? {} : { notes: row.notes }),
  });
}

function toExportResult(row: typeof exports.$inferSelect): ExportResult {
  return exportResultSchema.parse(row);
}

function upsertExample(client: DatabaseClient, example: Example): void {
  const parsed = exampleSchema.parse(example);
  const { id: _id, ...rest } = parsed;

  client.db
    .insert(examples)
    .values(parsed)
    .onConflictDoUpdate({ target: examples.id, set: rest })
    .run();
}

function upsertComponentIntent(client: DatabaseClient, intent: ComponentIntent): void {
  const parsed = componentIntentSchema.parse(intent);
  const values = {
    id: parsed.id,
    exampleId: parsed.exampleId,
    source: parsed.source,
    sourceRefsJson: stringifyJson(parsed.sourceRefs),
    componentName: parsed.componentName,
    componentType: parsed.componentType,
    summary: parsed.summary,
    propsJson: stringifyJson(parsed.props),
    variantsJson: stringifyJson(parsed.variants),
    statesJson: stringifyJson(parsed.states),
    tokenRefsJson: stringifyJson(parsed.tokenRefs),
    accessibilityJson: stringifyJson(parsed.accessibility),
    createdAt: parsed.createdAt,
  };
  const { id: _id, ...rest } = values;

  client.db
    .insert(componentIntents)
    .values(values)
    .onConflictDoUpdate({ target: componentIntents.id, set: rest })
    .run();
}

function upsertComponentMapping(client: DatabaseClient, mapping: ComponentMapping): void {
  const parsed = componentMappingSchema.parse(mapping);

  // If a seed-owned mapping's content changed, the prior review no longer applies to it. Reopen it
  // by clearing its decisions and exports so it returns to pending for re-review.
  const existing = getMappingById(client, parsed.id);
  if (existing !== null && !mappingContentEquals(existing, parsed)) {
    client.db.delete(exports).where(eq(exports.mappingId, parsed.id)).run();
    client.db.delete(reviewDecisions).where(eq(reviewDecisions.mappingId, parsed.id)).run();
  }

  const values = {
    id: parsed.id,
    intentId: parsed.intentId,
    targetLibrary: parsed.targetLibrary,
    targetComponent: parsed.targetComponent,
    mappedPropsJson: stringifyJson(parsed.mappedProps),
    mappedEventsJson: stringifyJson(parsed.mappedEvents),
    mappedSlotsJson: stringifyJson(parsed.mappedSlots),
    mappedTokensJson: stringifyJson(parsed.mappedTokens),
    confidence: parsed.confidence,
    rationale: parsed.rationale,
    fallbackNotes: parsed.fallbackNotes ?? null,
    createdAt: parsed.createdAt,
  };
  const { id: _id, ...rest } = values;

  client.db
    .insert(componentMappings)
    .values(values)
    .onConflictDoUpdate({ target: componentMappings.id, set: rest })
    .run();
}

function mappingContentEquals(a: ComponentMapping, b: ComponentMapping): boolean {
  return (
    a.targetLibrary === b.targetLibrary &&
    a.targetComponent === b.targetComponent &&
    a.confidence === b.confidence &&
    a.rationale === b.rationale &&
    (a.fallbackNotes ?? null) === (b.fallbackNotes ?? null) &&
    stringifyJson(a.mappedProps) === stringifyJson(b.mappedProps) &&
    stringifyJson(a.mappedEvents) === stringifyJson(b.mappedEvents) &&
    stringifyJson(a.mappedSlots) === stringifyJson(b.mappedSlots) &&
    stringifyJson(a.mappedTokens) === stringifyJson(b.mappedTokens)
  );
}

/** Replace the seed-owned findings for a mapping; findings have no dependents, so this is safe. */
function reseedComplianceFindings(
  client: DatabaseClient,
  mappingId: string,
  findings: ComplianceFinding[],
): void {
  client.db.delete(complianceFindings).where(eq(complianceFindings.mappingId, mappingId)).run();

  for (const finding of findings) {
    const parsed = complianceFindingSchema.parse(finding);

    client.db
      .insert(complianceFindings)
      .values({
        id: parsed.id,
        mappingId: parsed.mappingId,
        category: parsed.category,
        severity: parsed.severity,
        message: parsed.message,
        remediation: parsed.remediation,
        path: parsed.path ?? null,
        blocking: parsed.blocking,
        createdAt: parsed.createdAt,
      })
      .run();
  }
}

/**
 * Seed the canonical, pipeline-verified examples. Seed-owned rows are upserted (and findings
 * replaced) so re-seeding a local database refreshes mappings without stranding stale C1 rows,
 * while review decisions, exports, and instrumentation events are never touched.
 */
export function seedDesignRailData(client: DatabaseClient): void {
  for (const entry of EXAMPLE_REGISTRY) {
    upsertExample(client, entry.example);
    upsertComponentIntent(client, entry.intent);
    upsertComponentMapping(client, entry.mapping);
    reseedComplianceFindings(client, entry.mapping.id, entry.findings);
  }
}

export function listExamples(client: DatabaseClient, input: PaginationInput = {}): Example[] {
  return client.db
    .select()
    .from(examples)
    .orderBy(examples.name, examples.id)
    .limit(normalizeLimit(input.limit))
    .all()
    .map((row) => exampleSchema.parse(row));
}

function getExampleById(client: DatabaseClient, exampleId: string): Example | null {
  const row = client.db.select().from(examples).where(eq(examples.id, exampleId)).get();

  return row === undefined ? null : exampleSchema.parse(row);
}

export function getComponentIntentByExampleId(
  client: DatabaseClient,
  exampleId: string,
): ComponentIntent | null {
  const row = client.db
    .select()
    .from(componentIntents)
    .where(eq(componentIntents.exampleId, exampleId))
    .get();

  return row === undefined ? null : toComponentIntent(row);
}

export function getMappingByExampleId(
  client: DatabaseClient,
  exampleId: string,
): ComponentMapping | null {
  const intent = getComponentIntentByExampleId(client, exampleId);

  if (intent === null) {
    return null;
  }

  const row = client.db
    .select()
    .from(componentMappings)
    .where(eq(componentMappings.intentId, intent.id))
    .orderBy(desc(componentMappings.createdAt))
    .get();

  return row === undefined ? null : toComponentMapping(row);
}

function getMappingById(client: DatabaseClient, id: string): ComponentMapping | null {
  const row = client.db.select().from(componentMappings).where(eq(componentMappings.id, id)).get();

  return row === undefined ? null : toComponentMapping(row);
}

export function listComplianceFindingsByMappingId(
  client: DatabaseClient,
  mappingId: string,
  input: PaginationInput = {},
): ComplianceFinding[] {
  return (
    client.db
      .select()
      .from(complianceFindings)
      .where(eq(complianceFindings.mappingId, mappingId))
      // Most severe first (BLOCKER, WARNING, INFO), then by id for a stable order.
      .orderBy(
        sql`CASE ${complianceFindings.severity} WHEN 'BLOCKER' THEN 0 WHEN 'WARNING' THEN 1 ELSE 2 END`,
        complianceFindings.id,
      )
      .limit(normalizeLimit(input.limit))
      .all()
      .map(toComplianceFinding)
  );
}

export function listReviewDecisions(
  client: DatabaseClient,
  input: PaginationInput = {},
): ReviewDecision[] {
  return client.db
    .select()
    .from(reviewDecisions)
    .orderBy(desc(reviewDecisions.createdAt))
    .limit(normalizeLimit(input.limit, 100))
    .all()
    .map(toReviewDecision);
}

export function getLatestReviewDecisionByMappingId(
  client: DatabaseClient,
  mappingId: string,
): ReviewDecision | null {
  const row = client.db
    .select()
    .from(reviewDecisions)
    .where(eq(reviewDecisions.mappingId, mappingId))
    .orderBy(desc(reviewDecisions.createdAt), desc(reviewDecisions.id))
    .limit(1)
    .get();

  return row === undefined ? null : toReviewDecision(row);
}

export function saveReviewDecision(
  client: DatabaseClient,
  input: SaveReviewDecisionInput,
): ReviewDecision {
  let editedMapping = input.editedMapping;

  // An edited mapping must validate against the target component's Shoelace schema before it is
  // persisted, so a GraphQL caller cannot store (and later export) invalid props or enum values.
  if (input.status === 'EDITED' && editedMapping !== undefined) {
    const mapping = getMappingById(client, input.mappingId);

    if (mapping === null) {
      throw new Error(`Cannot edit unknown mapping ${input.mappingId}.`);
    }

    const schema = getComponentSchemaByTag(mapping.targetComponent);

    if (schema !== null) {
      editedMapping = coerceEditedMapping(schema, editedMapping);
    }
  }

  const decision = reviewDecisionSchema.parse({
    id: input.id ?? createId('decision'),
    mappingId: input.mappingId,
    status: input.status,
    reviewerLabel: input.reviewerLabel,
    ...(editedMapping === undefined ? {} : { editedMapping }),
    ...(input.notes === undefined ? {} : { notes: input.notes }),
    createdAt: input.createdAt ?? nowIso(),
  });

  client.db
    .insert(reviewDecisions)
    .values({
      id: decision.id,
      mappingId: decision.mappingId,
      status: decision.status,
      reviewerLabel: decision.reviewerLabel,
      editedMappingJson:
        decision.editedMapping === undefined ? null : stringifyJson(decision.editedMapping),
      notes: decision.notes ?? null,
      createdAt: decision.createdAt,
    })
    .run();

  return decision;
}

export function recordInstrumentationEvent(
  client: DatabaseClient,
  input: RecordInstrumentationEventInput,
): InstrumentationEvent {
  const event = instrumentationEventSchema.parse({
    id: input.id ?? createId('event'),
    name: input.name,
    entityType: input.entityType,
    entityId: input.entityId,
    timestamp: input.timestamp ?? nowIso(),
    metadata: input.metadata ?? {},
  });

  client.db
    .insert(instrumentationEvents)
    .values({
      id: event.id,
      name: event.name,
      entityType: event.entityType,
      entityId: event.entityId,
      timestamp: event.timestamp,
      metadataJson: stringifyJson(event.metadata),
    })
    .run();

  return event;
}

export function createExport(
  client: DatabaseClient,
  input: CreateExportInput,
): CreateExportOutcome {
  const latestDecision = getLatestReviewDecisionByMappingId(client, input.mappingId);

  if (latestDecision === null || !isExportableStatus(latestDecision.status)) {
    return {
      ok: false,
      code: 'MAPPING_NOT_EXPORTABLE',
      message: 'Only accepted or edited mappings can be exported.',
    };
  }

  const mapping = getMappingById(client, input.mappingId);

  if (mapping === null) {
    return {
      ok: false,
      code: 'MAPPING_NOT_EXPORTABLE',
      message: 'Cannot export a mapping that does not exist.',
    };
  }

  const effectiveMapping =
    latestDecision.status === 'EDITED' && latestDecision.editedMapping !== undefined
      ? applyMappingEdit(mapping, latestDecision.editedMapping)
      : mapping;

  let content: string;

  try {
    content = renderExportContent(effectiveMapping, input.format);
  } catch (error) {
    return {
      ok: false,
      code: 'MAPPING_NOT_EXPORTABLE',
      message: error instanceof Error ? error.message : 'Mapping cannot be exported.',
    };
  }

  const exportResult = exportResultSchema.parse({
    id: input.id ?? createId('export'),
    mappingId: input.mappingId,
    format: input.format,
    content,
    createdAt: input.createdAt ?? nowIso(),
  });

  client.db.insert(exports).values(exportResult).run();

  return {
    ok: true,
    exportResult,
  };
}

export function listExportsByMappingId(
  client: DatabaseClient,
  mappingId: string,
  input: PaginationInput = {},
): ExportResult[] {
  return client.db
    .select()
    .from(exports)
    .where(eq(exports.mappingId, mappingId))
    .orderBy(desc(exports.createdAt), desc(exports.id))
    .limit(normalizeLimit(input.limit, 100))
    .all()
    .map(toExportResult);
}

export function getDashboardMetrics(client: DatabaseClient): DashboardMetrics {
  const latestStatuses = getLatestDecisionStatuses(client);
  const totalMappings =
    client.db.select({ total: count() }).from(componentMappings).get()?.total ?? 0;
  const exportCount = client.db.select({ total: count() }).from(exports).get()?.total ?? 0;
  const warnings = client.db
    .select({
      message: complianceFindings.message,
      total: count(),
    })
    .from(complianceFindings)
    .where(inArray(complianceFindings.severity, ['WARNING', 'BLOCKER']))
    .groupBy(complianceFindings.message)
    .all();

  const acceptedMappings = latestStatuses.get('ACCEPTED') ?? 0;
  const rejectedMappings = latestStatuses.get('REJECTED') ?? 0;
  const editedMappings = latestStatuses.get('EDITED') ?? 0;
  const explicitlyPending = latestStatuses.get('PENDING') ?? 0;
  // A mapping is pending when it has no decision yet (matching the UI's PENDING default) or its
  // latest decision is PENDING.
  const decidedMappings = acceptedMappings + rejectedMappings + editedMappings + explicitlyPending;
  const undecidedMappings = Math.max(totalMappings - decidedMappings, 0);

  return dashboardMetricsSchema.parse({
    acceptedMappings,
    rejectedMappings,
    editedMappings,
    pendingMappings: explicitlyPending + undecidedMappings,
    exportsCreated: exportCount,
    commonComplianceWarnings: warnings
      .map((warning) => ({ message: warning.message, count: warning.total }))
      .sort((left, right) => right.count - left.count || left.message.localeCompare(right.message))
      .slice(0, 10),
  });
}

export function getReviewWorkspace(
  client: DatabaseClient,
  exampleId: string,
): ReviewWorkspace | null {
  const example = getExampleById(client, exampleId);

  if (example === null) {
    return null;
  }

  const intent = getComponentIntentByExampleId(client, exampleId);
  const mapping = getMappingByExampleId(client, exampleId);

  return {
    example,
    intent,
    mapping,
    complianceFindings:
      mapping === null ? [] : listComplianceFindingsByMappingId(client, mapping.id),
    latestDecision:
      mapping === null ? null : getLatestReviewDecisionByMappingId(client, mapping.id),
    exports: mapping === null ? [] : listExportsByMappingId(client, mapping.id),
  };
}

/**
 * Validate and coerce an edited mapping against the component's Shoelace schema. Unknown props and
 * uncoercible values are rejected so invalid edits can never be persisted or exported.
 */
function coerceEditedMapping(schema: ShoelaceComponentSchema, edit: MappingEdit): MappingEdit {
  const result: MappingEdit = { ...edit };

  if (edit.mappedProps !== undefined) {
    const coerced: Metadata = {};

    for (const [name, value] of Object.entries(edit.mappedProps)) {
      const prop = schema.props.find((candidate) => candidate.name === name);

      if (prop === undefined) {
        throw new Error(`Edited mapping has prop "${name}" not supported by ${schema.tag}.`);
      }

      coerced[name] = coercePropValueForSchema(prop, value, schema.tag);
    }

    result.mappedProps = coerced;
  }

  if (edit.mappedSlots?.['default'] !== undefined && !hasDefaultSlot(schema)) {
    throw new Error(`Edited mapping sets a default slot, but ${schema.tag} has none.`);
  }

  return result;
}

function coercePropValueForSchema(prop: ShoelaceProp, value: JsonValue, tag: string): JsonValue {
  switch (prop.kind) {
    case 'enum': {
      const coerced = typeof value === 'string' ? coerceEnumValue(prop, value) : null;

      if (coerced === null) {
        throw new Error(
          `Edited mapping has invalid value for "${prop.name}" on ${tag}: ${JSON.stringify(value)}.`,
        );
      }

      return coerced;
    }
    case 'boolean': {
      if (typeof value === 'boolean') {
        return value;
      }

      if (value === 'true') {
        return true;
      }

      if (value === 'false') {
        return false;
      }

      throw new Error(`Edited mapping prop "${prop.name}" on ${tag} must be a boolean.`);
    }
    case 'number': {
      const numeric = typeof value === 'number' ? value : Number(value);

      if (!Number.isFinite(numeric)) {
        throw new Error(`Edited mapping prop "${prop.name}" on ${tag} must be a number.`);
      }

      return numeric;
    }
    default: {
      if (typeof value !== 'string') {
        throw new Error(`Edited mapping prop "${prop.name}" on ${tag} must be a string.`);
      }

      return value;
    }
  }
}

function applyMappingEdit(mapping: ComponentMapping, edit: MappingEdit): ComponentMapping {
  const parsedEdit = mappingEditSchema.parse(edit);
  const base = {
    ...mapping,
    targetComponent: parsedEdit.targetComponent ?? mapping.targetComponent,
    mappedProps: parsedEdit.mappedProps ?? mapping.mappedProps,
    mappedEvents: parsedEdit.mappedEvents ?? mapping.mappedEvents,
    mappedSlots: parsedEdit.mappedSlots ?? mapping.mappedSlots,
    mappedTokens: parsedEdit.mappedTokens ?? mapping.mappedTokens,
    confidence: parsedEdit.confidence ?? mapping.confidence,
    rationale: parsedEdit.rationale ?? mapping.rationale,
  };

  return componentMappingSchema.parse(
    parsedEdit.fallbackNotes === undefined
      ? base
      : { ...base, fallbackNotes: parsedEdit.fallbackNotes },
  );
}

function getLatestDecisionStatuses(client: DatabaseClient): Map<ReviewDecisionStatus, number> {
  const latestByMappingId = new Map<
    string,
    { status: ReviewDecisionStatus; createdAt: string; id: string }
  >();
  const rows = client.db
    .select({
      id: reviewDecisions.id,
      mappingId: reviewDecisions.mappingId,
      status: reviewDecisions.status,
      createdAt: reviewDecisions.createdAt,
    })
    .from(reviewDecisions)
    .all();

  for (const row of rows) {
    const current = latestByMappingId.get(row.mappingId);
    const isNewer =
      current === undefined ||
      row.createdAt > current.createdAt ||
      (row.createdAt === current.createdAt && row.id > current.id);

    if (isNewer) {
      latestByMappingId.set(row.mappingId, {
        id: row.id,
        status: row.status as ReviewDecisionStatus,
        createdAt: row.createdAt,
      });
    }
  }

  const counts = new Map<ReviewDecisionStatus, number>();

  for (const decision of latestByMappingId.values()) {
    counts.set(decision.status, (counts.get(decision.status) ?? 0) + 1);
  }

  return counts;
}
