import { randomUUID } from 'node:crypto';

import {
  buttonComponentIntentFixture,
  buttonComponentMappingFixture,
  buttonComplianceFindingFixture,
  buttonExampleFixture,
  componentIntentSchema,
  componentMappingSchema,
  complianceFindingSchema,
  dashboardMetricsSchema,
  exampleSchema,
  exportResultSchema,
  instrumentationEventSchema,
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
  type MappingEdit,
  type Metadata,
  type ReviewDecision,
  type ReviewDecisionStatus,
} from '@designrail/shared';
import { count, desc, eq, inArray } from 'drizzle-orm';

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

function insertExample(client: DatabaseClient, example: Example): void {
  const parsed = exampleSchema.parse(example);

  client.db.insert(examples).values(parsed).onConflictDoNothing().run();
}

function insertComponentIntent(client: DatabaseClient, intent: ComponentIntent): void {
  const parsed = componentIntentSchema.parse(intent);

  client.db
    .insert(componentIntents)
    .values({
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
    })
    .onConflictDoNothing()
    .run();
}

function insertComponentMapping(client: DatabaseClient, mapping: ComponentMapping): void {
  const parsed = componentMappingSchema.parse(mapping);

  client.db
    .insert(componentMappings)
    .values({
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
    })
    .onConflictDoNothing()
    .run();
}

function insertComplianceFinding(client: DatabaseClient, finding: ComplianceFinding): void {
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
    .onConflictDoNothing()
    .run();
}

export function seedDesignRailData(client: DatabaseClient): void {
  insertExample(client, buttonExampleFixture);
  insertComponentIntent(client, buttonComponentIntentFixture);
  insertComponentMapping(client, buttonComponentMappingFixture);
  insertComplianceFinding(client, buttonComplianceFindingFixture);
}

export function listExamples(client: DatabaseClient, input: PaginationInput = {}): Example[] {
  return client.db
    .select()
    .from(examples)
    .limit(normalizeLimit(input.limit))
    .all()
    .map((row) => exampleSchema.parse(row));
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
  return client.db
    .select()
    .from(complianceFindings)
    .where(eq(complianceFindings.mappingId, mappingId))
    .limit(normalizeLimit(input.limit))
    .all()
    .map(toComplianceFinding);
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

export function saveReviewDecision(
  client: DatabaseClient,
  input: SaveReviewDecisionInput,
): ReviewDecision {
  const decision = reviewDecisionSchema.parse({
    id: input.id ?? createId('decision'),
    mappingId: input.mappingId,
    status: input.status,
    reviewerLabel: input.reviewerLabel,
    ...(input.editedMapping === undefined ? {} : { editedMapping: input.editedMapping }),
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
  const decision = client.db
    .select()
    .from(reviewDecisions)
    .where(eq(reviewDecisions.mappingId, input.mappingId))
    .orderBy(desc(reviewDecisions.createdAt))
    .limit(1)
    .get();

  const latestDecision = decision === undefined ? null : toReviewDecision(decision);

  if (latestDecision === null || !['ACCEPTED', 'EDITED'].includes(latestDecision.status)) {
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

export function getDashboardMetrics(client: DatabaseClient): DashboardMetrics {
  const latestStatuses = getLatestDecisionStatuses(client);
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

  return dashboardMetricsSchema.parse({
    acceptedMappings: latestStatuses.get('ACCEPTED') ?? 0,
    rejectedMappings: latestStatuses.get('REJECTED') ?? 0,
    editedMappings: latestStatuses.get('EDITED') ?? 0,
    pendingMappings: latestStatuses.get('PENDING') ?? 0,
    exportsCreated: exportCount,
    commonComplianceWarnings: warnings
      .map((warning) => ({ message: warning.message, count: warning.total }))
      .sort((left, right) => right.count - left.count || left.message.localeCompare(right.message))
      .slice(0, 10),
  });
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
