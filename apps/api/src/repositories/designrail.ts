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
  type Metadata,
  type ReviewDecision,
  type ReviewDecisionStatus,
} from '@designrail/shared';
import { desc, eq } from 'drizzle-orm';

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

export interface SaveReviewDecisionInput {
  id?: string;
  mappingId: string;
  status: ReviewDecisionStatus;
  reviewerLabel: string;
  editedMapping?: Metadata;
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

export function listExamples(client: DatabaseClient): Example[] {
  return client.db
    .select()
    .from(examples)
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
    .get();

  return row === undefined ? null : toComponentMapping(row);
}

export function listComplianceFindingsByMappingId(
  client: DatabaseClient,
  mappingId: string,
): ComplianceFinding[] {
  return client.db
    .select()
    .from(complianceFindings)
    .where(eq(complianceFindings.mappingId, mappingId))
    .all()
    .map(toComplianceFinding);
}

export function listReviewDecisions(client: DatabaseClient): ReviewDecision[] {
  return client.db.select().from(reviewDecisions).all().map(toReviewDecision);
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
    .get();

  const latestDecision = decision === undefined ? null : toReviewDecision(decision);

  if (latestDecision === null || !['ACCEPTED', 'EDITED'].includes(latestDecision.status)) {
    return {
      ok: false,
      code: 'MAPPING_NOT_EXPORTABLE',
      message: 'Only accepted or edited mappings can be exported.',
    };
  }

  const mapping = client.db
    .select()
    .from(componentMappings)
    .where(eq(componentMappings.id, input.mappingId))
    .get();

  if (mapping === undefined) {
    return {
      ok: false,
      code: 'MAPPING_NOT_EXPORTABLE',
      message: 'Cannot export a mapping that does not exist.',
    };
  }

  const parsedMapping = toComponentMapping(mapping);
  const exportResult = exportResultSchema.parse({
    id: input.id ?? createId('export'),
    mappingId: input.mappingId,
    format: input.format,
    content: buildExportContent(parsedMapping, input.format),
    createdAt: input.createdAt ?? nowIso(),
  });

  client.db.insert(exports).values(exportResult).run();

  return {
    ok: true,
    exportResult,
  };
}

export function getDashboardMetrics(client: DatabaseClient): DashboardMetrics {
  const decisions = listReviewDecisions(client);
  const exportRows = client.db.select().from(exports).all();
  const warnings = client.db
    .select()
    .from(complianceFindings)
    .all()
    .map(toComplianceFinding)
    .filter((finding) => finding.severity === 'WARNING' || finding.severity === 'BLOCKER');

  const warningCounts = new Map<string, number>();

  for (const warning of warnings) {
    warningCounts.set(warning.message, (warningCounts.get(warning.message) ?? 0) + 1);
  }

  return dashboardMetricsSchema.parse({
    acceptedMappings: decisions.filter((decision) => decision.status === 'ACCEPTED').length,
    rejectedMappings: decisions.filter((decision) => decision.status === 'REJECTED').length,
    editedMappings: decisions.filter((decision) => decision.status === 'EDITED').length,
    pendingMappings: decisions.filter((decision) => decision.status === 'PENDING').length,
    exportsCreated: exportRows.length,
    commonComplianceWarnings: Array.from(warningCounts.entries())
      .map(([message, count]) => ({ message, count }))
      .sort((left, right) => right.count - left.count || left.message.localeCompare(right.message)),
  });
}

function buildExportContent(mapping: ComponentMapping, format: ExportFormat): string {
  const defaultSlot =
    typeof mapping.mappedSlots['default'] === 'string' ? mapping.mappedSlots['default'] : 'Content';

  if (format === 'HTML') {
    return `<${mapping.targetComponent}>${defaultSlot}</${mapping.targetComponent}>`;
  }

  if (format === 'REACT') {
    return `<SlButton>${defaultSlot}</SlButton>`;
  }

  return [
    `Mapping: ${mapping.id}`,
    `Target: ${mapping.targetLibrary} ${mapping.targetComponent}`,
    `Rationale: ${mapping.rationale}`,
  ].join('\n');
}
